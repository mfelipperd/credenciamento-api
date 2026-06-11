import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappCampaign } from './entities/whatsapp-campaign.entity';

export const WHATSAPP_QUEUE = 'whatsapp-queue';

export interface WhatsappJob {
  phone: string;
  visitorName: string;
  company: string;
  messageTemplate: string;
  campaignTag: string;
  campaignId: string;
}

@Processor(WHATSAPP_QUEUE, { concurrency: 1 })
export class WhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(WhatsappCampaign)
    private readonly campaignRepo: Repository<WhatsappCampaign>,
  ) {
    super();
  }

  async process(job: Job<WhatsappJob>): Promise<void> {
    const { phone, visitorName, company, messageTemplate, campaignId } =
      job.data;

    const message = messageTemplate
      .replace(/\{\{nome\}\}/gi, visitorName)
      .replace(/\{\{empresa\}\}/gi, company);

    try {
      const result = await this.zapiPost('send-text', { phone, message });
      this.logger.log(
        `[Job ${job.id}] Enviado para ${phone} | zaapId: ${result?.zaapId ?? '-'}`,
      );
      await this.campaignRepo.increment({ id: campaignId }, 'totalSent', 1);
    } catch (err) {
      this.logger.error(`[Job ${job.id}] Falha ao enviar para ${phone}: ${String(err)}`);
      await this.campaignRepo.increment({ id: campaignId }, 'totalFailed', 1);
      throw err; // BullMQ vai retentar conforme as opções do job
    }
  }

  private async zapiPost(endpoint: string, body: Record<string, unknown>) {
    const instanceId = this.config.get<string>('ZAPI_INSTANCE_ID');
    const token = this.config.get<string>('ZAPI_TOKEN');
    const clientToken = this.config.get<string>('ZAPI_CLIENT_TOKEN');
    const baseUrl =
      this.config.get<string>('ZAPI_BASE_URL') ??
      'https://api.z-api.io/instances';

    const url = `${baseUrl}/${instanceId}/token/${token}/${endpoint}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-token': clientToken ?? '',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Z-API ${res.status}: ${err}`);
    }

    return res.json() as Promise<{ zaapId?: string }>;
  }
}
