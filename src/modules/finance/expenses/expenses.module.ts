import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { Expense } from './entities/expense.entity';
import { ExpenseFairAllocation } from './entities/expense-fair-allocation.entity';
import { Fair } from 'src/modules/fairs/entity/fair.entity';
import { Category } from '../../categories/entity/categories.entity';
import { Account } from '../common/entities/account.entity';
import { OverheadExpensesModule } from '../overhead/overhead-expenses.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Expense,
      ExpenseFairAllocation,
      Fair,
      Category,
      Account,
    ]),
    OverheadExpensesModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
