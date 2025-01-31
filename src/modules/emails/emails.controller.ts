import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
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

  @Post('custom')
  async sendCustomEmails(
    @Body()
    body: {
      registrationCodes: string[];
      subject: string;
      html: string;
    },
  ) {
    if (!body.registrationCodes || !body.registrationCodes.length) {
      throw new BadRequestException(
        'At least one registrationCode is required',
      );
    }

    if (!body.subject || !body.html) {
      throw new BadRequestException(
        'Email subject and HTML content are required',
      );
    }

    return await this.emailsService.sendCustomEmails(
      body.registrationCodes,
      body.subject,
      body.html,
    );
  }
}
