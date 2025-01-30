import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './auth.dto';
import { IsPublicRoute } from './public.route';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('login')
  @IsPublicRoute()
  async login(@Body() data: LoginDto) {
    const result = await this.authService.login(data);
    return result;
  }
}
