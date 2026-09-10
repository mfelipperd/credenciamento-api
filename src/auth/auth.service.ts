import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/modules/users/users.service';
import { PasswordResetTokenService } from 'src/modules/users/password-reset-token.service';
import { EmailsService } from 'src/modules/emails/emails.service';
import {
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  FirstAccessDto,
} from './auth.dto';

const GENERIC_FORGOT_PASSWORD_MESSAGE =
  'Se esse email existir na nossa base, você vai receber um código de recuperação.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly passwordResetTokenService: PasswordResetTokenService,
    private readonly emailsService: EmailsService,
  ) {}

  async login(data: LoginDto) {
    const { email, password } = data;
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isBcryptHash = user.password.startsWith('$2');
    let isValidPassword = false;

    if (isBcryptHash) {
      isValidPassword = await bcrypt.compare(password, user.password);
    } else if (password === user.password) {
      // Conta ainda não migrada pro hash — migra silenciosamente nesse login
      isValidPassword = true;
      await this.usersService.setPassword(user.id, password);
    }

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Buscar feiras associadas ao usuário
    const userResponse = await this.usersService.findOne(user.id);
    const fairIds = userResponse.fairIds || [];

    const payload = {
      email: user.email,
      name: user.name,
      id: user.id,
      role: user.role,
      fairIds: fairIds,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        fairIds: fairIds,
      },
    };
  }

  async forgotPassword(data: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(data.email);

    if (user) {
      try {
        const code = await this.passwordResetTokenService.issueCode(
          user,
          'password_reset',
        );
        await this.emailsService.sendPasswordResetEmail(
          user.email,
          user.name,
          code,
        );
      } catch (error) {
        this.logger.warn(
          `Erro ao enviar email de recuperação de senha pra ${user.email}: ${error.message}`,
        );
      }
    }

    // Resposta genérica sempre — não revela se o email existe, nem se o envio falhou
    return { message: GENERIC_FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(data: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.passwordResetTokenService.verifyAndConsume(
      data.email,
      'password_reset',
      data.code,
    );
    await this.usersService.setPassword(user.id, data.newPassword);
    return { message: 'Senha redefinida com sucesso' };
  }

  async firstAccess(data: FirstAccessDto): Promise<{ message: string }> {
    const user = await this.passwordResetTokenService.verifyAndConsume(
      data.email,
      'first_access',
      data.code,
    );
    await this.usersService.setPassword(user.id, data.password);
    return { message: 'Senha definida com sucesso' };
  }
}
