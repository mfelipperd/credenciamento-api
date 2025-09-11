import * as dotenv from 'dotenv';
dotenv.config(); // força leitura caso falhe no Nest

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Visitor } from 'src/modules/visitors/entities/visitor.entity';
import { Fair } from 'src/modules/fairs/entity/fair.entity';
import { Expense } from 'src/modules/finance/expenses/entities/expense.entity';
import { FinanceCategory } from 'src/modules/finance/common/entities/finance-category.entity';
import { Account } from 'src/modules/finance/common/entities/account.entity';
import { CashFlow } from 'src/modules/finance/cash-flow/entities/cash-flow.entity';
import { Category } from 'src/modules/categories/entity/categories.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  url: process.env.DATABASE_URL?.trim(),
  autoLoadEntities: true,
  synchronize: true,
  entities: [Visitor, Fair, Expense, FinanceCategory, Account, CashFlow, Category],
};
