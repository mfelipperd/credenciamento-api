import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Patch,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FairStatus } from './entity/fair.entity';
import { FairsService } from './fairs.service';
import { CreateInputFairDto } from './fair.dto';
import { UpdateFairDto } from './dto/update-fair.dto';
import { FairResponseDto } from './dto/fair-response.dto';

@ApiTags('fairs')
@ApiBearerAuth('JWT-auth')
@Controller('fairs')
export class FairsController {
  constructor(private readonly fairService: FairsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar feiras',
    description:
      'Retorna feiras com filtros opcionais por UF, status, nome e isActive, ordenadas por data de início.',
  })
  @ApiQuery({
    name: 'uf',
    required: false,
    description: 'Filtrar por UF (2 letras). Ex: AM, PA, SP',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: FairStatus,
    description: 'Filtrar por status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filtrar pelo nome da feira (case-insensitive)',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrar por feiras ativas (true) ou inativas (false)',
  })
  @ApiResponse({ status: 200, type: [FairResponseDto] })
  async findAll(
    @Query('uf') uf?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ): Promise<FairResponseDto[]> {
    const isActiveParsed =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.fairService.findAll(uf, status, search, isActiveParsed);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Estatísticas de feiras',
    description:
      'Retorna totais e médias agregadas de todas as feiras para exibição nos cards do dashboard.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas calculadas com sucesso',
    schema: {
      type: 'object',
      properties: {
        totalFairs: { type: 'number' },
        activeFairs: { type: 'number' },
        inactiveFairs: { type: 'number' },
        totalExpectedRevenue: { type: 'number' },
        totalExpectedProfit: { type: 'number' },
        averageProfitMargin: { type: 'number' },
      },
    },
  })
  async getStats() {
    return this.fairService.getFairStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar feira por ID',
    description: 'Retorna os dados completos de uma feira específica',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único da feira',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Feira encontrada com sucesso',
    type: FairResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Feira não encontrada',
  })
  async findOne(@Param('id') id: string): Promise<FairResponseDto> {
    return await this.fairService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Criar nova feira',
    description: 'Cria uma nova feira com os dados fornecidos',
  })
  @ApiBody({
    type: CreateInputFairDto,
    description: 'Dados da feira a ser criada',
  })
  @ApiResponse({
    status: 201,
    description: 'Feira criada com sucesso',
    type: FairResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos fornecidos',
  })
  async create(
    @Body() createFairDto: CreateInputFairDto,
  ): Promise<FairResponseDto> {
    return await this.fairService.createFair(createFairDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Atualizar feira',
    description: 'Atualiza uma feira existente com os dados fornecidos',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único da feira',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    type: UpdateFairDto,
    description: 'Dados da feira a serem atualizados',
  })
  @ApiResponse({
    status: 200,
    description: 'Feira atualizada com sucesso',
    type: FairResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Feira não encontrada',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos fornecidos',
  })
  async update(
    @Param('id') id: string,
    @Body() updateFairDto: UpdateFairDto,
  ): Promise<FairResponseDto> {
    return await this.fairService.update(id, updateFairDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover feira',
    description: 'Remove uma feira do sistema permanentemente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único da feira',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Feira removida com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Feira não encontrada',
  })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return await this.fairService.remove(id);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({
    summary: 'Alternar status ativo da feira',
    description: 'Alterna o status ativo/inativo de uma feira',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único da feira',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Status da feira alterado com sucesso',
    type: FairResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Feira não encontrada',
  })
  async toggleActive(@Param('id') id: string): Promise<FairResponseDto> {
    return await this.fairService.toggleActive(id);
  }
}
