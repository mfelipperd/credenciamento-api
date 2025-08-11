import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Param,
  Body,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { StandsService } from './stands.service';
import { ConfigureFairStandsDto, StandResponseDto } from './stands.dto';

@ApiTags('Stands')
@Controller('finance/stands')
export class StandsController {
  constructor(private readonly standsService: StandsService) {}

  @Post('configure')
  @ApiOperation({
    summary: 'Configurar quantidade de stands de uma feira',
    description:
      'Configura o total de stands para uma feira. Pode aumentar ou diminuir a quantidade. Ao diminuir, remove apenas stands disponíveis (não vendidos). Stands vendidos não podem ser removidos.',
  })
  @ApiBody({ type: ConfigureFairStandsDto })
  @ApiResponse({
    status: 201,
    description: 'Stands configurados com sucesso',
  })
  @ApiResponse({
    status: 400,
    description:
      'Erro de validação, regra de negócio ou tentativa de remover stands vendidos',
  })
  async configureFairStands(
    @Body() configureFairStandsDto: ConfigureFairStandsDto,
  ) {
    return await this.standsService.configureFairStands(configureFairStandsDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os stands de uma feira' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de stands da feira',
    type: [StandResponseDto],
  })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async getFairStands(@Query('fairId') fairId: string) {
    return await this.standsService.getFairStands(fairId);
  }

  @Get('available')
  @ApiOperation({ summary: 'Listar stands disponíveis de uma feira' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de stands disponíveis',
    type: [StandResponseDto],
  })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async getAvailableStands(@Query('fairId') fairId: string) {
    return await this.standsService.getAvailableStands(fairId);
  }

  @Get('occupied')
  @ApiOperation({ summary: 'Listar stands ocupados de uma feira' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de stands ocupados',
    type: [StandResponseDto],
  })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async getOccupiedStands(@Query('fairId') fairId: string) {
    return await this.standsService.getOccupiedStands(fairId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas dos stands de uma feira' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas dos stands',
  })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async getStandStats(@Query('fairId') fairId: string) {
    return await this.standsService.getStandStats(fairId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar stand por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID do stand',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do stand',
    type: StandResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Stand não encontrado' })
  async getStandById(@Param('id', ParseIntPipe) id: number) {
    return await this.standsService.getStandById(id);
  }

  @Patch(':id/link-revenue')
  @ApiOperation({ summary: 'Vincular stand a uma receita' })
  @ApiParam({
    name: 'id',
    description: 'ID do stand',
    type: Number,
  })
  @ApiQuery({
    name: 'revenueId',
    required: true,
    description: 'ID da receita',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Stand vinculado com sucesso',
    type: StandResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Stand já ocupado ou receita já vinculada',
  })
  @ApiResponse({ status: 404, description: 'Stand ou receita não encontrado' })
  async linkStandToRevenue(
    @Param('id', ParseIntPipe) id: number,
    @Query('revenueId') revenueId: string,
  ) {
    if (!revenueId) {
      throw new BadRequestException('revenueId é obrigatório');
    }
    return await this.standsService.linkStandToRevenue(id, revenueId);
  }

  @Patch(':id/unlink-revenue')
  @ApiOperation({ summary: 'Desvincular stand de uma receita' })
  @ApiParam({
    name: 'id',
    description: 'ID do stand',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Stand desvinculado com sucesso',
    type: StandResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Stand já está disponível' })
  @ApiResponse({ status: 404, description: 'Stand não encontrado' })
  async unlinkStandFromRevenue(@Param('id', ParseIntPipe) id: number) {
    return await this.standsService.unlinkStandFromRevenue(id);
  }
}
