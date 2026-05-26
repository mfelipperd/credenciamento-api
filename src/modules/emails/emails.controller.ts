import { Controller, Post, Body } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { SendMarketingEmailDto } from './dto/send-marketing-email.dto';

@Controller('emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

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

  @Post('marketing/absent-visitors')
  async sendMarketingToAbsentVisitors(
    @Body() sendMarketingEmailDto: SendMarketingEmailDto,
  ) {
    const { subject, htmlContent, fairId } = sendMarketingEmailDto;

    return await this.emailsService.sendMarketingEmailToAbsentVisitors(
      subject,
      htmlContent,
      fairId,
    );
  }
}
