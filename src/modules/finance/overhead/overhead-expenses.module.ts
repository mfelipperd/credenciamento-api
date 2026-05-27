import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OverheadExpensesService } from './overhead-expenses.service';
import { OverheadExpensesController } from './overhead-expenses.controller';
import { OverheadExpense } from './entities/overhead-expense.entity';
import { OverheadExpenseAllocation } from './entities/overhead-expense-allocation.entity';
import { FinanceCategory } from '../common/entities/finance-category.entity';
import { Account } from '../common/entities/account.entity';
import { Fair } from 'src/modules/fairs/entity/fair.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OverheadExpense,
      OverheadExpenseAllocation,
      FinanceCategory,
      Account,
      Fair,
    ]),
  ],
  controllers: [OverheadExpensesController],
  providers: [OverheadExpensesService],
  exports: [OverheadExpensesService],
})
export class OverheadExpensesModule {}
