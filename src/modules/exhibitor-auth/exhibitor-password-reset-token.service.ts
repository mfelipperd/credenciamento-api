import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { createHash } from 'crypto';
import {
  ExhibitorPasswordResetToken,
  ExhibitorPasswordResetTokenType,
} from './entities/exhibitor-password-reset-token.entity';
import { ExhibitorAccount } from '../exhibitors/entities/exhibitor-account.entity';

const MAX_ATTEMPTS = 5;

const TTL_MS: Record<ExhibitorPasswordResetTokenType, number> = {
  first_access: 30 * 24 * 60 * 60 * 1000, // 30 dias — dá tempo do expositor organizar a equipe antes da feira
  password_reset: 15 * 60 * 1000, // 15 minutos
};

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

@Injectable()
export class ExhibitorPasswordResetTokenService {
  constructor(
    @InjectRepository(ExhibitorPasswordResetToken)
    private readonly tokenRepository: Repository<ExhibitorPasswordResetToken>,
    @InjectRepository(ExhibitorAccount)
    private readonly exhibitorAccountRepository: Repository<ExhibitorAccount>,
  ) {}

  async issueCode(
    account: ExhibitorAccount,
    type: ExhibitorPasswordResetTokenType,
  ): Promise<string> {
    await this.tokenRepository.update(
      { exhibitorAccountId: account.id, type, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    const code = generateSixDigitCode();

    const token = this.tokenRepository.create({
      exhibitorAccountId: account.id,
      type,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + TTL_MS[type]),
    });
    await this.tokenRepository.save(token);

    return code;
  }

  async verifyAndConsume(
    email: string,
    type: ExhibitorPasswordResetTokenType,
    code: string,
  ): Promise<ExhibitorAccount> {
    const account = await this.exhibitorAccountRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    if (!account) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    const token = await this.tokenRepository.findOne({
      where: { exhibitorAccountId: account.id, type, usedAt: IsNull() },
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

    return account;
  }
}
