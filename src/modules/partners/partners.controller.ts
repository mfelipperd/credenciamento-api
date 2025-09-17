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
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { PartnerResponseDto } from './dto/partner-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EUserRole } from '../../enum/role';

@ApiTags('partners')
@ApiBearerAuth('JWT-auth')
@Controller('partners')
@UseGuards(JwtAuthGuard)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar novo sócio',
    description: 'Cria um novo perfil de sócio (apenas admins)',
  })
  @ApiBody({ type: CreatePartnerDto })
  @ApiResponse({
    status: 201,
    description: 'Sócio criado com sucesso',
    type: PartnerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async create(@Body() createPartnerDto: CreatePartnerDto, @Request() req) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem criar sócios');
    }

    return await this.partnersService.create(createPartnerDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos os sócios',
    description: 'Retorna lista de todos os sócios (apenas admins)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de sócios retornada com sucesso',
    type: [PartnerResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findAll(@Request() req) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem listar todos os sócios');
    }

    return await this.partnersService.findAll();
  }

  @Get('me')
  @ApiOperation({
    summary: 'Obter perfil do sócio logado',
    description: 'Retorna o perfil do sócio com dados financeiros calculados baseado no usuário logado',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil do sócio retornado com sucesso',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        userId: { type: 'string' },
        name: { type: 'string' },
        cpf: { type: 'string', nullable: true },
        email: { type: 'string', nullable: true },
        phone: { type: 'string', nullable: true },
        percentage: { type: 'number' },
        totalEarnings: { type: 'number' },
        totalWithdrawn: { type: 'number' },
        availableBalance: { type: 'number' },
        isActive: { type: 'boolean' },
        notes: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        fairEarnings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              fairId: { type: 'string' },
              fairName: { type: 'string' },
              percentage: { type: 'number' },
              earnings: { type: 'number' },
              isProfitable: { type: 'boolean' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Sócio não encontrado' })
  async findMe(@Request() req) {
    return await this.partnersService.getPartnerProfile(req.user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter sócio por ID',
    description: 'Retorna dados de um sócio específico (apenas admins)',
  })
  @ApiParam({ name: 'id', description: 'ID do sócio' })
  @ApiResponse({
    status: 200,
    description: 'Sócio retornado com sucesso',
    type: PartnerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Sócio não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    // Verificar se é admin ou o próprio sócio
    if (req.user.role !== EUserRole.ADMIN) {
      const partner = await this.partnersService.findByUserId(req.user.id);
      if (!partner || partner.id !== id) {
        throw new Error('Acesso negado');
      }
    }

    return await this.partnersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar sócio',
    description: 'Atualiza dados de um sócio (apenas admins)',
  })
  @ApiParam({ name: 'id', description: 'ID do sócio' })
  @ApiBody({ type: UpdatePartnerDto })
  @ApiResponse({
    status: 200,
    description: 'Sócio atualizado com sucesso',
    type: PartnerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Sócio não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePartnerDto: UpdatePartnerDto,
    @Request() req,
  ) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem atualizar sócios');
    }

    return await this.partnersService.update(id, updatePartnerDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remover sócio',
    description: 'Remove um sócio do sistema (apenas admins)',
  })
  @ApiParam({ name: 'id', description: 'ID do sócio' })
  @ApiResponse({ status: 200, description: 'Sócio removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Sócio não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem remover sócios');
    }

    await this.partnersService.remove(id);
    return { message: 'Sócio removido com sucesso' };
  }

  // Endpoints para controle financeiro
  @Post(':id/withdrawals')
  @ApiOperation({
    summary: 'Solicitar saque',
    description: 'Solicita um saque do saldo disponível',
  })
  @ApiParam({ name: 'id', description: 'ID do sócio' })
  @ApiBody({ type: CreateWithdrawalDto })
  @ApiResponse({ status: 201, description: 'Solicitação de saque criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Valor inválido ou saldo insuficiente' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async createWithdrawal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createWithdrawalDto: CreateWithdrawalDto,
    @Request() req,
  ) {
    // Verificar se é admin ou o próprio sócio
    if (req.user.role !== EUserRole.ADMIN) {
      const partner = await this.partnersService.findByUserId(req.user.id);
      if (!partner || partner.id !== id) {
        throw new Error('Acesso negado');
      }
    }

    return await this.partnersService.createWithdrawal(id, createWithdrawalDto);
  }

  @Get(':fairId/withdrawals')
  @ApiOperation({
    summary: 'Listar saques por feira',
    description: 'Retorna todas as solicitações de saque dos sócios de uma feira específica',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Solicitações de saque da feira retornadas com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async getWithdrawalsByFair(@Param('fairId', ParseUUIDPipe) fairId: string, @Request() req) {
    // Apenas administradores podem visualizar saques por feira
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem visualizar saques por feira');
    }

    return await this.partnersService.getWithdrawalsByFair(fairId);
  }

  @Get(':id/financial-summary')
  @ApiOperation({
    summary: 'Resumo financeiro do sócio por feira',
    description: 'Retorna resumo financeiro do sócio para uma feira específica',
  })
  @ApiParam({ name: 'id', description: 'ID do sócio' })
  @ApiQuery({ name: 'fairId', description: 'ID da feira', required: true })
  @ApiResponse({ status: 200, description: 'Resumo financeiro retornado com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async getFinancialSummary(
    @Param('id', ParseUUIDPipe) id: string, 
    @Query('fairId', ParseUUIDPipe) fairId: string,
    @Request() req
  ) {
    // Verificar se é admin ou o próprio sócio
    if (req.user.role !== EUserRole.ADMIN) {
      const partner = await this.partnersService.findByUserId(req.user.id);
      if (!partner || partner.id !== id) {
        throw new Error('Acesso negado');
      }
    }

    return await this.partnersService.getFinancialSummaryByFair(id, fairId);
  }

  // Endpoints para administradores gerenciarem saques
  @Post('withdrawals/:withdrawalId/approve')
  @ApiOperation({
    summary: 'Aprovar saque',
    description: 'Aprova uma solicitação de saque (apenas admins)',
  })
  @ApiParam({ name: 'withdrawalId', description: 'ID da solicitação de saque' })
  @ApiResponse({ status: 200, description: 'Saque aprovado com sucesso' })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async approveWithdrawal(
    @Param('withdrawalId', ParseUUIDPipe) withdrawalId: string,
    @Request() req,
  ) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem aprovar saques');
    }

    return await this.partnersService.approveWithdrawal(withdrawalId, req.user.id);
  }

  @Post('withdrawals/:withdrawalId/reject')
  @ApiOperation({
    summary: 'Rejeitar saque',
    description: 'Rejeita uma solicitação de saque (apenas admins)',
  })
  @ApiParam({ name: 'withdrawalId', description: 'ID da solicitação de saque' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rejectionReason: { type: 'string', description: 'Motivo da rejeição' }
      },
      required: ['rejectionReason']
    }
  })
  @ApiResponse({ status: 200, description: 'Saque rejeitado com sucesso' })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async rejectWithdrawal(
    @Param('withdrawalId', ParseUUIDPipe) withdrawalId: string,
    @Body('rejectionReason') rejectionReason: string,
    @Request() req,
  ) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem rejeitar saques');
    }

    return await this.partnersService.rejectWithdrawal(withdrawalId, rejectionReason);
  }

  @Get('available-percentage')
  @ApiOperation({
    summary: 'Obter porcentagem disponível',
    description: 'Retorna a porcentagem máxima disponível para um novo sócio',
  })
  @ApiResponse({
    status: 200,
    description: 'Porcentagem disponível retornada com sucesso',
    schema: {
      type: 'object',
      properties: {
        availablePercentage: { type: 'number', description: 'Porcentagem máxima disponível' },
        usedPercentage: { type: 'number', description: 'Porcentagem já utilizada' },
        totalPercentage: { type: 'number', description: 'Total (sempre 100%)' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async getAvailablePercentage(@Request() req) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem consultar porcentagem disponível');
    }

    const availablePercentage = await this.partnersService.getAvailablePercentage();
    const usedPercentage = 100 - availablePercentage;

    return {
      availablePercentage,
      usedPercentage,
      totalPercentage: 100
    };
  }
}
