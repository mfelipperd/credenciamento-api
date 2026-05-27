import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OverheadExpensesService } from './overhead-expenses.service';
import { OverheadExpensesController } from './overhead-expenses.controller';
import { OverheadExpense } from './entities/overhead-expense.entity';
import { OverheadExpenseAllocation } from './entities/overhead-expense-allocation.entity';
import { FinanceCategory } from '../common/entities/finance-category.entity';
import { Account } from '../common/entities/account.entity';
import { Fair } from 'src/modules/fairs/entity/fair.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Category } from '../../categories/entity/categories.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OverheadExpense,
      OverheadExpenseAllocation,
      FinanceCategory,
      Account,
      Fair,
      Expense,
      Category,
    ]),
  ],
  controllers: [OverheadExpensesController],
  providers: [OverheadExpensesService],
  exports: [OverheadExpensesService],
})
export class OverheadExpensesModule {}
