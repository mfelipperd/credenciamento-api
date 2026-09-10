import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class BotApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-bot-api-key'];
    const expectedKey = this.config.get<string>('BOT_API_KEY');

    if (!expectedKey) {
      throw new UnauthorizedException('BOT_API_KEY não configurada no servidor');
    }
    if (providedKey !== expectedKey) {
      throw new UnauthorizedException('Chave de API do bot inválida');
    }
    return true;
  }
}
