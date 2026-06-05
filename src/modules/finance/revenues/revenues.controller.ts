import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RevenuesService } from './revenues.service';
import {
  CreateRevenueDto,
  UpdateRevenueDto,
  RevenueResponseDto,
  ConfirmInstallmentPaymentDto,
  InstallmentResponseDto,
} from './revenues.dto';

@ApiTags('Receitas')
@Controller()
export class RevenuesController {
  constructor(private readonly revenuesService: RevenuesService) {}

  @Post('finance/revenues')
  @ApiOperation({ summary: 'Criar uma nova receita' })
  @ApiResponse({
    status: 201,
    description: 'Receita criada com sucesso',
    type: RevenueResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(
    @Body() createRevenueDto: CreateRevenueDto,
  ): Promise<RevenueResponseDto> {
    return await this.revenuesService.create(createRevenueDto);
  }

  @Post('/fairs/:fairId/revenues')
  @ApiOperation({ summary: 'Criar uma nova receita vinculada a uma feira' })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 201,
    description: 'Receita criada com sucesso',
    type: RevenueResponseDto,
  })
  async createByFair(
    @Param('fairId') fairId: string,
    @Body() createRevenueDto: CreateRevenueDto,
  ): Promise<RevenueResponseDto> {
    createRevenueDto.fairId = fairId;
    return await this.revenuesService.create(createRevenueDto);
  }

  @Get('finance/revenues')
  @ApiOperation({ summary: 'Listar receitas de uma feira específica' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira (obrigatório)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtrar por status',
  })
  @ApiQuery({
    name: 'clientId',
    required: false,
    description: 'Filtrar por cliente',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de receitas da feira',
    type: [RevenueResponseDto],
  })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async findAll(
    @Query('fairId') fairId: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
  ): Promise<RevenueResponseDto[]> {
    if (!fairId) {
      throw new BadRequestException('fairId é obrigatório');
    }

    return await this.revenuesService.findByFair(fairId, { status, clientId });
  }

  @Get('/fairs/:fairId/revenues')
  @ApiOperation({
    summary: 'Listar receitas de uma feira específica (URL amigável)',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtrar por status',
  })
  @ApiQuery({
    name: 'clientId',
    required: false,
    description: 'Filtrar por cliente',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de receitas da feira',
    type: [RevenueResponseDto],
  })
  async findAllByFair(
    @Param('fairId') fairId: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
  ): Promise<RevenueResponseDto[]> {
    return await this.revenuesService.findByFair(fairId, { status, clientId });
  }

  @Get('finance/revenues/:id')
  @ApiOperation({ summary: 'Buscar receita por ID' })
  @ApiParam({ name: 'id', description: 'ID da receita' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira (obrigatório para validação)',
  })
  @ApiResponse({
    status: 200,
    description: 'Receita encontrada',
    type: RevenueResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Receita não encontrada' })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async findOne(
    @Param('id') id: string,
    @Query('fairId') fairId: string,
  ): Promise<RevenueResponseDto> {
    if (!fairId) {
      throw new BadRequestException('fairId é obrigatório');
    }
    return await this.revenuesService.findOne(id, fairId);
  }

  @Patch('finance/revenues/:id')
  @ApiOperation({ summary: 'Atualizar receita' })
  @ApiParam({ name: 'id', description: 'ID da receita' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira (obrigatório para validação)',
  })
  @ApiResponse({
    status: 200,
    description: 'Receita atualizada com sucesso',
    type: RevenueResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Receita não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou fairId é obrigatório',
  })
  async update(
    @Param('id') id: string,
    @Query('fairId') fairId: string,
    @Body() updateRevenueDto: UpdateRevenueDto,
  ): Promise<RevenueResponseDto> {
    if (!fairId) {
      throw new BadRequestException('fairId é obrigatório');
    }
    return await this.revenuesService.update(id, updateRevenueDto, fairId);
  }

  @Delete('finance/revenues/:id')
  @ApiOperation({ summary: 'Remover receita' })
  @ApiParam({ name: 'id', description: 'ID da receita' })
  @ApiResponse({ status: 204, description: 'Receita removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Receita não encontrada' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async remove(@Param('id') id: string): Promise<void> {
    try {
      console.log(`[DELETE] Tentando remover receita com ID: ${id}`);
      await this.revenuesService.remove(id);
      console.log(`[DELETE] Receita ${id} removida com sucesso`);
    } catch (error) {
      console.error(`[DELETE] Erro ao remover receita ${id}:`, error);
      throw error;
    }
  }

  @Get('finance/revenues/client/:clientId')
  @ApiOperation({ summary: 'Buscar receitas por cliente' })
  @ApiParam({ name: 'clientId', description: 'ID do cliente' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira (obrigatório)',
  })
  @ApiResponse({
    status: 200,
    description: 'Receitas encontradas',
    type: [RevenueResponseDto],
  })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async findByClient(
    @Param('clientId') clientId: string,
    @Query('fairId') fairId: string,
  ): Promise<RevenueResponseDto[]> {
    if (!fairId) {
      throw new BadRequestException('fairId é obrigatório');
    }
    return await this.revenuesService.findByClient(clientId, fairId);
  }

  @Get('finance/revenues/status/:status')
  @ApiOperation({ summary: 'Buscar receitas por status' })
  @ApiParam({ name: 'status', description: 'Status da receita' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira (obrigatório)',
  })
  @ApiResponse({
    status: 200,
    description: 'Receitas encontradas',
    type: [RevenueResponseDto],
  })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async findByStatus(
    @Param('status') status: string,
    @Query('fairId') fairId: string,
  ): Promise<RevenueResponseDto[]> {
    if (!fairId) {
      throw new BadRequestException('fairId é obrigatório');
    }
    return await this.revenuesService.findByStatus(status, fairId);
  }

  @Patch('finance/revenues/installment/:installmentId/confirm-payment')
  @ApiOperation({ summary: 'Confirmar pagamento de uma parcela' })
  @ApiParam({ name: 'installmentId', description: 'ID da parcela' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira (obrigatório para validação)',
  })
  @ApiResponse({
    status: 200,
    description: 'Pagamento confirmado com sucesso',
    type: InstallmentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Parcela não encontrada' })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async confirmInstallmentPayment(
    @Param('installmentId') installmentId: string,
    @Query('fairId') fairId: string,
    @Body() confirmPaymentDto: ConfirmInstallmentPaymentDto,
  ): Promise<InstallmentResponseDto> {
    if (!fairId) {
      throw new BadRequestException('fairId é obrigatório');
    }
    return await this.revenuesService.confirmInstallmentPayment(
      installmentId,
      confirmPaymentDto,
      fairId,
    );
  }

  @Get('finance/revenues/stats/:fairId')
  @ApiOperation({ summary: 'Estatísticas de receitas por feira' })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas das receitas da feira',
    schema: {
      type: 'object',
      properties: {
        totalValue: {
          type: 'number',
          description: 'Valor total das receitas (soma de contractValue)',
        },
        totalRevenues: {
          type: 'number',
          description: 'Quantidade total de receitas',
        },
        averagePerRevenue: {
          type: 'number',
          description: 'Média por receita (totalValue / totalRevenues)',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async getRevenueStats(@Param('fairId') fairId: string) {
    if (!fairId) {
      throw new BadRequestException('fairId é obrigatório');
    }

    try {
      return await this.revenuesService.getRevenueStatsByFair(fairId);
    } catch (error) {
      console.error(
        `Erro ao buscar estatísticas de receitas da feira ${fairId}:`,
        error,
      );
      throw new BadRequestException('Erro ao buscar estatísticas de receitas');
    }
  }
}
