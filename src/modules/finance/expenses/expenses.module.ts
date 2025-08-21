import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { Expense } from './entities/expense.entity';
import { Fair } from 'src/modules/fairs/entity/fair.entity';
import { FinanceCategory } from '../common/entities/finance-category.entity';
import { Account } from '../common/entities/account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, Fair, FinanceCategory, Account]),
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
