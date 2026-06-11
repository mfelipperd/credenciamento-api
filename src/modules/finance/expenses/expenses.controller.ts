import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { SetOverheadDto } from './dto/set-overhead.dto';
import { OverheadExpensesService } from '../overhead/overhead-expenses.service';
import { ConvertExpenseToOverheadDto } from '../overhead/dto/overhead-expense.dto';

@ApiTags('Despesas')
@ApiBearerAuth('JWT-auth')
@Controller()
export class ExpensesController {
  private readonly logger = new Logger(ExpensesController.name);

  constructor(
    private readonly expensesService: ExpensesService,
    private readonly overheadExpensesService: OverheadExpensesService,
  ) {}

  @Post('fairs/:fairId/expenses')
  @ApiOperation({ summary: 'Criar despesa direta', description: 'Cria uma despesa 100% vinculada à feira informada.' })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiBody({ type: CreateExpenseDto })
  @ApiResponse({ status: 201, description: 'Despesa criada com sucesso' })
  @ApiResponse({ status: 400, description: 'categoryId e accountId são obrigatórios' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async create(@Param('fairId', ParseUUIDPipe) fairId: string, @Body() createExpenseDto: CreateExpenseDto) {
    try {
      createExpenseDto.fairId = fairId;
      if (!createExpenseDto.categoryId || !createExpenseDto.accountId) {
        throw new HttpException('categoryId e accountId são obrigatórios', HttpStatus.BAD_REQUEST);
      }
      return await this.expensesService.create(createExpenseDto);
    } catch (error) {
      this.logger.error(`Erro ao criar despesa: ${error.message}`, error.stack);
      if (error instanceof HttpException) throw error;
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new HttpException('Categoria ou conta bancária não encontrada', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Erro interno ao criar despesa', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('fairs/:fairId/expenses')
  @ApiOperation({
    summary: 'Listar despesas da feira',
    description: 'Retorna despesas diretas, overhead rateado (tabela legacy) e overhead direto rateado, com totais consolidados.',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Despesas da feira com resumo',
    schema: {
      example: {
        directExpenses: [],
        allocatedOverhead: [],
        allocatedDirect: [],
        summary: { totalDireto: 1500.00, totalRateado: 500.00, totalGeral: 2000.00 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async findAllByFair(@Param('fairId', ParseUUIDPipe) fairId: string) {
    try {
      const [directExpenses, allocatedOverhead, allocatedDirect] = await Promise.all([
        this.expensesService.findAllByFair(fairId),
        this.overheadExpensesService.findAllocatedForFair(fairId),
        this.expensesService.findOverheadAllocatedForFair(fairId),
      ]);
      const totalDireto = directExpenses.reduce((sum, e) => sum + Number(e.valor), 0);
      const totalRateadoLegado = allocatedOverhead.reduce((sum, e) => sum + e.valorAlocado, 0);
      const totalRateadoDireto = allocatedDirect.reduce((sum, e) => sum + e.valorAlocado, 0);
      const totalRateado = totalRateadoLegado + totalRateadoDireto;
      return {
        directExpenses,
        allocatedOverhead,
        allocatedDirect,
        summary: {
          totalDireto: Math.round(totalDireto * 100) / 100,
          totalRateado: Math.round(totalRateado * 100) / 100,
          totalGeral: Math.round((totalDireto + totalRateado) * 100) / 100,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar despesas da feira ${fairId}: ${error.message}`);
      throw new HttpException('Erro ao buscar despesas da feira', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('fairs/:fairId/expenses/total')
  @ApiOperation({ summary: 'Total de despesas da feira', description: 'Retorna os totais de despesas diretas, rateadas e geral.' })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Totais de despesas',
    schema: { example: { totalDireto: 1500.00, totalRateado: 500.00, totalGeral: 2000.00 } },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getTotalByFair(@Param('fairId', ParseUUIDPipe) fairId: string) {
    try {
      const [totalDireto, totalRateadoLegado, totalRateadoDireto] = await Promise.all([
        this.expensesService.getTotalByFair(fairId),
        this.overheadExpensesService.getTotalAllocatedForFair(fairId),
        this.expensesService.getTotalDirectOverheadForFair(fairId),
      ]);
      const totalRateado = totalRateadoLegado + totalRateadoDireto;
      return {
        totalDireto: Math.round(totalDireto * 100) / 100,
        totalRateado: Math.round(totalRateado * 100) / 100,
        totalGeral: Math.round((totalDireto + totalRateado) * 100) / 100,
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar total de despesas da feira ${fairId}: ${error.message}`);
      throw new HttpException('Erro ao buscar total de despesas', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('fairs/:fairId/expenses/total-by-category')
  @ApiOperation({ summary: 'Total de despesas por categoria', description: 'Agrupa e soma as despesas da feira por categoria financeira.' })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Totais agrupados por categoria' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getTotalByCategory(@Param('fairId', ParseUUIDPipe) fairId: string) {
    try {
      return await this.expensesService.getTotalByCategory(fairId);
    } catch (error) {
      this.logger.error(`Erro ao buscar total por categoria da feira ${fairId}: ${error.message}`);
      throw new HttpException('Erro ao buscar total por categoria', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('fairs/:fairId/expenses/total-by-account')
  @ApiOperation({ summary: 'Total de despesas por conta bancária', description: 'Agrupa e soma as despesas da feira por conta de pagamento.' })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Totais agrupados por conta bancária' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getTotalByAccount(@Param('fairId', ParseUUIDPipe) fairId: string) {
    try {
      return await this.expensesService.getTotalByAccount(fairId);
    } catch (error) {
      this.logger.error(`Erro ao buscar total por conta da feira ${fairId}: ${error.message}`);
      throw new HttpException('Erro ao buscar total por conta', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('expenses/:id')
  @ApiOperation({ summary: 'Buscar despesa por ID' })
  @ApiParam({ name: 'id', description: 'ID da despesa (UUID)' })
  @ApiResponse({ status: 200, description: 'Despesa encontrada' })
  @ApiResponse({ status: 404, description: 'Despesa não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.expensesService.findOne(id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Erro ao buscar despesa ${id}: ${error.message}`);
      throw new HttpException('Erro ao buscar despesa', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('expenses/:id/set-overhead')
  @ApiOperation({
    summary: 'Marcar despesa como overhead rateado',
    description: 'Marca a despesa como overhead e define o rateio percentual entre feiras. Pode ser chamado múltiplas vezes para atualizar.',
  })
  @ApiParam({ name: 'id', description: 'ID da despesa' })
  @ApiBody({ type: SetOverheadDto })
  @ApiResponse({ status: 201, description: 'Despesa marcada como overhead com sucesso' })
  @ApiResponse({ status: 404, description: 'Despesa não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async setOverhead(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetOverheadDto) {
    try {
      return await this.expensesService.setOverhead(id, dto);
    } catch (error) {
      this.logger.error(`Erro ao marcar despesa ${id} como overhead: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(error.message || 'Erro ao marcar despesa como overhead', error.status ?? HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('expenses/:id/set-overhead')
  @ApiOperation({ summary: 'Remover flag overhead da despesa', description: 'Remove o rateio — a despesa volta para directExpenses da feira original.' })
  @ApiParam({ name: 'id', description: 'ID da despesa' })
  @ApiResponse({ status: 200, description: 'Flag overhead removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Despesa não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async unsetOverhead(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.expensesService.unsetOverhead(id);
    } catch (error) {
      this.logger.error(`Erro ao desmarcar overhead da despesa ${id}: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Erro ao desmarcar overhead', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('expenses/:id/convert-to-overhead')
  @ApiOperation({
    summary: 'Converter despesa direta para overhead (sistema legado)',
    description: 'Move a despesa direta para a tabela overhead_expenses e define o rateio entre feiras.',
  })
  @ApiParam({ name: 'id', description: 'ID da despesa a converter' })
  @ApiBody({ type: ConvertExpenseToOverheadDto })
  @ApiResponse({ status: 201, description: 'Despesa convertida para overhead com sucesso' })
  @ApiResponse({ status: 404, description: 'Despesa não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async convertToOverhead(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ConvertExpenseToOverheadDto) {
    try {
      return await this.overheadExpensesService.convertExpenseToOverhead(id, dto);
    } catch (error) {
      this.logger.error(`Erro ao converter despesa ${id} para overhead: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(error.message || 'Erro ao converter despesa para overhead', error.status ?? HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch('expenses/:id')
  @ApiOperation({ summary: 'Atualizar despesa' })
  @ApiParam({ name: 'id', description: 'ID da despesa' })
  @ApiBody({ type: UpdateExpenseDto })
  @ApiResponse({ status: 200, description: 'Despesa atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Despesa não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateExpenseDto: UpdateExpenseDto) {
    try {
      return await this.expensesService.update(id, updateExpenseDto);
    } catch (error) {
      this.logger.error(`Erro ao atualizar despesa ${id}: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Erro ao atualizar despesa', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('expenses/:id')
  @ApiOperation({ summary: 'Remover despesa' })
  @ApiParam({ name: 'id', description: 'ID da despesa' })
  @ApiResponse({ status: 200, description: 'Despesa removida com sucesso', schema: { example: { message: 'Despesa removida com sucesso' } } })
  @ApiResponse({ status: 404, description: 'Despesa não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    try {
      await this.expensesService.remove(id);
      return { message: 'Despesa removida com sucesso' };
    } catch (error) {
      this.logger.error(`Erro ao remover despesa ${id}: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Erro ao remover despesa', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
