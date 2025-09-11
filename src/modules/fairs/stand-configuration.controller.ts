import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StandConfigurationService } from './stand-configuration.service';
import { CreateStandConfigurationDto } from './dto/create-stand-configuration.dto';
import { UpdateStandConfigurationDto } from './dto/update-stand-configuration.dto';
import { StandConfigurationResponseDto } from './dto/stand-configuration-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EUserRole } from '../../enum/role';

@ApiTags('Stand Configurations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stand-configurations')
export class StandConfigurationController {
  constructor(private readonly standConfigService: StandConfigurationService) {}

  @Post('fair/:fairId')
  @ApiOperation({
    summary: 'Criar configuração de stand para uma feira',
    description: 'Cria uma nova configuração de stand para uma feira específica',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 201,
    description: 'Configuração de stand criada com sucesso',
    type: StandConfigurationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Já existe configuração com este nome' })
  async create(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Body() createDto: CreateStandConfigurationDto
  ): Promise<StandConfigurationResponseDto> {
    return await this.standConfigService.create(createDto, fairId);
  }

  @Get('fair/:fairId')
  @ApiOperation({
    summary: 'Listar configurações de stands de uma feira',
    description: 'Retorna todas as configurações de stands de uma feira específica',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Lista de configurações retornada com sucesso',
    type: [StandConfigurationResponseDto],
  })
  async findByFair(
    @Param('fairId', ParseUUIDPipe) fairId: string
  ): Promise<StandConfigurationResponseDto[]> {
    return await this.standConfigService.findAllByFair(fairId);
  }

  @Get('fair/:fairId/statistics')
  @ApiOperation({
    summary: 'Estatísticas das configurações de stands',
    description: 'Retorna estatísticas das configurações de stands de uma feira',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
  })
  async getStatistics(
    @Param('fairId', ParseUUIDPipe) fairId: string
  ): Promise<any> {
    return await this.standConfigService.getStandStatistics(fairId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter configuração específica',
    description: 'Retorna uma configuração de stand específica',
  })
  @ApiParam({ name: 'id', description: 'ID da configuração' })
  @ApiResponse({
    status: 200,
    description: 'Configuração retornada com sucesso',
    type: StandConfigurationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuração não encontrada' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<StandConfigurationResponseDto> {
    return await this.standConfigService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar configuração',
    description: 'Atualiza uma configuração de stand existente',
  })
  @ApiParam({ name: 'id', description: 'ID da configuração' })
  @ApiResponse({
    status: 200,
    description: 'Configuração atualizada com sucesso',
    type: StandConfigurationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuração não encontrada' })
  @ApiResponse({ status: 409, description: 'Já existe configuração com este nome' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateStandConfigurationDto
  ): Promise<StandConfigurationResponseDto> {
    return await this.standConfigService.update(id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({
    summary: 'Ativar/Desativar configuração',
    description: 'Alterna o status ativo/inativo de uma configuração',
  })
  @ApiParam({ name: 'id', description: 'ID da configuração' })
  @ApiResponse({
    status: 200,
    description: 'Status da configuração alterado com sucesso',
    type: StandConfigurationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuração não encontrada' })
  async toggleActive(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<StandConfigurationResponseDto> {
    return await this.standConfigService.toggleActive(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remover configuração',
    description: 'Remove uma configuração de stand',
  })
  @ApiParam({ name: 'id', description: 'ID da configuração' })
  @ApiResponse({
    status: 200,
    description: 'Configuração removida com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Configuração não encontrada' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<{ message: string }> {
    await this.standConfigService.remove(id);
    return { message: 'Configuração removida com sucesso' };
  }
}
