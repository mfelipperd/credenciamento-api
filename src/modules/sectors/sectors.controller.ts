import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SectorsService } from './sectors.service';
import { CreateSectorDto } from './sector.dto';

@ApiTags('Setores')
@ApiBearerAuth('JWT-auth')
@Controller('sectors')
export class SectorsController {
  constructor(private readonly sectorsService: SectorsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar setor', description: 'Cria um novo setor de atuação para uso no formulário de inscrição de visitantes.' })
  @ApiBody({ type: CreateSectorDto })
  @ApiResponse({ status: 201, description: 'Setor criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  createSector(@Body() data: CreateSectorDto) {
    return this.sectorsService.createSector(data);
  }

  @Get(':fairId')
  @ApiOperation({ summary: 'Listar setores da feira', description: 'Retorna todos os setores vinculados a uma feira específica.' })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Lista de setores da feira' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  getSectorsByFair(@Param('fairId') fairId: string) {
    return this.sectorsService.getSectorsByFair(fairId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar setor' })
  @ApiParam({ name: 'id', description: 'ID do setor' })
  @ApiResponse({ status: 200, description: 'Setor atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Setor não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  updateSector(@Param('id') id: string, @Body() data: Partial<CreateSectorDto>) {
    return this.sectorsService.updateSector(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover setor' })
  @ApiParam({ name: 'id', description: 'ID do setor' })
  @ApiResponse({ status: 200, description: 'Setor removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Setor não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  deleteSector(@Param('id') id: string) {
    return this.sectorsService.deleteSector(id);
  }
}
