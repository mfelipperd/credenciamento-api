import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { EntryModelsService } from './entry-models.service';
import {
  CreateEntryModelDto,
  UpdateEntryModelDto,
  EntryModelResponseDto,
} from './entry-models.dto';

@ApiTags('Modelos de Lançamento')
@Controller('finance/entry-models')
export class EntryModelsController {
  constructor(private readonly entryModelsService: EntryModelsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um novo modelo de lançamento' })
  @ApiResponse({
    status: 201,
    description: 'Modelo criado com sucesso',
    type: EntryModelResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(
    @Body() createEntryModelDto: CreateEntryModelDto,
  ): Promise<EntryModelResponseDto> {
    return await this.entryModelsService.create(createEntryModelDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os modelos de lançamento' })
  @ApiQuery({ name: 'type', required: false, description: 'Filtrar por tipo' })
  @ApiResponse({
    status: 200,
    description: 'Lista de modelos',
    type: [EntryModelResponseDto],
  })
  async findAll(
    @Query('type') type?: string,
  ): Promise<EntryModelResponseDto[]> {
    if (type) {
      return await this.entryModelsService.findByType(type);
    }
    return await this.entryModelsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar modelo por ID' })
  @ApiParam({ name: 'id', description: 'ID do modelo' })
  @ApiResponse({
    status: 200,
    description: 'Modelo encontrado',
    type: EntryModelResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Modelo não encontrado' })
  async findOne(@Param('id') id: string): Promise<EntryModelResponseDto> {
    return await this.entryModelsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar modelo' })
  @ApiParam({ name: 'id', description: 'ID do modelo' })
  @ApiResponse({
    status: 200,
    description: 'Modelo atualizado com sucesso',
    type: EntryModelResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Modelo não encontrado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async update(
    @Param('id') id: string,
    @Body() updateEntryModelDto: UpdateEntryModelDto,
  ): Promise<EntryModelResponseDto> {
    return await this.entryModelsService.update(id, updateEntryModelDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover modelo' })
  @ApiParam({ name: 'id', description: 'ID do modelo' })
  @ApiResponse({ status: 204, description: 'Modelo removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Modelo não encontrado' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.entryModelsService.remove(id);
  }
}
