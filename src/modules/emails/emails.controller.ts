import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { SendMarketingEmailDto } from './dto/send-marketing-email.dto';
import { SendMarketingEmailV2Dto } from './dto/send-marketing-email-v2.dto';

@Controller('emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  // ── Transactional ──────────────────────────────────────────────────────────

  @Post('confirmation')
  async sendConfirmationEmail(
    @Body()
    body: {
      visitorEmail: string;
      visitorName: string;
      registrationCode: string;
      fairId: string;
    },
  ) {
    const { visitorEmail, visitorName, registrationCode, fairId } = body;
    return this.emailsService.sendConfirmationEmail(
      visitorEmail,
      visitorName,
      registrationCode,
      fairId,
    );
  }

  @Post('campaign')
  async sendEmailCampaign(
    @Body()
    body: {
      subject: string;
      htmlTemplate: string;
      recipients: Array<{ email: string; name?: string }>;
    },
  ) {
    const { subject, htmlTemplate, recipients } = body;
    await Promise.all(
      recipients.map((r) =>
        this.emailsService.sendTransactionalEmail(
          r.email,
          r.name ?? r.email,
          subject,
          htmlTemplate,
        ),
      ),
    );
    return { success: true, sent: recipients.length };
  }

  // ── Marketing campaigns ────────────────────────────────────────────────────

  @Post('marketing/absent-visitors')
  async sendMarketingToAbsentVisitors(
    @Body() sendMarketingEmailDto: SendMarketingEmailDto,
  ) {
    const { subject, htmlContent, fairId } = sendMarketingEmailDto;
    return this.emailsService.sendMarketingEmailToAbsentVisitors(
      subject,
      htmlContent,
      fairId,
    );
  }

  @Post('marketing/send')
  async sendMarketing(@Body() dto: SendMarketingEmailV2Dto) {
    return this.emailsService.sendMarketingEmail(
      dto.targetFairId,
      dto.templateFairId,
      dto.sendTo,
      dto.subject,
      dto.htmlContent,
      dto.title,
    );
  }

  // ── Campaign stats & history ───────────────────────────────────────────────

  @Get('account-stats')
  async getAccountStats() {
    return this.emailsService.getAccountStats();
  }

  @Get('campaigns')
  async getCampaigns() {
    return this.emailsService.getCampaigns();
  }

  @Get('campaigns/:id/stats')
  async getCampaignStats(@Param('id') id: string) {
    return this.emailsService.getCampaignStats(id);
  }
}
