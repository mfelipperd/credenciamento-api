import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class FrontendOriginGuard implements CanActivate {
  private readonly allowedOrigins: string[];

  constructor() {
    // Origens permitidas do frontend
    this.allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000', // Development
      'http://localhost:3001', // Development alt
      'https://credenciamento-frontend.vercel.app', // Production
      'https://www.expomultimix.com', // Production www
      'https://expo-mm-site.vercel.app', // Production new
      'https://credenciamento.expomultimix.com.br', // Production - módulo credenciamento
      'https://gestao.expomultimix.com.br', // Production - gestão completa
    ];
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Verificar User-Agent (deve ser um navegador, não Postman/Thunder Client)
    const userAgent = request.headers['user-agent'] || '';
    if (this.isApiClient(userAgent)) {
      throw new UnauthorizedException(
        'Acesso não autorizado: Cliente de API detectado',
      );
    }

    // Verificar Origin header
    const origin = request.headers.origin || request.headers.referer;
    if (!origin || !this.isAllowedOrigin(origin)) {
      throw new UnauthorizedException(
        'Acesso não autorizado: Origem não permitida',
      );
    }

    return true;
  }

  private isApiClient(userAgent: string): boolean {
    const apiClients = [
      'postman',
      'insomnia',
      'thunderclient',
      'curl',
      'wget',
      'httpie',
      'rest-client',
    ];

    const lowerUserAgent = userAgent.toLowerCase();
    return apiClients.some((client) => lowerUserAgent.includes(client));
  }

  private isAllowedOrigin(origin: string): boolean {
    // Remover barra final para comparação consistente
    const cleanOrigin = origin.replace(/\/$/, '');
    return this.allowedOrigins.some((allowed) =>
      cleanOrigin.startsWith(allowed.replace(/\/$/, '')),
    );
  }
}
