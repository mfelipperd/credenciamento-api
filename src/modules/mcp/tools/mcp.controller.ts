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
import { registerFairTools } from './fair.tools';
import { registerVisitorTools } from './visitor.tools';
import { registerCheckinTools } from './checkin.tools';
import { registerFinanceTools } from './finance.tools';
import { registerEmailTools } from './email.tools';
import { registerWhatsappTools } from './whatsapp.tools';
import { registerChannelTools } from './channel.tools';
import { registerMarketingInsightsTools } from './marketing-insights.tools';

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

    registerFairTools(server, this.fairsService, this.dashboardService);
    registerVisitorTools(server, this.visitorsService, req.user);
    registerCheckinTools(server, this.checkInsService);
    registerFinanceTools(server, this.chartsService, this.revenueChartsService);
    registerEmailTools(server, this.emailsService);
    registerWhatsappTools(server, this.whatsappService);
    registerChannelTools(server, this.dashboardService, this.expensesService);
    registerMarketingInsightsTools(
      server,
      this.fairsService,
      this.dashboardService,
      this.expensesService,
      this.chartsService,
      this.revenueChartsService,
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
