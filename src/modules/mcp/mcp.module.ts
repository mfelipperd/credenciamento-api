import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuthClient } from './oauth/entities/oauth-client.entity';
import { OAuthAuthorizationCode } from './oauth/entities/oauth-authorization-code.entity';
import { OAuthRefreshToken } from './oauth/entities/oauth-refresh-token.entity';
import { WellKnownController } from './oauth/well-known.controller';
import { OAuthController } from './oauth/oauth.controller';
import { OAuthService } from './oauth/oauth.service';
import { McpAuthGuard } from './oauth/mcp-auth.guard';
import { McpController } from './tools/mcp.controller';
import { UsersModule } from '../users/users.module';
import { FairsModule } from '../fairs/fairs.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { VisitorsModule } from '../visitors/visitors.module';
import { CheckInsModule } from '../checkins/checkins.module';
import { EmailsModule } from '../emails/emails.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ChartsModule } from '../finance/charts/charts.module';
import { RevenuesModule } from '../finance/revenues/revenues.module';
import { ExpensesModule } from '../finance/expenses/expenses.module';
import { AuditReportModule } from '../finance/audit-report/audit-report.module';
import { FinanceCommonModule } from '../finance/common/finance-common.module';
import { PartnersModule } from '../partners/partners.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OAuthClient,
      OAuthAuthorizationCode,
      OAuthRefreshToken,
    ]),
    UsersModule,
    FairsModule,
    DashboardModule,
    VisitorsModule,
    CheckInsModule,
    EmailsModule,
    WhatsappModule,
    ChartsModule,
    RevenuesModule,
    ExpensesModule,
    AuditReportModule,
    FinanceCommonModule,
    PartnersModule,
  ],
  controllers: [WellKnownController, OAuthController, McpController],
  providers: [OAuthService, McpAuthGuard],
})
export class McpModule {}
