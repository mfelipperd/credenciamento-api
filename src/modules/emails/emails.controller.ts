import { Controller, Post, Body } from '@nestjs/common';
import { EmailsService } from './emails.service';

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
      recipients: string[];
      fairId: string;
    },
  ) {
    const { subject, htmlTemplate, recipients, fairId } = body;

    for (const recipient of recipients) {
      await this.emailsService.sendConfirmationEmail(
        recipient,
        subject,
        htmlTemplate,
        fairId,
      );
    }

    return { success: true, message: 'Campaign emails sent successfully' };
  }
}
