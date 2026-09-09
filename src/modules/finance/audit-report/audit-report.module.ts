import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditReportService } from './audit-report.service';
import { AuditReportController } from './audit-report.controller';
import { Fair } from 'src/modules/fairs/entity/fair.entity';
import { FairPartner } from 'src/modules/partners/entities/fair-partner.entity';
import { Partner } from 'src/modules/partners/entities/partner.entity';
import { RevenuesModule } from '../revenues/revenues.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { OverheadExpensesModule } from '../overhead/overhead-expenses.module';
import { CashFlowModule } from '../cash-flow/cash-flow.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Fair, FairPartner, Partner]),
    RevenuesModule,
    ExpensesModule,
    OverheadExpensesModule,
    CashFlowModule,
  ],
  controllers: [AuditReportController],
  providers: [AuditReportService],
  exports: [AuditReportService],
})
export class AuditReportModule {}
