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
@Controller('finance/revenues')
export class RevenuesController {
  constructor(private readonly revenuesService: RevenuesService) {}

  @Post()
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

  @Get()
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

  @Get(':id')
  @ApiOperation({ summary: 'Buscar receita por ID' })
  @ApiParam({ name: 'id', description: 'ID da receita' })
  @ApiResponse({
    status: 200,
    description: 'Receita encontrada',
    type: RevenueResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Receita não encontrada' })
  async findOne(@Param('id') id: string): Promise<RevenueResponseDto> {
    return await this.revenuesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar receita' })
  @ApiParam({ name: 'id', description: 'ID da receita' })
  @ApiResponse({
    status: 200,
    description: 'Receita atualizada com sucesso',
    type: RevenueResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Receita não encontrada' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async update(
    @Param('id') id: string,
    @Body() updateRevenueDto: UpdateRevenueDto,
  ): Promise<RevenueResponseDto> {
    return await this.revenuesService.update(id, updateRevenueDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover receita' })
  @ApiParam({ name: 'id', description: 'ID da receita' })
  @ApiResponse({ status: 204, description: 'Receita removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Receita não encontrada' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.revenuesService.remove(id);
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Buscar receitas por cliente' })
  @ApiParam({ name: 'clientId', description: 'ID do cliente' })
  @ApiResponse({
    status: 200,
    description: 'Receitas encontradas',
    type: [RevenueResponseDto],
  })
  async findByClient(
    @Param('clientId') clientId: string,
  ): Promise<RevenueResponseDto[]> {
    return await this.revenuesService.findByClient(clientId);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Buscar receitas por status' })
  @ApiParam({ name: 'status', description: 'Status da receita' })
  @ApiResponse({
    status: 200,
    description: 'Receitas encontradas',
    type: [RevenueResponseDto],
  })
  async findByStatus(
    @Param('status') status: string,
  ): Promise<RevenueResponseDto[]> {
    return await this.revenuesService.findByStatus(status);
  }

  @Patch('installment/:installmentId/confirm-payment')
  @ApiOperation({ summary: 'Confirmar pagamento de uma parcela' })
  @ApiParam({ name: 'installmentId', description: 'ID da parcela' })
  @ApiResponse({
    status: 200,
    description: 'Pagamento confirmado com sucesso',
    type: InstallmentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Parcela não encontrada' })
  async confirmInstallmentPayment(
    @Param('installmentId') installmentId: string,
    @Body() confirmPaymentDto: ConfirmInstallmentPaymentDto,
  ): Promise<InstallmentResponseDto> {
    return await this.revenuesService.confirmInstallmentPayment(
      installmentId,
      confirmPaymentDto,
    );
  }
}
