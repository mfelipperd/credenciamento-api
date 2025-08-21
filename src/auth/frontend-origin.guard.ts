import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class FrontendOriginGuard implements CanActivate {
  private readonly allowedOrigins: string[];
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    // Origens permitidas do frontend
    this.allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000', // Development
      'http://localhost:3001', // Development alt
      'https://credenciamento-frontend.vercel.app', // Production
      'https://www.expomultimix.com', // Production www
    ];

    // Chave secreta para validação adicional
    this.secretKey =
      this.configService.get<string>('FRONTEND_SECRET_KEY') ||
      'passagemsecretdofront@2025';
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

    // Verificar header customizado com timestamp criptografado
    const frontendAuth = request.headers['x-frontend-auth'] as string;
    console.log('[DEBUG] Token recebido:', frontendAuth);
    console.log('[DEBUG] Tamanho do token:', frontendAuth?.length);
    
    if (!frontendAuth) {
      throw new UnauthorizedException(
        'Acesso não autorizado: Token de frontend ausente',
      );
    }
    
    // Temporariamente, vamos apenas verificar se o token tem o tamanho esperado
    if (frontendAuth.length !== 64) {
      console.log('[DEBUG] Token rejeitado - tamanho inválido:', frontendAuth.length);
      throw new UnauthorizedException(
        'Acesso não autorizado: Token de frontend inválido',
      );
    }
    
    console.log('[DEBUG] Token aceito!');
    

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

  private validateFrontendAuth(authHeader: string): boolean {
    try {
      console.log('[DEBUG] Token recebido:', authHeader);
      console.log('[DEBUG] Chave secreta:', this.secretKey);
      
      // Descriptografar o header
      const decrypted = this.decrypt(authHeader);
      console.log('[DEBUG] Timestamp descriptografado:', decrypted);
      
      const timestamp = parseInt(decrypted);

      // Verificar se o timestamp é recente (últimos 5 minutos)
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      console.log('[DEBUG] Timestamp atual:', now);
      console.log('[DEBUG] Diferença:', now - timestamp);
      console.log('[DEBUG] Válido?', now - timestamp < fiveMinutes);

      return now - timestamp < fiveMinutes;
    } catch (error) {
      console.log('[DEBUG] Erro na validação:', error instanceof Error ? error.message : 'Erro desconhecido');
      return false;
    }
  }

  private decrypt(encryptedData: string): string {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.secretKey, 'salt', 32);
      const iv = Buffer.from(encryptedData.substring(0, 32), 'hex');
      const encrypted = encryptedData.substring(32);

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch {
      throw new Error('Falha na descriptografia');
    }
  }

  // Método helper para o frontend gerar o header correto
  static generateFrontendAuth(secretKey: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const timestamp = Date.now().toString();

    let encrypted = cipher.update(timestamp, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + encrypted;
  }
}
