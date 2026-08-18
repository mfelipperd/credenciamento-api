import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { IsPublicRoute } from 'src/auth/public.route';

function mcpBaseUrl(): string {
  return (process.env.MCP_BASE_URL ?? '').replace(/\/$/, '');
}

@ApiExcludeController()
@Controller('.well-known')
export class WellKnownController {
  @IsPublicRoute()
  @Get('oauth-authorization-server')
  getAuthorizationServerMetadata() {
    const base = mcpBaseUrl();
    return {
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/oauth/token`,
      registration_endpoint: `${base}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
    };
  }

  @IsPublicRoute()
  @Get('oauth-protected-resource')
  getProtectedResourceMetadata() {
    const base = mcpBaseUrl();
    return {
      resource: `${base}/mcp`,
      authorization_servers: [base],
    };
  }
}
