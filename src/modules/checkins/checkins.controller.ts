import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CheckInsService } from './checkins.service';

@ApiTags('Check-ins')
@ApiBearerAuth('JWT-auth')
@Controller('checkins')
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar check-in', description: 'Registra a entrada de um visitante na feira via código de registro.' })
  @ApiBody({
    schema: {
      required: ['registrationCode', 'fairId'],
      properties: {
        registrationCode: { type: 'string', example: 'abc-123-def' },
        fairId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Check-in registrado com sucesso',
    schema: { example: { id: 'uuid', registrationCode: 'abc-123', fairId: 'uuid', checkedInAt: '2026-06-11T10:30:00Z' } },
  })
  @ApiResponse({ status: 400, description: 'registrationCode ou fairId ausente / visitante não encontrado na feira' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async registerCheckIn(@Body() body: { registrationCode?: string; fairId: string }) {
    if (!body.registrationCode) throw new BadRequestException('RegistrationCode is required');
    if (!body.fairId) throw new BadRequestException('Fair ID is required');
    return await this.checkInsService.registerCheckIn(body.registrationCode, body.fairId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar check-ins da feira', description: 'Retorna todos os check-ins registrados para a feira.' })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Lista de check-ins' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getCheckIns(@Query('fairId') fairId: string) {
    return await this.checkInsService.getCheckIns(fairId);
  }

  @Get('today')
  @ApiOperation({
    summary: 'Check-ins por hora (hoje)',
    description: 'Retorna a distribuição de check-ins agrupada por hora do dia para uso em gráficos.',
  })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Check-ins agrupados por hora',
    schema: { example: [{ hour: 9, count: 12 }, { hour: 10, count: 34 }] },
  })
  @ApiResponse({ status: 400, description: 'fairId ausente' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getCheckInsToday(@Query('fairId') fairId: string) {
    if (!fairId) throw new BadRequestException('Fair ID is required');
    return await this.checkInsService.getCheckinsPerHour(fairId);
  }
}
