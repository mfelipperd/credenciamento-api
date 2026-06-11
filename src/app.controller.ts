import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { IsPublicRoute } from './auth/public.route';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @IsPublicRoute()
  @ApiOperation({ summary: 'Health check', description: 'Verifica se a API está online.' })
  @ApiResponse({ status: 200, description: 'API online', schema: { example: 'Hello World!' } })
  getHello(): string {
    return this.appService.getHello();
  }
}
