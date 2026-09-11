import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { IsPublicRoute } from '../../auth/public.route';
import { ExhibitorAuthService } from './exhibitor-auth.service';
import { ExhibitorFirstAccessDto, ExhibitorLoginDto } from './exhibitor-auth.dto';

const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('exhibitor-auth')
@Controller('public/exhibitor-auth')
export class ExhibitorAuthController {
  constructor(private readonly exhibitorAuthService: ExhibitorAuthService) {}

  @Post('first-access')
  @IsPublicRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({
    summary: 'Primeiro acesso do expositor',
    description:
      'Confirma o código de 6 dígitos enviado por email após o pagamento da reserva de stand e define a senha de acesso.',
  })
  @ApiBody({ type: ExhibitorFirstAccessDto })
  @ApiResponse({ status: 201, description: 'Senha definida e login realizado' })
  @ApiResponse({ status: 400, description: 'Código inválido ou expirado' })
  async firstAccess(@Body() dto: ExhibitorFirstAccessDto) {
    return this.exhibitorAuthService.firstAccess(dto);
  }

  @Post('login')
  @IsPublicRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({
    summary: 'Login de expositor',
    description: 'Autentica o expositor e retorna o token JWT.',
  })
  @ApiBody({ type: ExhibitorLoginDto })
  @ApiResponse({ status: 201, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() dto: ExhibitorLoginDto) {
    return this.exhibitorAuthService.login(dto);
  }
}
