import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { WhatsappCampaign } from './entities/whatsapp-campaign.entity';
import { WhatsappJob, WHATSAPP_QUEUE } from './whatsapp.processor';
import { SendWhatsappCampaignDto } from './dto/send-whatsapp-campaign.dto';
import { Visitor } from '../visitors/entities/visitor.entity';
import { ZapiWebhookEvent } from './dto/zapi-webhook.dto';

// Delays conforme tabela de rate limiting da doc (volume 500–1500 contatos)
const MSG_DELAY_MS = 7_000; // 7s entre cada mensagem
const BATCH_SIZE = 50; // 50 contatos por lote
const BATCH_PAUSE_MS = 15 * 60 * 1_000; // 15 min de pausa entre lotes

const OPT_OUT_KEYWORDS = [
  'sair',
  'parar',
  'cancelar',
  'não quero',
  'nao quero',
  'remover',
  'stop',
];

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(WhatsappCampaign)
    private readonly campaignRepo: Repository<WhatsappCampaign>,
    @InjectRepository(Visitor)
    private readonly visitorsRepo: Repository<Visitor>,
    @InjectQueue(WHATSAPP_QUEUE)
    private readonly whatsappQueue: Queue<WhatsappJob>,
  ) {}

  // ── Z-API helpers ─────────────────────────────────────────────────────────

  private get zapiBase() {
    const base =
      this.config.get<string>('ZAPI_BASE_URL') ??
      'https://api.z-api.io/instances';
    const id = this.config.get<string>('ZAPI_INSTANCE_ID');
    const token = this.config.get<string>('ZAPI_TOKEN');
    return `${base}/${id}/token/${token}`;
  }

  private get clientToken() {
    return this.config.get<string>('ZAPI_CLIENT_TOKEN') ?? '';
  }

  private async zapiGet<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${this.zapiBase}/${endpoint}`, {
      headers: { 'client-token': this.clientToken },
    });
    if (!res.ok) {
      throw new InternalServerErrorException(
        `Z-API GET error ${res.status} em /${endpoint}`,
      );
    }
    return res.json() as Promise<T>;
  }

  // ── Instance status ───────────────────────────────────────────────────────

  async getInstanceStatus(): Promise<{ connected: boolean; value: unknown }> {
    const data = await this.zapiGet<{ connected?: boolean }>('status');
    return { connected: data.connected === true, value: data };
  }

  private async assertInstanceConnected(): Promise<void> {
    const { connected } = await this.getInstanceStatus();
    if (!connected) {
      throw new BadRequestException(
        'Instância Z-API desconectada. Escaneie o QR Code no painel antes de enviar.',
      );
    }
  }

  // ── Phone normalization ───────────────────────────────────────────────────

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (/^55\d{10,11}$/.test(digits)) return digits;
    if (/^\d{10,11}$/.test(digits)) return `55${digits}`;
    return digits; // retorna como está; validação filtra depois
  }

  private isValidPhone(phone: string): boolean {
    return /^55\d{10,11}$/.test(phone);
  }

  // ── Campaign ──────────────────────────────────────────────────────────────

  async sendCampaign(dto: SendWhatsappCampaignDto): Promise<WhatsappCampaign> {
    await this.assertInstanceConnected();

    // Busca destinatários
    const qb = this.visitorsRepo
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .where('fv.fairsId = :fairId', { fairId: dto.targetFairId })
      .andWhere('visitor.whatsappOptOut = false')
      .select(['visitor.registrationCode', 'visitor.name', 'visitor.company', 'visitor.phone']);

    if (dto.sendTo === 'absent') {
      qb.leftJoin(
        'checkins',
        'c',
        'c.visitorRegistrationCode = visitor.registrationCode',
      ).andWhere('c.id IS NULL');
    }

    const visitors = await qb.getMany();

    // Normaliza e filtra telefones válidos
    const recipients = visitors
      .map((v) => ({ ...v, phone: this.normalizePhone(v.phone) }))
      .filter((v) => this.isValidPhone(v.phone));

    const invalidCount = visitors.length - recipients.length;
    if (invalidCount > 0) {
      this.logger.warn(
        `${invalidCount} visitante(s) ignorado(s) por telefone inválido.`,
      );
    }

    if (recipients.length === 0) {
      throw new BadRequestException(
        'Nenhum destinatário válido encontrado para esta campanha.',
      );
    }

    // Persiste a campanha
    const campaignTag = `wzap-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const campaign = await this.campaignRepo.save(
      this.campaignRepo.create({
        title: dto.title,
        targetFairId: dto.targetFairId,
        sendTo: dto.sendTo,
        messageTemplate: dto.message,
        campaignTag,
        totalQueued: recipients.length,
      }),
    );

    // Agenda jobs com delays escalonados para respeitar rate limits anti-ban
    const jobs = recipients.map((visitor, index) => {
      const batchIndex = Math.floor(index / BATCH_SIZE);
      const delay = batchIndex * BATCH_PAUSE_MS + index * MSG_DELAY_MS;

      return {
        name: 'send-whatsapp',
        data: {
          phone: visitor.phone,
          visitorName: visitor.name,
          company: visitor.company ?? '',
          messageTemplate: dto.message,
          campaignTag,
          campaignId: campaign.id,
        } satisfies WhatsappJob,
        opts: {
          delay,
          attempts: 3,
          backoff: { type: 'exponential' as const, delay: 10_000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      };
    });

    await this.whatsappQueue.addBulk(jobs);

    this.logger.log(
      `Campanha "${campaign.title}" enfileirada: ${recipients.length} destinatários, ` +
        `${Math.ceil(recipients.length / BATCH_SIZE)} lotes de ${BATCH_SIZE}.`,
    );

    return campaign;
  }

  // ── Listings ──────────────────────────────────────────────────────────────

  async getCampaigns(): Promise<WhatsappCampaign[]> {
    return this.campaignRepo.find({ order: { createdAt: 'DESC' } });
  }

  // ── Webhook ───────────────────────────────────────────────────────────────

  async handleWebhook(event: ZapiWebhookEvent): Promise<void> {
    const { type, phone, status, zaapId } = event;

    switch (type) {
      case 'message-status':
        this.logger.log(`[Webhook] ${phone} → status: ${status} (${zaapId})`);
        break;

      case 'received-callback': {
        const text = event.text?.message ?? '';
        this.logger.log(`[Webhook] Resposta de ${phone}: "${text}"`);

        if (this.detectOptOut(text)) {
          await this.applyOptOut(phone ?? '');
        }
        break;
      }

      case 'disconnected':
        this.logger.warn('[Webhook] Instância Z-API desconectada!');
        break;

      default:
        this.logger.debug(`[Webhook] Evento ignorado: ${type}`);
    }
  }

  private detectOptOut(message: string): boolean {
    const lower = message.toLowerCase().trim();
    return OPT_OUT_KEYWORDS.some((kw) => lower.includes(kw));
  }

  private async applyOptOut(phone: string): Promise<void> {
    const normalized = this.normalizePhone(phone);
    const result = await this.visitorsRepo
      .createQueryBuilder()
      .update(Visitor)
      .set({ whatsappOptOut: true })
      .where('REPLACE(REPLACE(REPLACE(REPLACE(phone, " ", ""), "-", ""), "(", ""), ")", "") LIKE :phone', {
        phone: `%${normalized.slice(-9)}`,
      })
      .execute();

    this.logger.log(
      `[Opt-Out] ${normalized} — ${result.affected ?? 0} registro(s) atualizado(s).`,
    );
  }
}
