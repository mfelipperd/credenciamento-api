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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { OverheadExpensesService } from '../overhead/overhead-expenses.service';
import { ConvertExpenseToOverheadDto } from '../overhead/dto/overhead-expense.dto';

@Controller()
export class ExpensesController {
  private readonly logger = new Logger(ExpensesController.name);

  constructor(
    private readonly expensesService: ExpensesService,
    private readonly overheadExpensesService: OverheadExpensesService,
  ) {}

  @Post('fairs/:fairId/expenses')
  async create(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    try {
      createExpenseDto.fairId = fairId;

      if (!createExpenseDto.categoryId || !createExpenseDto.accountId) {
        throw new HttpException(
          'categoryId e accountId são obrigatórios',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.expensesService.create(createExpenseDto);
    } catch (error) {
      this.logger.error(`Erro ao criar despesa: ${error.message}`, error.stack);

      if (error instanceof HttpException) throw error;

      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new HttpException(
          'Categoria ou conta bancária não encontrada',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (error.code === 'ER_DUP_ENTRY') {
        throw new HttpException('Despesa duplicada', HttpStatus.CONFLICT);
      }

      throw new HttpException(
        'Erro interno ao criar despesa',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /fairs/:fairId/expenses
   *
   * Retorna objeto combinado com:
   *   - directExpenses   → despesas diretas desta feira
   *   - allocatedOverhead → parcela do overhead alocada a esta feira
   *   - summary          → totais calculados
   */
  @Get('fairs/:fairId/expenses')
  async findAllByFair(@Param('fairId', ParseUUIDPipe) fairId: string) {
    try {
      const [directExpenses, allocatedOverhead] = await Promise.all([
        this.expensesService.findAllByFair(fairId),
        this.overheadExpensesService.findAllocatedForFair(fairId),
      ]);

      const totalDireto = directExpenses.reduce(
        (sum, e) => sum + Number(e.valor),
        0,
      );
      const totalRateado = allocatedOverhead.reduce(
        (sum, e) => sum + e.valorAlocado,
        0,
      );

      return {
        directExpenses,
        allocatedOverhead,
        summary: {
          totalDireto: Math.round(totalDireto * 100) / 100,
          totalRateado: Math.round(totalRateado * 100) / 100,
          totalGeral: Math.round((totalDireto + totalRateado) * 100) / 100,
        },
      };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar despesas da feira ${fairId}: ${error.message}`,
      );
      throw new HttpException(
        'Erro ao buscar despesas da feira',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('expenses/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.expensesService.findOne(id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Erro ao buscar despesa ${id}: ${error.message}`);
      throw new HttpException(
        'Erro ao buscar despesa',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /expenses/:id/convert-to-overhead
   *
   * Converte uma despesa direta em overhead expense (com rateio entre feiras).
   * A despesa original é removida atomicamente após a criação do overhead.
   *
   * Body: { financeCategoryId?: string, fairs: [{ fairId, percentual? }] }
   */
  @Post('expenses/:id/convert-to-overhead')
  async convertToOverhead(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertExpenseToOverheadDto,
  ) {
    try {
      return await this.overheadExpensesService.convertExpenseToOverhead(id, dto);
    } catch (error) {
      this.logger.error(
        `Erro ao converter despesa ${id} para overhead: ${error.message}`,
      );
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Erro ao converter despesa para overhead',
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('expenses/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    try {
      return await this.expensesService.update(id, updateExpenseDto);
    } catch (error) {
      this.logger.error(`Erro ao atualizar despesa ${id}: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Erro ao atualizar despesa',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('expenses/:id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    try {
      await this.expensesService.remove(id);
      return { message: 'Despesa removida com sucesso' };
    } catch (error) {
      this.logger.error(`Erro ao remover despesa ${id}: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Erro ao remover despesa',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ── Relatórios ──────────────────────────────────────────────────────────────

  /**
   * GET /fairs/:fairId/expenses/total
   * Retorna totais separados (direto, rateado, geral) para uso em dashboards.
   */
  @Get('fairs/:fairId/expenses/total')
  async getTotalByFair(@Param('fairId', ParseUUIDPipe) fairId: string) {
    try {
      const [totalDireto, totalRateado] = await Promise.all([
        this.expensesService.getTotalByFair(fairId),
        this.overheadExpensesService.getTotalAllocatedForFair(fairId),
      ]);

      return {
        totalDireto: Math.round(totalDireto * 100) / 100,
        totalRateado: Math.round(totalRateado * 100) / 100,
        totalGeral: Math.round((totalDireto + totalRateado) * 100) / 100,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar total de despesas da feira ${fairId}: ${error.message}`,
      );
      throw new HttpException(
        'Erro ao buscar total de despesas',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('fairs/:fairId/expenses/total-by-category')
  async getTotalByCategory(@Param('fairId', ParseUUIDPipe) fairId: string) {
    try {
      return await this.expensesService.getTotalByCategory(fairId);
    } catch (error) {
      this.logger.error(
        `Erro ao buscar total por categoria da feira ${fairId}: ${error.message}`,
      );
      throw new HttpException(
        'Erro ao buscar total por categoria',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('fairs/:fairId/expenses/total-by-account')
  async getTotalByAccount(@Param('fairId', ParseUUIDPipe) fairId: string) {
    try {
      return await this.expensesService.getTotalByAccount(fairId);
    } catch (error) {
      this.logger.error(
        `Erro ao buscar total por conta da feira ${fairId}: ${error.message}`,
      );
      throw new HttpException(
        'Erro ao buscar total por conta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
