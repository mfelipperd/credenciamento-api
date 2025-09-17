import { 
  Body, 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Patch,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody,
  ApiBearerAuth
} from '@nestjs/swagger';
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
    summary: 'Listar todas as feiras',
    description: 'Retorna uma lista de todas as feiras cadastradas, ordenadas por data de criação (mais recentes primeiro)'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de feiras retornada com sucesso',
    type: [FairResponseDto]
  })
  async findAll(): Promise<FairResponseDto[]> {
    return await this.fairService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar feira por ID',
    description: 'Retorna os dados completos de uma feira específica'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único da feira',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: 200,
    description: 'Feira encontrada com sucesso',
    type: FairResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Feira não encontrada'
  })
  async findOne(@Param('id') id: string): Promise<FairResponseDto> {
    return await this.fairService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Criar nova feira',
    description: 'Cria uma nova feira com os dados fornecidos'
  })
  @ApiBody({
    type: CreateInputFairDto,
    description: 'Dados da feira a ser criada'
  })
  @ApiResponse({
    status: 201,
    description: 'Feira criada com sucesso',
    type: FairResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos fornecidos'
  })
  async create(@Body() createFairDto: CreateInputFairDto): Promise<FairResponseDto> {
    return await this.fairService.createFair(createFairDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Atualizar feira',
    description: 'Atualiza uma feira existente com os dados fornecidos'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único da feira',
    type: 'string',
    format: 'uuid'
  })
  @ApiBody({
    type: UpdateFairDto,
    description: 'Dados da feira a serem atualizados'
  })
  @ApiResponse({
    status: 200,
    description: 'Feira atualizada com sucesso',
    type: FairResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Feira não encontrada'
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos fornecidos'
  })
  async update(
    @Param('id') id: string,
    @Body() updateFairDto: UpdateFairDto
  ): Promise<FairResponseDto> {
    return await this.fairService.update(id, updateFairDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover feira',
    description: 'Remove uma feira do sistema permanentemente'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único da feira',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: 204,
    description: 'Feira removida com sucesso'
  })
  @ApiResponse({
    status: 404,
    description: 'Feira não encontrada'
  })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return await this.fairService.remove(id);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({
    summary: 'Alternar status ativo da feira',
    description: 'Alterna o status ativo/inativo de uma feira'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único da feira',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: 200,
    description: 'Status da feira alterado com sucesso',
    type: FairResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Feira não encontrada'
  })
  async toggleActive(@Param('id') id: string): Promise<FairResponseDto> {
    return await this.fairService.toggleActive(id);
  }

}
