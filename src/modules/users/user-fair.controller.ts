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
  ParseIntPipe,
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
import { UserFairService } from './user-fair.service';
import { CreateUserFairDto } from './dto/create-user-fair.dto';
import { UpdateUserFairDto } from './dto/update-user-fair.dto';
import { UserFairResponseDto } from './dto/user-fair-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EUserRole } from '../../enum/role';

@ApiTags('User-Fair Associations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-fairs')
export class UserFairController {
  constructor(private readonly userFairService: UserFairService) {}

  @Post()
  @ApiOperation({
    summary: 'Associar usuário a uma feira',
    description: 'Cria uma nova associação entre um usuário e uma feira',
  })
  @ApiResponse({
    status: 201,
    description: 'Associação criada com sucesso',
    type: UserFairResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Usuário ou feira não encontrado' })
  @ApiResponse({ status: 409, description: 'Usuário já está associado a esta feira' })
  async create(@Body() createUserFairDto: CreateUserFairDto): Promise<UserFairResponseDto> {
    return await this.userFairService.create(createUserFairDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todas as associações',
    description: 'Retorna todas as associações usuário-feira',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de associações retornada com sucesso',
    type: [UserFairResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findAll(@Request() req): Promise<UserFairResponseDto[]> {
    // Apenas admins podem ver todas as associações
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Acesso negado');
    }

    return await this.userFairService.findAll();
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Listar feiras de um usuário',
    description: 'Retorna todas as feiras associadas a um usuário específico',
  })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de feiras do usuário retornada com sucesso',
    type: [UserFairResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Request() req
  ): Promise<UserFairResponseDto[]> {
    // Usuário só pode ver suas próprias feiras, exceto se for admin
    if (req.user.role !== EUserRole.ADMIN && req.user.id !== userId) {
      throw new Error('Acesso negado');
    }

    return await this.userFairService.findByUser(userId);
  }

  @Get('fair/:fairId')
  @ApiOperation({
    summary: 'Listar usuários de uma feira',
    description: 'Retorna todos os usuários associados a uma feira específica',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários da feira retornada com sucesso',
    type: [UserFairResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findByFair(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Request() req
  ): Promise<UserFairResponseDto[]> {
    // Apenas admins podem ver usuários de uma feira
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Acesso negado');
    }

    return await this.userFairService.findByFair(fairId);
  }

  @Get('active/user/:userId')
  @ApiOperation({
    summary: 'Listar feiras ativas de um usuário',
    description: 'Retorna apenas as feiras ativas associadas a um usuário',
  })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de feiras ativas do usuário retornada com sucesso',
    type: [UserFairResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async getActiveFairsByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Request() req
  ): Promise<UserFairResponseDto[]> {
    // Usuário só pode ver suas próprias feiras ativas, exceto se for admin
    if (req.user.role !== EUserRole.ADMIN && req.user.id !== userId) {
      throw new Error('Acesso negado');
    }

    return await this.userFairService.getActiveFairsByUser(userId);
  }

  @Get('active/fair/:fairId')
  @ApiOperation({
    summary: 'Listar usuários ativos de uma feira',
    description: 'Retorna apenas os usuários ativos associados a uma feira',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários ativos da feira retornada com sucesso',
    type: [UserFairResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async getActiveUsersByFair(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Request() req
  ): Promise<UserFairResponseDto[]> {
    // Apenas admins podem ver usuários ativos de uma feira
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Acesso negado');
    }

    return await this.userFairService.getActiveUsersByFair(fairId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter associação específica',
    description: 'Retorna uma associação usuário-feira específica',
  })
  @ApiParam({ name: 'id', description: 'ID da associação' })
  @ApiResponse({
    status: 200,
    description: 'Associação retornada com sucesso',
    type: UserFairResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Associação não encontrada' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req
  ): Promise<UserFairResponseDto> {
    const userFair = await this.userFairService.findOne(id);

    // Usuário só pode ver suas próprias associações, exceto se for admin
    if (req.user.role !== EUserRole.ADMIN && req.user.id !== userFair.userId) {
      throw new Error('Acesso negado');
    }

    return userFair;
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar associação',
    description: 'Atualiza uma associação usuário-feira existente',
  })
  @ApiParam({ name: 'id', description: 'ID da associação' })
  @ApiResponse({
    status: 200,
    description: 'Associação atualizada com sucesso',
    type: UserFairResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Associação não encontrada' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserFairDto: UpdateUserFairDto,
    @Request() req
  ): Promise<UserFairResponseDto> {
    const userFair = await this.userFairService.findOne(id);

    // Apenas admins podem atualizar associações
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Acesso negado');
    }

    return await this.userFairService.update(id, updateUserFairDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({
    summary: 'Ativar/Desativar associação',
    description: 'Alterna o status ativo/inativo de uma associação',
  })
  @ApiParam({ name: 'id', description: 'ID da associação' })
  @ApiResponse({
    status: 200,
    description: 'Status da associação alterado com sucesso',
    type: UserFairResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Associação não encontrada' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req
  ): Promise<UserFairResponseDto> {
    // Apenas admins podem alterar status de associações
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Acesso negado');
    }

    return await this.userFairService.toggleActive(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remover associação',
    description: 'Remove uma associação usuário-feira',
  })
  @ApiParam({ name: 'id', description: 'ID da associação' })
  @ApiResponse({
    status: 200,
    description: 'Associação removida com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Associação não encontrada' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req
  ): Promise<{ message: string }> {
    // Apenas admins podem remover associações
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Acesso negado');
    }

    await this.userFairService.remove(id);
    return { message: 'Associação removida com sucesso' };
  }
}
