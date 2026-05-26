import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { BrevoClient } from '@getbrevo/brevo';
import { EMAIL_QUEUE, MarketingEmailJob } from './emails.service';

@Processor(EMAIL_QUEUE, { concurrency: 5 })
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly brevo: BrevoClient;

  constructor(private readonly config: ConfigService) {
    super();
    this.brevo = new BrevoClient({
      apiKey: this.config.get<string>('BREVO_API_KEY') ?? '',
    });
  }

  async process(job: Job<MarketingEmailJob>): Promise<void> {
    const { to, name, subject, htmlContent } = job.data;

    await this.brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: this.config.get<string>('BREVO_SENDER_NAME') ?? 'Credenciamento',
        email: this.config.get<string>('BREVO_SENDER_EMAIL') ?? '',
      },
      to: [{ email: to, name }],
      subject,
      htmlContent,
    });

    this.logger.log(`[Job ${job.id}] Email enviado para ${to}`);
  }
}
