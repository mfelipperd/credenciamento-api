import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EUserRole } from 'src/enum/role';

interface McpAccessTokenPayload {
  sub: number;
  email: string;
  name: string;
  role: EUserRole;
  fairIds: string[];
  aud: string;
  iss: string;
}

export interface McpRequestUser {
  id: number;
  email: string;
  name: string;
  role: EUserRole;
  fairIds: string[];
}

@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{
        headers: { authorization?: string };
        user?: McpRequestUser;
      }>();

    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Missing authentication token');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid token format');
    }

    const secret = this.config.get<string>('MCP_JWT_SECRET');
    try {
      const decoded = this.jwtService.verify<McpAccessTokenPayload>(token, {
        secret,
      });
      if (decoded.aud !== 'mcp') {
        throw new UnauthorizedException('Invalid token audience');
      }

      request.user = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        fairIds: decoded.fairIds,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
