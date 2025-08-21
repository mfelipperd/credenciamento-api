import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceCategoriesService } from './services/finance-categories.service';
import { FinanceCategoriesController } from './controllers/finance-categories.controller';
import { AccountsService } from './services/accounts.service';
import { AccountsController } from './controllers/accounts.controller';
import { FinanceCategory } from './entities/finance-category.entity';
import { Account } from './entities/account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FinanceCategory, Account])],
  controllers: [FinanceCategoriesController, AccountsController],
  providers: [FinanceCategoriesService, AccountsService],
  exports: [FinanceCategoriesService, AccountsService],
})
export class FinanceCommonModule {}
