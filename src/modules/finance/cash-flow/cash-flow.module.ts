import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashFlowService } from './cash-flow.service';
import { CashFlowController } from './cash-flow.controller';
import { CashFlow } from './entities/cash-flow.entity';
import { Fair } from 'src/modules/fairs/entity/fair.entity';
import { ExpensesModule } from '../expenses/expenses.module';
import { RevenuesModule } from '../revenues/revenues.module';
import { PartnersModule } from '../../partners/partners.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CashFlow, Fair]),
    ExpensesModule,
    RevenuesModule,
    forwardRef(() => PartnersModule),
  ],
  controllers: [CashFlowController],
  providers: [CashFlowService],
  exports: [CashFlowService],
})
export class CashFlowModule {}
