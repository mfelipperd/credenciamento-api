import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { createHash } from 'crypto';
import {
  PasswordResetToken,
  PasswordResetTokenType,
} from './entities/password-reset-token.entity';
import { User } from './entitie/users.entity';

const MAX_ATTEMPTS = 5;

const TTL_MS: Record<PasswordResetTokenType, number> = {
  first_access: 7 * 24 * 60 * 60 * 1000, // 7 dias
  password_reset: 15 * 60 * 1000, // 15 minutos
};

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

@Injectable()
export class PasswordResetTokenService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async issueCode(user: User, type: PasswordResetTokenType): Promise<string> {
    // Invalida códigos anteriores não usados do mesmo tipo pra esse usuário
    await this.tokenRepository.update(
      { userId: user.id, type, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    const code = generateSixDigitCode();

    const token = this.tokenRepository.create({
      userId: user.id,
      type,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + TTL_MS[type]),
    });
    await this.tokenRepository.save(token);

    return code;
  }

  async verifyAndConsume(
    email: string,
    type: PasswordResetTokenType,
    code: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    const token = await this.tokenRepository.findOne({
      where: { userId: user.id, type, usedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!token || token.expiresAt < new Date()) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    if (token.codeHash !== hashCode(code)) {
      token.attempts += 1;
      if (token.attempts >= MAX_ATTEMPTS) {
        token.usedAt = new Date();
      }
      await this.tokenRepository.save(token);

      if (token.attempts >= MAX_ATTEMPTS) {
        throw new BadRequestException(
          'Muitas tentativas com código incorreto. Solicite um novo código.',
        );
      }
      throw new BadRequestException('Código inválido ou expirado');
    }

    token.usedAt = new Date();
    await this.tokenRepository.save(token);

    return user;
  }
}
