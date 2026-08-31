import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PushSubscription } from './entities/push-subscription.entity';
import { SubscribePushDto } from './dto/subscribe-push.dto';

const DEFAULT_URL = 'https://www.expomultimix.com.br';

// Endpoint rejected by the browser's push service — the subscription is dead
// (uninstalled, cleared site data) and will never succeed again.
const EXPIRED_SUBSCRIPTION_STATUS_CODES = [404, 410];

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private vapidConfigured = false;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepo: Repository<PushSubscription>,
  ) {}

  private ensureVapidConfigured(): void {
    if (this.vapidConfigured) {
      return;
    }

    const subject = this.config.get<string>('VAPID_SUBJECT');
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');

    if (!subject || !publicKey || !privateKey) {
      throw new InternalServerErrorException(
        'Chaves VAPID não configuradas (VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY).',
      );
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.vapidConfigured = true;
  }

  async subscribe(dto: SubscribePushDto): Promise<PushSubscription> {
    if (!dto.endpoint || !dto.keys?.p256dh || !dto.keys?.auth) {
      throw new BadRequestException('Subscription inválida');
    }

    const existing = await this.subscriptionRepo.findOne({
      where: { endpoint: dto.endpoint },
    });
    if (existing) {
      return existing;
    }

    const subscription = this.subscriptionRepo.create({
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
    });
    return this.subscriptionRepo.save(subscription);
  }

  async send(
    title: string,
    body: string,
    url?: string,
  ): Promise<{ sent: number; failed: number }> {
    this.ensureVapidConfigured();

    const subscriptions = await this.subscriptionRepo.find();
    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const payload = JSON.stringify({ title, body, url: url ?? DEFAULT_URL });
    const expiredIds: string[] = [];
    let sent = 0;
    let failed = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
          sent++;
        } catch (error) {
          failed++;
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (
            statusCode &&
            EXPIRED_SUBSCRIPTION_STATUS_CODES.includes(statusCode)
          ) {
            expiredIds.push(sub.id);
          } else {
            this.logger.warn(
              `Falha ao enviar push para ${sub.endpoint}: ${(error as Error).message}`,
            );
          }
        }
      }),
    );

    if (expiredIds.length > 0) {
      await this.subscriptionRepo.delete(expiredIds);
      this.logger.log(
        `Removidas ${expiredIds.length} subscriptions expiradas.`,
      );
    }

    return { sent, failed };
  }
}
