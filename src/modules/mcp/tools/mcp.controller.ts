import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { IsPublicRoute } from 'src/auth/public.route';
import { McpAuthGuard, McpRequestUser } from '../oauth/mcp-auth.guard';
import { FairsService } from 'src/modules/fairs/fairs.service';
import { DashboardService } from 'src/modules/dashboard/dashboard.service';
import { VisitorsService } from 'src/modules/visitors/visitors.service';
import { CheckInsService } from 'src/modules/checkins/checkins.service';
import { EmailsService } from 'src/modules/emails/emails.service';
import { WhatsappService } from 'src/modules/whatsapp/whatsapp.service';
import { ChartsService } from 'src/modules/finance/charts/charts.service';
import { RevenueChartsService } from 'src/modules/finance/revenues/revenue-charts.service';
import { ExpensesService } from 'src/modules/finance/expenses/expenses.service';
import { AuditReportService } from 'src/modules/finance/audit-report/audit-report.service';
import { FinanceCategoriesService } from 'src/modules/finance/common/services/finance-categories.service';
import { AccountsService } from 'src/modules/finance/common/services/accounts.service';
import { registerFairTools } from './fair.tools';
import { registerVisitorTools } from './visitor.tools';
import { registerCheckinTools } from './checkin.tools';
import { registerFinanceTools } from './finance.tools';
import { registerEmailTools } from './email.tools';
import { registerWhatsappTools } from './whatsapp.tools';
import { registerChannelTools } from './channel.tools';
import { registerMarketingInsightsTools } from './marketing-insights.tools';
import { registerExhibitorReportTools } from './exhibitor-report.tools';
import { registerAuditTools } from './audit.tools';
import { registerExpenseTools } from './expense.tools';

@ApiExcludeController()
@Controller('mcp')
export class McpController {
  constructor(
    private readonly fairsService: FairsService,
    private readonly dashboardService: DashboardService,
    private readonly visitorsService: VisitorsService,
    private readonly checkInsService: CheckInsService,
    private readonly emailsService: EmailsService,
    private readonly whatsappService: WhatsappService,
    private readonly chartsService: ChartsService,
    private readonly revenueChartsService: RevenueChartsService,
    private readonly expensesService: ExpensesService,
    private readonly auditReportService: AuditReportService,
    private readonly financeCategoriesService: FinanceCategoriesService,
    private readonly accountsService: AccountsService,
  ) {}

  @IsPublicRoute()
  @UseGuards(McpAuthGuard)
  @All()
  async handleMcpRequest(
    @Req() req: Request & { user: McpRequestUser },
    @Res() res: Response,
  ) {
    const server = new McpServer({
      name: 'credenciamento-api',
      version: '1.0.0',
    });

    registerFairTools(server, this.fairsService, this.dashboardService, req.user);
    registerVisitorTools(server, this.visitorsService, req.user);
    registerCheckinTools(server, this.checkInsService, req.user);
    registerFinanceTools(server, this.chartsService, this.revenueChartsService, req.user);
    registerEmailTools(server, this.emailsService, req.user);
    registerWhatsappTools(server, this.whatsappService);
    registerChannelTools(server, this.dashboardService, this.expensesService, req.user);
    registerMarketingInsightsTools(
      server,
      this.fairsService,
      this.dashboardService,
      this.expensesService,
      this.chartsService,
      this.revenueChartsService,
      req.user,
    );
    registerExhibitorReportTools(
      server,
      this.fairsService,
      this.dashboardService,
      this.checkInsService,
      this.expensesService,
      this.chartsService,
      this.revenueChartsService,
      req.user,
    );
    registerAuditTools(server, this.auditReportService, req.user);
    registerExpenseTools(
      server,
      this.expensesService,
      this.financeCategoriesService,
      this.accountsService,
      req.user,
    );

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }
}
