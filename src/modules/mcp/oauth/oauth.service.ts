import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { OAuthClient } from './entities/oauth-client.entity';
import { OAuthAuthorizationCode } from './entities/oauth-authorization-code.entity';
import { OAuthRefreshToken } from './entities/oauth-refresh-token.entity';
import { UsersService } from 'src/modules/users/users.service';
import { UserResponseDto } from 'src/modules/users/dto/user-response.dto';
import { FairsService } from 'src/modules/fairs/fairs.service';
import { PartnersService } from 'src/modules/partners/partners.service';
import { FairPartnersService } from 'src/modules/partners/fair-partners.service';
import { EUserRole } from 'src/enum/role';
import { RegisterClientDto } from './dto/register-client.dto';
import { AuthorizeFormDto } from './dto/authorize-form.dto';
import { TokenRequestDto } from './dto/token-request.dto';

const AUTH_CODE_TTL_SECONDS = 60;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_DAYS = 30;

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(OAuthClient)
    private readonly clientRepository: Repository<OAuthClient>,
    @InjectRepository(OAuthAuthorizationCode)
    private readonly codeRepository: Repository<OAuthAuthorizationCode>,
    @InjectRepository(OAuthRefreshToken)
    private readonly refreshTokenRepository: Repository<OAuthRefreshToken>,
    private readonly usersService: UsersService,
    private readonly fairsService: FairsService,
    private readonly partnersService: PartnersService,
    private readonly fairPartnersService: FairPartnersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Feiras que o usuário pode ver via MCP: admin vê todas, sócio vê só as
   * que tem no fair_partners, demais perfis usam a associação manual
   * (user_fair) já existente.
   */
  private async computeFairIds(user: UserResponseDto): Promise<string[]> {
    if (user.role === EUserRole.ADMIN) {
      const fairs = await this.fairsService.findAll();
      return fairs.map((f) => f.id);
    }

    if (user.role === EUserRole.PARTNER) {
      const partner = await this.partnersService.findByUserId(user.id);
      if (!partner) return [];
      const fairPartners = await this.fairPartnersService.findAllByPartner(
        partner.id,
      );
      return fairPartners.map((fp) => fp.fairId);
    }

    return user.fairIds ?? [];
  }

  private get mcpJwtSecret(): string {
    const secret = this.config.get<string>('MCP_JWT_SECRET');
    if (!secret) {
      throw new Error('MCP_JWT_SECRET não configurado');
    }
    return secret;
  }

  private get baseUrl(): string {
    return (this.config.get<string>('MCP_BASE_URL') ?? '').replace(/\/$/, '');
  }

  async registerClient(dto: RegisterClientDto) {
    const clientId = randomBytes(16).toString('base64url');
    const client = this.clientRepository.create({
      clientId,
      clientName: dto.client_name ?? 'MCP Client',
      redirectUris: dto.redirect_uris,
    });
    await this.clientRepository.save(client);

    return {
      client_id: clientId,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    };
  }

  private async getValidClient(
    clientId: string,
    redirectUri: string,
  ): Promise<OAuthClient> {
    const client = await this.clientRepository.findOne({ where: { clientId } });
    if (!client) {
      throw new BadRequestException('client_id inválido');
    }
    if (!client.redirectUris.includes(redirectUri)) {
      throw new BadRequestException('redirect_uri não registrado para este client');
    }
    return client;
  }

  async authorize(dto: AuthorizeFormDto): Promise<string> {
    await this.getValidClient(dto.client_id, dto.redirect_uri);

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const isBcryptHash = user.password.startsWith('$2');
    let isValidPassword = false;

    if (isBcryptHash) {
      isValidPassword = await bcrypt.compare(dto.password, user.password);
    } else if (dto.password === user.password) {
      // Conta ainda não migrada pro hash — migra silenciosamente nesse login
      isValidPassword = true;
      await this.usersService.setPassword(user.id, dto.password);
    }

    if (!isValidPassword) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    if (user.role !== EUserRole.ADMIN) {
      throw new ForbiddenException(
        'Conector disponível apenas para administradores',
      );
    }

    const code = randomBytes(32).toString('base64url');
    const authCode = this.codeRepository.create({
      code,
      clientId: dto.client_id,
      userId: user.id,
      redirectUri: dto.redirect_uri,
      codeChallenge: dto.code_challenge,
      codeChallengeMethod: dto.code_challenge_method,
      resource: dto.resource,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000),
      used: false,
    });
    await this.codeRepository.save(authCode);

    const redirectUrl = new URL(dto.redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (dto.state) redirectUrl.searchParams.set('state', dto.state);
    return redirectUrl.toString();
  }

  async exchangeToken(dto: TokenRequestDto) {
    if (dto.grant_type === 'authorization_code') {
      return this.exchangeAuthorizationCode(dto);
    }
    if (dto.grant_type === 'refresh_token') {
      return this.exchangeRefreshToken(dto);
    }
    throw new BadRequestException('grant_type não suportado');
  }

  private async exchangeAuthorizationCode(dto: TokenRequestDto) {
    if (!dto.code || !dto.code_verifier || !dto.redirect_uri) {
      throw new BadRequestException(
        'code, code_verifier e redirect_uri são obrigatórios',
      );
    }

    const authCode = await this.codeRepository.findOne({
      where: { code: dto.code },
    });
    if (!authCode || authCode.used || authCode.expiresAt < new Date()) {
      throw new BadRequestException('Código de autorização inválido ou expirado');
    }
    if (authCode.redirectUri !== dto.redirect_uri) {
      throw new BadRequestException('redirect_uri não confere');
    }

    const expectedChallenge = createHash('sha256')
      .update(dto.code_verifier)
      .digest('base64url');
    if (expectedChallenge !== authCode.codeChallenge) {
      throw new BadRequestException('code_verifier inválido (falha PKCE)');
    }

    authCode.used = true;
    await this.codeRepository.save(authCode);

    return this.issueTokens(authCode.userId, authCode.clientId);
  }

  private async exchangeRefreshToken(dto: TokenRequestDto) {
    if (!dto.refresh_token) {
      throw new BadRequestException('refresh_token é obrigatório');
    }

    const tokenHash = createHash('sha256')
      .update(dto.refresh_token)
      .digest('hex');
    const stored = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('refresh_token inválido ou expirado');
    }

    stored.revokedAt = new Date();
    await this.refreshTokenRepository.save(stored);

    return this.issueTokens(stored.userId, stored.clientId);
  }

  private async issueTokens(userId: number, clientId: string) {
    const userResponse = await this.usersService.findOne(userId);
    const fairIds = await this.computeFairIds(userResponse);

    const accessToken = this.jwtService.sign(
      {
        sub: userResponse.id,
        email: userResponse.email,
        name: userResponse.name,
        role: userResponse.role,
        fairIds,
        aud: 'mcp',
        iss: this.baseUrl,
      },
      { secret: this.mcpJwtSecret, expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );

    const refreshToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const refreshTokenEntity = this.refreshTokenRepository.create({
      tokenHash,
      clientId,
      userId,
      expiresAt: new Date(
        Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
      ),
      revokedAt: null,
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: refreshToken,
    };
  }
}
