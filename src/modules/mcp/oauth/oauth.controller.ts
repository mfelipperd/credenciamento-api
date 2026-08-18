import { Body, Controller, Get, HttpException, Post, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { IsPublicRoute } from 'src/auth/public.route';
import { OAuthService } from './oauth.service';
import { RegisterClientDto } from './dto/register-client.dto';
import { AuthorizeQueryDto } from './dto/authorize-query.dto';
import { AuthorizeFormDto } from './dto/authorize-form.dto';
import { TokenRequestDto } from './dto/token-request.dto';
import { renderLoginPage } from './login-page.html';

@ApiExcludeController()
@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @IsPublicRoute()
  @Post('register')
  register(@Body() dto: RegisterClientDto) {
    return this.oauthService.registerClient(dto);
  }

  @IsPublicRoute()
  @Get('authorize')
  showLoginForm(@Query() query: AuthorizeQueryDto, @Res() res: Response) {
    res.type('html').send(renderLoginPage(query));
  }

  @IsPublicRoute()
  @Post('authorize')
  async submitLogin(@Body() body: AuthorizeFormDto, @Res() res: Response) {
    try {
      const redirectUrl = await this.oauthService.authorize(body);
      res.redirect(302, redirectUrl);
    } catch (err) {
      const message =
        err instanceof HttpException
          ? (err.getResponse() as { message?: string })?.message ?? err.message
          : 'Erro ao autorizar';
      res
        .status(200)
        .type('html')
        .send(renderLoginPage({ ...body, error: String(message) }));
    }
  }

  @IsPublicRoute()
  @Post('token')
  exchangeToken(@Body() dto: TokenRequestDto) {
    return this.oauthService.exchangeToken(dto);
  }
}
