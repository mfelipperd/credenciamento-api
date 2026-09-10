import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  FirstAccessDto,
} from './auth.dto';
import { IsPublicRoute } from './public.route';

const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @IsPublicRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({
    summary: 'Login',
    description: 'Autentica o usuário e retorna o token JWT.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: 'Login realizado com sucesso',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          name: 'João Silva',
          email: 'joao@email.com',
          role: 'admin',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }

  @Post('forgot-password')
  @IsPublicRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({
    summary: 'Solicitar recuperação de senha',
    description:
      'Envia um código de 6 dígitos por email pra redefinir a senha.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 201,
    description: 'Solicitação processada (resposta genérica)',
  })
  async forgotPassword(@Body() data: ForgotPasswordDto) {
    return this.authService.forgotPassword(data);
  }

  @Post('reset-password')
  @IsPublicRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({
    summary: 'Redefinir senha',
    description: 'Confirma o código de recuperação e define a nova senha.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 201, description: 'Senha redefinida com sucesso' })
  @ApiResponse({ status: 400, description: 'Código inválido ou expirado' })
  async resetPassword(@Body() data: ResetPasswordDto) {
    return this.authService.resetPassword(data);
  }

  @Post('first-access')
  @IsPublicRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({
    summary: 'Primeiro acesso',
    description:
      'Confirma o código de primeiro acesso e define a senha inicial.',
  })
  @ApiBody({ type: FirstAccessDto })
  @ApiResponse({ status: 201, description: 'Senha definida com sucesso' })
  @ApiResponse({ status: 400, description: 'Código inválido ou expirado' })
  async firstAccess(@Body() data: FirstAccessDto) {
    return this.authService.firstAccess(data);
  }
}
