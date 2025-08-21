import { Module } from '@nestjs/common';
import { ClientsModule } from './clients/clients.module';
import { EntryModelsModule } from './entry-models/entry-models.module';
import { RevenuesModule } from './revenues/revenues.module';
import { StandsModule } from './stands/stands.module';
import { ExpensesModule } from './expenses/expenses.module';
import { FinanceCommonModule } from './common/finance-common.module';
import { CashFlowModule } from './cash-flow/cash-flow.module';

@Module({
  imports: [
    ClientsModule,
    EntryModelsModule,
    RevenuesModule,
    StandsModule,
    ExpensesModule,
    FinanceCommonModule,
    CashFlowModule,
  ],
})
export class FinanceModule {}
