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
    },
  ) {
    const { visitorEmail, visitorName, registrationCode } = body;

    return this.emailsService.sendEmail(
      visitorEmail,
      visitorName,
      registrationCode,
    );
  }

  @Post('campaign')
  async sendEmailCampaign(
    @Body()
    body: {
      subject: string;
      htmlTemplate: string;
      recipients: string[];
    },
  ) {
    const { subject, htmlTemplate, recipients } = body;

    for (const recipient of recipients) {
      await this.emailsService.sendEmail(recipient, subject, htmlTemplate);
    }

    return { success: true, message: 'Campaign emails sent successfully' };
  }
}
