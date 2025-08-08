import { Module } from '@nestjs/common';
import { ClientsModule } from './clients/clients.module';
import { EntryModelsModule } from './entry-models/entry-models.module';
import { RevenuesModule } from './revenues/revenues.module';

@Module({
  imports: [ClientsModule, EntryModelsModule, RevenuesModule]
})
export class FinanceModule {}
