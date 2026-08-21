import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChartsService } from './charts.service';
import { ChartsController } from './charts.controller';
import { Revenue } from '../revenues/entities/revenue.entity';
import { RevenueInstallment } from '../revenues/entities/revenue-installment.entity';
import { Visitor } from '../../visitors/entities/visitor.entity';
import { CheckIn } from '../../checkins/entity/checkins.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Fair } from '../../fairs/entity/fair.entity';
import { Stand } from '../stands/entities/stand.entity';
import { ExpensesModule } from '../expenses/expenses.module';
import { OverheadExpensesModule } from '../overhead/overhead-expenses.module';
import { CashFlowModule } from '../cash-flow/cash-flow.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Revenue,
      RevenueInstallment,
      Visitor,
      CheckIn,
      Expense,
      Fair,
      Stand,
    ]),
    ExpensesModule,
    OverheadExpensesModule,
    CashFlowModule,
  ],
  controllers: [ChartsController],
  providers: [ChartsService],
  exports: [ChartsService],
})
export class ChartsModule {}
