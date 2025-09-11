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

@Controller('expenses')
export class ExpensesController {
  private readonly logger = new Logger(ExpensesController.name);

  constructor(private readonly expensesService: ExpensesService) {}

  @Post('fairs/:fairId/expenses')
  async create(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    try {
      // Garantir que o fairId do DTO seja o mesmo da URL
      createExpenseDto.fairId = fairId;

      // Validar se os dados obrigatórios estão presentes
      if (!createExpenseDto.categoryId || !createExpenseDto.accountId) {
        throw new HttpException(
          'categoryId e accountId são obrigatórios',
          HttpStatus.BAD_REQUEST,
        );
      }

      const expense = await this.expensesService.create(createExpenseDto);
      return expense;
    } catch (error) {
      this.logger.error(`Erro ao criar despesa: ${error.message}`, error.stack);

      if (error instanceof HttpException) {
        throw error;
      }

      // Tratar erros específicos do banco de dados
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

  @Get('fairs/:fairId/expenses')
  async findAllByFair(@Param('fairId', ParseUUIDPipe) fairId: string) {
    try {
      return await this.expensesService.findAllByFair(fairId);
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

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.expensesService.findOne(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Erro ao buscar despesa ${id}: ${error.message}`);
      throw new HttpException(
        'Erro ao buscar despesa',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    try {
      return await this.expensesService.update(id, updateExpenseDto);
    } catch (error) {
      this.logger.error(`Erro ao atualizar despesa ${id}: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Erro ao atualizar despesa',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    try {
      await this.expensesService.remove(id);
      return { message: 'Despesa removida com sucesso' };
    } catch (error) {
      this.logger.error(`Erro ao remover despesa ${id}: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Erro ao remover despesa',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Endpoints de relatórios
  @Get('fairs/:fairId/expenses/total')
  async getTotalByFair(@Param('fairId', ParseUUIDPipe) fairId: string) {
    try {
      return await this.expensesService.getTotalByFair(fairId);
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
