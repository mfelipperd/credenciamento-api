import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ExhibitorAccount } from '../exhibitors/entities/exhibitor-account.entity';
import { ExhibitorsService } from '../exhibitors/exhibitors.service';
import { EmailsService } from '../emails/emails.service';
import { ExhibitorPasswordResetTokenService } from './exhibitor-password-reset-token.service';
import { ExhibitorFirstAccessDto, ExhibitorLoginDto } from './exhibitor-auth.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class ExhibitorAuthService {
  constructor(
    @InjectRepository(ExhibitorAccount)
    private readonly exhibitorAccounts: Repository<ExhibitorAccount>,
    private readonly exhibitorsService: ExhibitorsService,
    private readonly jwtService: JwtService,
    private readonly passwordResetTokenService: ExhibitorPasswordResetTokenService,
    private readonly emailsService: EmailsService,
  ) {}

  /**
   * Chamado internamente quando um pagamento de reserva de stand é aprovado
   * (nunca exposto como rota pública) — cria (ou reaproveita) a empresa e a
   * conta de acesso do expositor, e dispara o email de primeiro acesso.
   * Idempotente: se a conta já existe, só reenvia o código.
   */
  async provisionAfterPayment(params: {
    companyName: string;
    cnpj?: string;
    email: string;
  }) {
    const email = params.email.toLowerCase().trim();

    const exhibitor = await this.exhibitorsService.createExhibitor({
      name: params.companyName,
      cnpj: params.cnpj,
    });

    let account = await this.exhibitorAccounts.findOne({ where: { email } });
    if (!account) {
      account = await this.exhibitorAccounts.save(
        this.exhibitorAccounts.create({
          exhibitorId: exhibitor.id,
          email,
          passwordHash: null,
          passwordSet: false,
        }),
      );
    }

    const code = await this.passwordResetTokenService.issueCode(
      account,
      'first_access',
    );
    await this.emailsService.sendFirstAccessEmail(
      account.email,
      exhibitor.name,
      code,
    );

    return account;
  }

  async firstAccess(dto: ExhibitorFirstAccessDto) {
    const account = await this.passwordResetTokenService.verifyAndConsume(
      dto.email,
      'first_access',
      dto.code,
    );

    account.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    account.passwordSet = true;
    await this.exhibitorAccounts.save(account);

    const exhibitor = await this.exhibitorsService.assertExhibitor(
      account.exhibitorId,
    );

    return this.buildAuthResponse(account, exhibitor.id, exhibitor.name);
  }

  async login(dto: ExhibitorLoginDto) {
    const account = await this.exhibitorAccounts.findOne({
      where: { email: dto.email.toLowerCase().trim() },
      relations: { exhibitor: true },
    });
    if (!account || !account.passwordSet || !account.passwordHash) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isValidPassword = await bcrypt.compare(
      dto.password,
      account.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.buildAuthResponse(
      account,
      account.exhibitorId,
      account.exhibitor.name,
    );
  }

  private buildAuthResponse(
    account: ExhibitorAccount,
    exhibitorId: string,
    exhibitorName: string,
  ) {
    const payload = {
      type: 'exhibitor' as const,
      sub: account.id,
      email: account.email,
      exhibitorId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      exhibitorAccount: {
        id: account.id,
        email: account.email,
        exhibitorId,
        exhibitorName,
      },
    };
  }
}
