import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Roda depois do JwtAuthGuard global (que já validou a assinatura e populou
 * request.user). Aqui só garante que o token é de um expositor, não de um
 * usuário interno — os dois são assinados com o mesmo JWT_SECRET.
 */
@Injectable()
export class ExhibitorAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { type?: string; sub?: string; exhibitorId?: string } }>();

    if (request.user?.type !== 'exhibitor') {
      throw new ForbiddenException('Acesso restrito a contas de expositor');
    }

    return true;
  }
}
