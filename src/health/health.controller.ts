import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { IsPublicRoute } from '../auth/public.route';
import { HealthService } from './health.service';
import { HealthCheckResponse } from './health.types';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @IsPublicRoute()
  @ApiOperation({
    summary: 'Health check detalhado',
    description: 'Verifica conectividade com o banco de dados e o Redis.',
  })
  @ApiResponse({ status: 200, description: 'Todos os componentes saudáveis' })
  @ApiResponse({ status: 503, description: 'Um ou mais componentes com falha' })
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthCheckResponse> {
    const result = await this.healthService.check();
    res.status(result.status === 'ok' ? 200 : 503);
    return result;
  }
}
