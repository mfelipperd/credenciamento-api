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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { FairPartnersService } from './fair-partners.service';
import { PartnersService } from './partners.service';
import { CreateFairPartnerDto } from './dto/create-fair-partner.dto';
import { UpdateFairPartnerDto } from './dto/update-fair-partner.dto';
import { FairPartnerResponseDto } from './dto/fair-partner-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EUserRole } from '../../enum/role';

@ApiTags('fair-partners')
@ApiBearerAuth('JWT-auth')
@Controller('fair-partners')
@UseGuards(JwtAuthGuard)
export class FairPartnersController {
  constructor(
    private readonly fairPartnersService: FairPartnersService,
    private readonly partnersService: PartnersService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Associar sócio à feira',
    description:
      'Associa um sócio a uma feira com porcentagem específica (apenas admins)',
  })
  @ApiBody({ type: CreateFairPartnerDto })
  @ApiResponse({
    status: 201,
    description: 'Sócio associado à feira com sucesso',
    type: FairPartnerResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou porcentagem excedida',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async create(
    @Body() createFairPartnerDto: CreateFairPartnerDto,
    @Request() req,
  ) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem associar sócios a feiras');
    }

    return await this.fairPartnersService.create(createFairPartnerDto);
  }

  @Get('fair/:fairId')
  @ApiOperation({
    summary: 'Listar sócios de uma feira',
    description: 'Retorna todos os sócios associados a uma feira específica',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Lista de sócios da feira retornada com sucesso',
    type: [FairPartnerResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findAllByFair(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Request() req,
  ) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem listar sócios de feiras');
    }

    return await this.fairPartnersService.findAllByFair(fairId);
  }

  @Get('partner/:partnerId')
  @ApiOperation({
    summary: 'Listar feiras de um sócio por UUID',
    description:
      'Retorna todas as feiras associadas a um sócio específico (UUID do sócio)',
  })
  @ApiParam({ name: 'partnerId', description: 'UUID do sócio' })
  @ApiResponse({
    status: 200,
    description: 'Lista de feiras do sócio retornada com sucesso',
    type: [FairPartnerResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findAllByPartner(
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
    @Request() req,
  ) {
    // Verificar se é admin ou o próprio sócio
    if (req.user.role !== EUserRole.ADMIN) {
      // Se partnerId é um número (ID do usuário), buscar o sócio correspondente
      if (!isNaN(+partnerId)) {
        const partner = await this.partnersService.findByUserId(+partnerId);
        if (!partner || partner.userId !== req.user.id.toString()) {
          throw new Error('Acesso negado');
        }
        return await this.fairPartnersService.findAllByPartner(partner.id);
      } else {
        const partner = await this.fairPartnersService.findOne(partnerId);
        if (partner.partnerId !== req.user.id) {
          throw new Error('Acesso negado');
        }
        return await this.fairPartnersService.findAllByPartner(partnerId);
      }
    }

    // Se partnerId é um número (ID do usuário), buscar o sócio correspondente
    if (!isNaN(+partnerId)) {
      const partner = await this.partnersService.findByUserId(+partnerId);
      if (!partner) {
        throw new Error('Sócio não encontrado');
      }
      return await this.fairPartnersService.findAllByPartner(partner.id);
    }

    return await this.fairPartnersService.findAllByPartner(partnerId);
  }

  @Get('me/fairs')
  @ApiOperation({
    summary: 'Minhas feiras',
    description: 'Retorna todas as feiras do sócio logado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de feiras do sócio logado retornada com sucesso',
    type: [FairPartnerResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Sócio não encontrado' })
  async findMyFairs(@Request() req) {
    // Buscar o ID do sócio baseado no userId
    const partnerId = req.user.id; // Assumindo que o userId é o partnerId
    return await this.fairPartnersService.findAllByPartner(partnerId);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Listar feiras de um sócio por ID do usuário',
    description:
      'Retorna todas as feiras associadas a um sócio específico (ID do usuário)',
  })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de feiras do sócio retornada com sucesso',
    type: [FairPartnerResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findAllByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Request() req,
  ) {
    // Verificar se é admin ou o próprio usuário
    if (req.user.role !== EUserRole.ADMIN && req.user.id !== userId) {
      throw new Error('Acesso negado');
    }

    // Buscar o sócio correspondente ao usuário
    const partner = await this.partnersService.findByUserId(userId);
    if (!partner) {
      throw new Error('Sócio não encontrado para este usuário');
    }

    return await this.fairPartnersService.findAllByPartner(partner.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter associação feira-sócio',
    description: 'Retorna dados de uma associação específica',
  })
  @ApiParam({ name: 'id', description: 'ID da associação feira-sócio' })
  @ApiResponse({
    status: 200,
    description: 'Associação retornada com sucesso',
    type: FairPartnerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Associação não encontrada' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const fairPartner = await this.fairPartnersService.findOne(id);

    // Verificar se é admin ou o próprio sócio
    if (
      req.user.role !== EUserRole.ADMIN &&
      fairPartner.partnerId !== req.user.id
    ) {
      throw new Error('Acesso negado');
    }

    return fairPartner;
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar associação feira-sócio',
    description: 'Atualiza dados de uma associação (apenas admins)',
  })
  @ApiParam({ name: 'id', description: 'ID da associação feira-sócio' })
  @ApiBody({ type: UpdateFairPartnerDto })
  @ApiResponse({
    status: 200,
    description: 'Associação atualizada com sucesso',
    type: FairPartnerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Associação não encontrada' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFairPartnerDto: UpdateFairPartnerDto,
    @Request() req,
  ) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem atualizar associações');
    }

    return await this.fairPartnersService.update(id, updateFairPartnerDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remover associação feira-sócio',
    description: 'Remove um sócio de uma feira (apenas admins)',
  })
  @ApiParam({ name: 'id', description: 'ID da associação feira-sócio' })
  @ApiResponse({ status: 200, description: 'Associação removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Associação não encontrada' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem remover associações');
    }

    await this.fairPartnersService.remove(id);
    return { message: 'Associação removida com sucesso' };
  }

  // Endpoints para controle financeiro específico por feira
  @Get('fair/:fairId/financial-overview')
  @ApiOperation({
    summary: 'Visão financeira completa dos sócios da feira',
    description:
      'Retorna análise financeira detalhada de todos os sócios de uma feira, incluindo projeções, saques, excedentes e alertas (apenas admins)',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Visão financeira retornada com sucesso',
    schema: {
      type: 'object',
      properties: {
        fairId: { type: 'string' },
        fairName: { type: 'string' },
        lucroFeira: { type: 'number' },
        isProfitable: { type: 'boolean' },
        totalPartnerPercentage: { type: 'number' },
        percentagemEmpresa: { type: 'number' },
        totalProjetadoSocios: { type: 'number' },
        totalSacado: { type: 'number' },
        totalPendente: { type: 'number' },
        totalDisponivelSocios: { type: 'number' },
        totalSociosAtivos: { type: 'number' },
        totalSociosInativos: { type: 'number' },
        sociosEmExcesso: { type: 'number' },
        sociosComPendentes: { type: 'number' },
        partners: { type: 'array' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Feira não encontrada' })
  async getFairFinancialOverview(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Request() req,
  ) {
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error('Apenas administradores podem acessar a visão financeira');
    }
    return await this.partnersService.getFairPartnersOverview(fairId);
  }

  @Get('fair/:fairId/summary')
  @ApiOperation({
    summary: 'Resumo dos sócios da feira',
    description: 'Retorna resumo de todos os sócios de uma feira',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Resumo retornado com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async getFairSummary(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Request() req,
  ) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error(
        'Apenas administradores podem consultar resumo de feiras',
      );
    }

    return await this.fairPartnersService.getFairPartnersSummary(fairId);
  }

  @Get('fair/:fairId/partner/:partnerId/financial-summary')
  @ApiOperation({
    summary: 'Resumo financeiro do sócio na feira',
    description:
      'Retorna resumo financeiro de um sócio específico em uma feira (aceita ID do usuário ou UUID do sócio)',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiParam({
    name: 'partnerId',
    description: 'ID do usuário (número) ou UUID do sócio',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo financeiro retornado com sucesso',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async getFinancialSummary(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Param('partnerId') partnerId: string,
    @Request() req,
  ) {
    let actualPartnerId = partnerId;

    // Se partnerId é um número (ID do usuário), buscar o sócio correspondente
    if (!isNaN(+partnerId)) {
      const partner = await this.partnersService.findByUserId(+partnerId);
      if (!partner) {
        throw new Error('Sócio não encontrado para este usuário');
      }
      actualPartnerId = partner.id;
    }

    // Verificar se é admin ou o próprio sócio
    if (req.user.role !== EUserRole.ADMIN) {
      // Se partnerId é um número (ID do usuário), verificar se é o próprio usuário
      if (!isNaN(+partnerId)) {
        if (+partnerId !== req.user.id) {
          throw new Error('Acesso negado');
        }
      } else {
        // Se é UUID, buscar o sócio e verificar se o userId corresponde
        const partner = await this.partnersService.findByUserId(req.user.id);
        if (!partner || partner.id !== actualPartnerId) {
          throw new Error('Acesso negado');
        }
      }
    }

    return await this.fairPartnersService.getFinancialSummary(
      fairId,
      actualPartnerId,
    );
  }

  @Get('fair/:fairId/available-percentage')
  @ApiOperation({
    summary: 'Porcentagem disponível na feira',
    description: 'Retorna a porcentagem máxima disponível para esta feira',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Porcentagem disponível retornada com sucesso',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async getAvailablePercentage(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Request() req,
  ) {
    // Verificar se é admin
    if (req.user.role !== EUserRole.ADMIN) {
      throw new Error(
        'Apenas administradores podem consultar porcentagem disponível',
      );
    }

    const availablePercentage =
      await this.fairPartnersService.getAvailablePercentage(fairId);
    const usedPercentage = 100 - availablePercentage;

    return {
      fairId,
      availablePercentage,
      usedPercentage,
      totalPercentage: 100,
    };
  }
}
