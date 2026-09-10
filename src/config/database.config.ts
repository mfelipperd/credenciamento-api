import * as dotenv from 'dotenv';
dotenv.config(); // força leitura caso falhe no Nest

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Visitor } from 'src/modules/visitors/entities/visitor.entity';
import { Fair } from 'src/modules/fairs/entity/fair.entity';
import { Expense } from 'src/modules/finance/expenses/entities/expense.entity';
import { ExpenseFairAllocation } from 'src/modules/finance/expenses/entities/expense-fair-allocation.entity';
import { FinanceCategory } from 'src/modules/finance/common/entities/finance-category.entity';
import { Account } from 'src/modules/finance/common/entities/account.entity';
import { CashFlow } from 'src/modules/finance/cash-flow/entities/cash-flow.entity';
import { Category } from 'src/modules/categories/entity/categories.entity';
import { Partner } from 'src/modules/partners/entities/partner.entity';
import { PartnerWithdrawal } from 'src/modules/partners/entities/partner-withdrawal.entity';
import { FairPartner } from 'src/modules/partners/entities/fair-partner.entity';
import { User } from 'src/modules/users/entitie/users.entity';
import { UserFair } from 'src/modules/users/entities/user-fair.entity';
import { PasswordResetToken } from 'src/modules/users/entities/password-reset-token.entity';
import { StandConfiguration } from 'src/modules/fairs/entity/stand-configuration.entity';
import { OAuthClient } from 'src/modules/mcp/oauth/entities/oauth-client.entity';
import { OAuthAuthorizationCode } from 'src/modules/mcp/oauth/entities/oauth-authorization-code.entity';
import { OAuthRefreshToken } from 'src/modules/mcp/oauth/entities/oauth-refresh-token.entity';
import { EmailCampaignPreview } from 'src/modules/emails/entities/email-campaign-preview.entity';
import { PushSubscription } from 'src/modules/push/entities/push-subscription.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  url: process.env.DATABASE_URL?.trim(),
  autoLoadEntities: true,
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  entities: [
    Visitor,
    Fair,
    Expense,
    ExpenseFairAllocation,
    FinanceCategory,
    Account,
    CashFlow,
    Category,
    Partner,
    PartnerWithdrawal,
    FairPartner,
    User,
    UserFair,
    PasswordResetToken,
    StandConfiguration,
    OAuthClient,
    OAuthAuthorizationCode,
    OAuthRefreshToken,
    EmailCampaignPreview,
    PushSubscription,
  ],
};
