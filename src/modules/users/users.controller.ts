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
  ParseIntPipe,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EUserRole } from '../../enum/role';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar novo usuário',
    description: 'Cria um novo usuário no sistema (apenas admins)',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Email ou CPF já cadastrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async create(@Body() createUserDto: CreateUserDto, @Request() req) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem criar usuários');
    }

    return await this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos os usuários',
    description: 'Retorna lista de todos os usuários (apenas admins)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários retornada com sucesso',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiQuery({ name: 'role', required: false, enum: EUserRole })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(
    @Request() req,
    @Query('role') role?: EUserRole,
    @Query('isActive') isActive?: string,
  ) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem listar todos os usuários');
    }

    if (role && !Object.values(EUserRole).includes(role)) {
      throw new BadRequestException('Role inválida');
    }
    if (
      isActive !== undefined &&
      !['true', 'false'].includes(isActive.toLowerCase())
    ) {
      throw new BadRequestException('isActive deve ser true ou false');
    }

    return await this.usersService.findAll({
      role,
      isActive:
        isActive === undefined ? undefined : isActive.toLowerCase() === 'true',
    });
  }

  @Get('me')
  @ApiOperation({
    summary: 'Obter perfil do usuário logado',
    description: 'Retorna o perfil do usuário logado',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil do usuário retornado com sucesso',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async findMe(@Request() req) {
    return await this.usersService.findOne(req.user.id);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Listar usuários ativos',
    description: 'Retorna lista de usuários ativos (apenas admins)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários ativos retornada com sucesso',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findActive(@Request() req) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem listar usuários ativos');
    }

    return await this.usersService.getActiveUsers();
  }

  @Get('role/:role')
  @ApiOperation({
    summary: 'Listar usuários por role',
    description: 'Retorna lista de usuários filtrados por role (apenas admins)',
  })
  @ApiParam({ name: 'role', description: 'Role do usuário', enum: EUserRole })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários por role retornada com sucesso',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findByRole(@Param('role') role: string, @Request() req) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem filtrar usuários por role');
    }

    return await this.usersService.findByRole(role);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Estatísticas de usuários',
    description: 'Retorna estatísticas gerais dos usuários (apenas admins)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
    schema: {
      type: 'object',
      properties: {
        totalUsers: { type: 'number', description: 'Total de usuários' },
        activeUsers: { type: 'number', description: 'Usuários ativos' },
        inactiveUsers: { type: 'number', description: 'Usuários inativos' },
        usersByRole: {
          type: 'object',
          description: 'Contagem de usuários por role',
          additionalProperties: { type: 'number' },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async getStats(@Request() req) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem consultar estatísticas');
    }

    return await this.usersService.getUsersStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter usuário por ID',
    description:
      'Retorna dados de um usuário específico (apenas admins ou próprio usuário)',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Usuário retornado com sucesso',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    // Verificar se é admin ou o próprio usuário
    if (req.user.role !== EUserRole.ADMIN && req.user.id !== id) {
      throw new Error('Acesso negado');
    }

    return await this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar usuário',
    description:
      'Atualiza dados de um usuário (apenas admins ou próprio usuário)',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Usuário atualizado com sucesso',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    // Verificar se é admin ou o próprio usuário
    if (req.user.role !== EUserRole.ADMIN && req.user.id !== id) {
      throw new Error('Acesso negado');
    }

    // Usuários não-admin não podem alterar role
    if (req.user.role !== EUserRole.ADMIN && updateUserDto.role) {
      delete updateUserDto.role;
    }

    return await this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/change-password')
  @ApiOperation({
    summary: 'Alterar senha',
    description: 'Altera a senha do usuário (próprio usuário)',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso' })
  @ApiResponse({ status: 400, description: 'Senha atual incorreta' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req,
  ) {
    // Verificar se é o próprio usuário
    if (req.user.id !== id) {
      throw new Error('Apenas o próprio usuário pode alterar sua senha');
    }

    await this.usersService.changePassword(id, changePasswordDto);
    return { message: 'Senha alterada com sucesso' };
  }

  @Patch(':id/toggle-active')
  @ApiOperation({
    summary: 'Ativar/Desativar usuário',
    description: 'Ativa ou desativa um usuário (apenas admins)',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Status do usuário alterado com sucesso',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async toggleActive(@Param('id', ParseIntPipe) id: number, @Request() req) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem ativar/desativar usuários');
    }

    return await this.usersService.toggleActive(id);
  }

  @Patch(':id/resend-invite')
  @ApiOperation({
    summary: 'Reenviar convite de primeiro acesso',
    description:
      'Reemite o código de primeiro acesso e reenvia o email (apenas admins, só pra usuários que ainda não concluíram o primeiro acesso)',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiResponse({ status: 200, description: 'Convite reenviado com sucesso' })
  @ApiResponse({ status: 400, description: 'Usuário já concluiu o primeiro acesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async resendInvite(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem reenviar convites');
    }

    await this.usersService.resendInvite(id);
    return { message: 'Convite reenviado com sucesso' };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remover usuário',
    description: 'Remove um usuário do sistema (apenas admins)',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiResponse({ status: 200, description: 'Usuário removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem remover usuários');
    }

    // Verificar se não está tentando remover a si mesmo
    if (req.user.id === id) {
      throw new Error('Não é possível remover seu próprio usuário');
    }

    await this.usersService.remove(id);
    return { message: 'Usuário removido com sucesso' };
  }
}
