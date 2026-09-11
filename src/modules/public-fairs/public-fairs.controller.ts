import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsPublicRoute } from '../../auth/public.route';
import { PublicFairsService } from './public-fairs.service';
import { PublicFairDetailDto, PublicFairSummaryDto } from './dto/public-fair.dto';
import { PublicStandMapItemDto } from '../finance/stands/stands.dto';

@ApiTags('public-fairs')
@IsPublicRoute()
@Controller('public/fairs')
export class PublicFairsController {
  constructor(private readonly publicFairsService: PublicFairsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar feiras públicas',
    description:
      'Retorna todas as feiras (ativas, inativas, em breve, encerradas, canceladas) ordenadas por data de início. Não requer autenticação.',
  })
  @ApiResponse({ status: 200, type: [PublicFairSummaryDto] })
  async findAll(): Promise<PublicFairSummaryDto[]> {
    return this.publicFairsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhes públicos de uma feira',
    description:
      'Retorna informações completas para o site público: localização, horários, ' +
      'marcas participantes (view visitante) e opções de stand (view expositor). ' +
      'Não requer autenticação.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da feira',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    type: PublicFairDetailDto,
    description: 'Dados públicos da feira',
  })
  @ApiResponse({ status: 404, description: 'Feira não encontrada' })
  async findOne(@Param('id') id: string): Promise<PublicFairDetailDto> {
    return this.publicFairsService.findOne(id);
  }

  @Get(':id/stand-map')
  @ApiOperation({
    summary: 'Mapa público de stands de uma feira',
    description:
      'Retorna todos os stands numerados da feira com disponibilidade (já considerando ' +
      'reservas em andamento) e o tipo/preço associado, para desenhar a planta ' +
      'interativa. Não inclui nenhum dado de cliente/receita. Não requer autenticação.',
  })
  @ApiParam({ name: 'id', description: 'ID da feira', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: [PublicStandMapItemDto] })
  @ApiResponse({ status: 404, description: 'Feira não encontrada' })
  async getStandMap(@Param('id') id: string): Promise<PublicStandMapItemDto[]> {
    return this.publicFairsService.getStandMap(id);
  }
}
