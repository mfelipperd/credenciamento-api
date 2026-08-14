import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BrevoClient } from '@getbrevo/brevo';
import { randomUUID } from 'crypto';
import { FairsService } from '../fairs/fairs.service';
import { Visitor } from '../visitors/entities/visitor.entity';
import { EmailCampaign } from './entities/email-campaign.entity';
import { generateConfirmationEmail } from 'src/utils/emailLayoutGenerator';

export const EMAIL_QUEUE = 'email-queue';

export interface MarketingEmailJob {
  to: string;
  name: string;
  subject: string;
  htmlContent: string;
  campaignTag?: string;
}

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  private readonly brevo: BrevoClient;

  constructor(
    private readonly config: ConfigService,
    private readonly fairsService: FairsService,
    @InjectRepository(Visitor)
    private readonly visitorsRepository: Repository<Visitor>,
    @InjectRepository(EmailCampaign)
    private readonly campaignRepository: Repository<EmailCampaign>,
    @InjectQueue(EMAIL_QUEUE)
    private readonly emailQueue: Queue<MarketingEmailJob>,
  ) {
    this.brevo = new BrevoClient({
      apiKey: this.config.get<string>('BREVO_API_KEY') ?? '',
    });
  }

  private get senderEmail() {
    return this.config.get<string>('BREVO_SENDER_EMAIL') ?? '';
  }

  private get senderName() {
    return this.config.get<string>('BREVO_SENDER_NAME') ?? 'Credenciamento';
  }

  private get brevoApiKey() {
    return this.config.get<string>('BREVO_API_KEY') ?? '';
  }

  // ── Brevo REST helpers ────────────────────────────────────────────────────

  private async brevoGet<T>(path: string): Promise<T> {
    const res = await fetch(`https://api.brevo.com/v3${path}`, {
      headers: { 'api-key': this.brevoApiKey, accept: 'application/json' },
    });
    if (!res.ok)
      throw new InternalServerErrorException(`Brevo API error: ${res.status}`);
    return res.json() as Promise<T>;
  }

  // Fetches all transactional blocked/suppressed emails from Brevo (hard bounces, spam, unsubscribes)
  private async getBrevoBlockedEmails(): Promise<Set<string>> {
    const blocked = new Set<string>();
    const limit = 100;
    let offset = 0;

    // Cap at 2000 to avoid excessive API calls on very large suppression lists
    while (offset < 2000) {
      const result = await this.brevoGet<any>(
        `/smtp/blockedContacts?limit=${limit}&offset=${offset}`,
      );
      const contacts: any[] = result.contacts ?? [];
      contacts.forEach((c) => blocked.add((c.email as string).toLowerCase()));

      if (contacts.length < limit) break;
      offset += limit;
    }

    return blocked;
  }

  // ── Account & global stats ────────────────────────────────────────────────

  async getAccountStats() {
    const [account, report, blockedResult, dailyData] = await Promise.all([
      this.brevoGet<any>('/account'),
      this.brevoGet<any>('/smtp/statistics/aggregatedReport?days=30'),
      this.brevoGet<any>('/smtp/blockedContacts?limit=1'),
      this.brevoGet<any>('/smtp/statistics/reports?days=30'),
    ]);

    const plan =
      account.plan?.find((p: any) => p.creditsType === 'sendLimit') ?? {};
    const vertical = account.planVerticals?.[0] ?? {};

    const delivered30 = report.delivered ?? 0;
    const opens30 = report.opens ?? 0;

    // Day-of-week open rate analysis from the last 30 days of daily reports
    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const byDay: Record<number, { opens: number; delivered: number }> = {};
    for (const r of (dailyData.reports ?? []) as any[]) {
      const idx = new Date(r.date as string).getDay();
      if (!byDay[idx]) byDay[idx] = { opens: 0, delivered: 0 };
      byDay[idx].opens += r.opens ?? 0;
      byDay[idx].delivered += r.delivered ?? 0;
    }
    const dayBreakdown = Object.entries(byDay)
      .map(([idx, data]) => ({
        day: dayLabels[Number(idx)],
        openRate:
          data.delivered > 0
            ? +((data.opens / data.delivered) * 100).toFixed(1)
            : 0,
      }))
      .sort((a, b) => b.openRate - a.openRate);

    return {
      plan: {
        name: vertical.name ?? 'Free',
        status: vertical.status ?? 'active',
        periodStart: plan.startDate ?? null,
        periodEnd: plan.endDate ?? null,
      },
      credits: {
        total: plan.credits ?? 0,
        remaining: plan.credits ?? 0,
        used: 0,
      },
      last30Days: {
        sent: report.requests ?? 0,
        delivered: delivered30,
        deliveryRate: report.requests
          ? +((delivered30 / report.requests) * 100).toFixed(1)
          : 0,
        opens: opens30,
        uniqueOpens: report.uniqueOpens ?? 0,
        openRate: delivered30 ? +((opens30 / delivered30) * 100).toFixed(1) : 0,
        clicks: report.clickers ?? 0,
        uniqueClicks: report.uniqueClickers ?? 0,
        bounced: (report.hardBounces ?? 0) + (report.softBounces ?? 0),
        spam: report.spamReports ?? 0,
        unsubscribed: report.unsubscribed ?? 0,
      },
      suppressedContacts: {
        total: blockedResult.count ?? 0,
        note: 'Endereços bloqueados (bounce, spam, descadastro) — excluídos automaticamente dos próximos disparos',
      },
      sendingInsights: {
        bestDaysToSend: dayBreakdown.slice(0, 3).map((d) => d.day),
        dayBreakdown,
        note: 'Ranking baseado na taxa de abertura dos últimos 30 dias. A Brevo não expõe dados por hora via API transacional; boas práticas indicam disparos entre 09h–12h.',
      },
    };
  }

  // ── Campaign CRUD & stats ─────────────────────────────────────────────────

  async getCampaigns() {
    const campaigns = await this.campaignRepository.find({
      order: { sentAt: 'DESC' },
      select: [
        'id',
        'title',
        'subject',
        'targetFairId',
        'templateFairId',
        'sendTo',
        'totalQueued',
        'suppressedCount',
        'brevoTag',
        'sentAt',
      ],
    });
    return campaigns;
  }

  async getCampaignStats(id: string) {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');

    const report = await this.brevoGet<any>(
      `/smtp/statistics/aggregatedReport?tag=${encodeURIComponent(campaign.brevoTag)}`,
    );

    const queued = campaign.totalQueued;
    const delivered = report.delivered ?? 0;
    const opens = report.opens ?? 0;
    const clicked = report.clickers ?? 0;

    return {
      campaign: {
        id: campaign.id,
        title: campaign.title,
        subject: campaign.subject,
        targetFairId: campaign.targetFairId,
        templateFairId: campaign.templateFairId,
        sendTo: campaign.sendTo,
        totalQueued: queued,
        suppressedByBrevo: campaign.suppressedCount,
        totalRecipients: queued + campaign.suppressedCount,
        brevoTag: campaign.brevoTag,
        sentAt: campaign.sentAt,
      },
      delivery: {
        queued,
        delivered,
        deliveryRate: queued ? +((delivered / queued) * 100).toFixed(1) : 0,
        hardBounces: report.hardBounces ?? 0,
        softBounces: report.softBounces ?? 0,
        blocked: report.blocked ?? 0,
        spam: report.spamReports ?? 0,
        invalid: report.invalid ?? 0,
      },
      engagement: {
        opens,
        uniqueOpens: report.uniqueOpens ?? 0,
        openRate: delivered ? +((opens / delivered) * 100).toFixed(1) : 0,
        clicks: clicked,
        uniqueClicks: report.uniqueClickers ?? 0,
        clickRate: delivered ? +((clicked / delivered) * 100).toFixed(1) : 0,
        unsubscribed: report.unsubscribed ?? 0,
      },
    };
  }

  // ── Confirmation email ────────────────────────────────────────────────────

  async sendConfirmationEmail(
    to: string,
    visitorName: string,
    registrationCode: string,
    fairId: string,
  ) {
    const fair = await this.fairsService.findOne(fairId);
    if (!fair) {
      throw new BadRequestException('Dados da feira não encontrados.');
    }

    const baseDate = fair.startDate ?? fair.startDateTime ?? null;
    const start = baseDate ? new Date(baseDate) : null;
    const end = baseDate ? new Date(baseDate) : null;
    if (start) start.setHours(9, 0, 0, 0);
    if (end) end.setHours(18, 0, 0, 0);

    const qrData =
      'https://credenciamento-frontend.vercel.app/visitor/checkin' +
      registrationCode;

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

    const html = generateConfirmationEmail(
      visitorName,
      registrationCode,
      qrImageUrl,
      fair.name,
      start?.toISOString() ?? '',
      end?.toISOString() ?? '',
      fair.location,
      undefined,
      {
        googleMapsUrl: fair.googleMapsUrl ?? undefined,
        latitude: fair.latitude ? Number(fair.latitude) : undefined,
        longitude: fair.longitude ? Number(fair.longitude) : undefined,
        venueName: fair.venueName ?? undefined,
        address:
          [fair.address, fair.number, fair.neighborhood, fair.city, fair.state]
            .filter(Boolean)
            .join(', ') || fair.location,
      },
    );

    try {
      await this.brevo.transactionalEmails.sendTransacEmail({
        sender: { name: this.senderName, email: this.senderEmail },
        to: [{ email: to, name: visitorName }],
        subject: `Sua vaga está confirmada! Veja seu QR Code de acesso 🎉`,
        htmlContent: html,
      });
      this.logger.log(`Email de confirmação enviado para ${to}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar email de confirmação para ${to}`, err);
      throw new InternalServerErrorException(
        'Falha ao enviar e-mail de confirmação',
      );
    }
  }

  // ── Marketing: absent visitors (legacy) ──────────────────────────────────

  async sendMarketingEmailToAbsentVisitors(
    subject: string,
    htmlContent: string,
    fairId: string,
  ) {
    const fair = await this.fairsService.findOne(fairId);
    if (!fair) {
      throw new BadRequestException('Feira não encontrada.');
    }

    const absentVisitors = await this.visitorsRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .leftJoin(
        'checkins',
        'c',
        'c.visitorRegistrationCode = visitor.registrationCode',
      )
      .where('fv.fairsId = :fairId', { fairId })
      .andWhere('c.id IS NULL')
      .select([
        'visitor.registrationCode',
        'visitor.name',
        'visitor.email',
        'visitor.company',
      ])
      .getMany();

    if (absentVisitors.length === 0) {
      return {
        success: true,
        message: 'Nenhum visitante ausente encontrado para esta feira',
        fairId,
        totalAbsent: 0,
      };
    }

    const blockedEmails = await this.getBrevoBlockedEmails();
    const filtered = absentVisitors.filter(
      (v) => !blockedEmails.has(v.email.toLowerCase()),
    );
    const suppressedCount = absentVisitors.length - filtered.length;

    if (suppressedCount > 0) {
      this.logger.log(
        `${suppressedCount} destinatário(s) suprimidos (bounce/spam/descadastro) na feira ${fair.name}`,
      );
    }

    if (filtered.length === 0) {
      return {
        success: true,
        message: 'Todos os destinatários estão na lista de supressão da Brevo',
        fairId,
        totalAbsent: absentVisitors.length,
        suppressedByBrevo: suppressedCount,
        totalQueued: 0,
        status: 'SUPPRESSED',
      };
    }

    const jobs = filtered.map((visitor) => ({
      name: 'send-marketing-email',
      data: {
        to: visitor.email,
        name: visitor.name,
        subject,
        htmlContent,
      } satisfies MarketingEmailJob,
      opts: {
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }));

    await this.emailQueue.addBulk(jobs);

    this.logger.log(
      `${filtered.length} emails enfileirados para a feira ${fair.name}`,
    );

    return {
      success: true,
      message: `${filtered.length} email(s) enfileirados para envio`,
      fairId,
      totalAbsent: absentVisitors.length,
      suppressedByBrevo: suppressedCount,
      totalQueued: filtered.length,
      absentVisitors: filtered.map((v) => ({
        name: v.name,
        email: v.email,
        company: v.company,
      })),
      status: 'QUEUED',
    };
  }

  // ── Marketing: send campaign ──────────────────────────────────────────────

  async sendMarketingEmail(
    targetFairId: string,
    templateFairId: string,
    sendTo: 'all' | 'absent',
    subject: string,
    htmlContent: string,
    title: string,
    additionalFairIds: string[] = [],
  ) {
    const [targetFair, templateFair] = await Promise.all([
      this.fairsService.findOne(targetFairId),
      this.fairsService.findOne(templateFairId),
    ]);

    if (!targetFair)
      throw new BadRequestException('Feira destino não encontrada.');
    if (!templateFair)
      throw new BadRequestException('Feira template não encontrada.');

    const fairIds = [targetFairId, ...additionalFairIds];

    const qb = this.visitorsRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .where('fv.fairsId IN (:...fairIds)', { fairIds })
      .select('visitor.email', 'email')
      .addSelect('MAX(visitor.name)', 'name')
      .groupBy('visitor.email');

    if (sendTo === 'absent') {
      qb.leftJoin(
        'checkins',
        'c',
        'c.visitorRegistrationCode = visitor.registrationCode',
      ).andWhere('c.id IS NULL');
    }

    const recipients = await qb.getRawMany<{ email: string; name: string }>();

    if (recipients.length === 0) {
      return {
        success: true,
        message: 'Nenhum destinatário encontrado para os critérios informados',
        targetFairId,
        templateFairId,
        sendTo,
        totalRecipients: 0,
        suppressedByBrevo: 0,
        totalQueued: 0,
        status: 'QUEUED',
      };
    }

    const blockedEmails = await this.getBrevoBlockedEmails();
    const filtered = recipients.filter(
      (v) => !blockedEmails.has(v.email.toLowerCase()),
    );
    const suppressedCount = recipients.length - filtered.length;

    if (suppressedCount > 0) {
      this.logger.log(
        `[CAMPAIGN] ${suppressedCount} destinatário(s) suprimidos (bounce/spam/descadastro)`,
      );
    }

    if (filtered.length === 0) {
      return {
        success: true,
        message: 'Todos os destinatários estão na lista de supressão da Brevo',
        targetFairId,
        templateFairId,
        sendTo,
        totalRecipients: recipients.length,
        suppressedByBrevo: suppressedCount,
        totalQueued: 0,
        status: 'SUPPRESSED',
      };
    }

    // Persistir campanha antes de enfileirar
    const brevoTag = `emm-${randomUUID().replace(/-/g, '').substring(0, 12)}`;
    const campaign = this.campaignRepository.create({
      title,
      subject,
      htmlContent,
      targetFairId,
      templateFairId,
      sendTo,
      totalQueued: filtered.length,
      suppressedCount,
      brevoTag,
    });
    const savedCampaign = await this.campaignRepository.save(campaign);

    const jobs = filtered.map((visitor) => ({
      name: 'send-marketing-email',
      data: {
        to: visitor.email,
        name: visitor.name,
        subject,
        htmlContent,
        campaignTag: brevoTag,
      } satisfies MarketingEmailJob,
      opts: {
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }));

    await this.emailQueue.addBulk(jobs);

    this.logger.log(
      `[CAMPAIGN ${savedCampaign.id}] ${filtered.length} emails enfileirados — target: ${targetFair.name}, template: ${templateFair.name}`,
    );

    return {
      success: true,
      message: `${filtered.length} email(s) enfileirados para envio`,
      campaignId: savedCampaign.id,
      brevoTag,
      targetFairId,
      templateFairId,
      sendTo,
      totalRecipients: recipients.length,
      suppressedByBrevo: suppressedCount,
      totalQueued: filtered.length,
      status: 'QUEUED',
    };
  }

  // ── Generic transactional ─────────────────────────────────────────────────

  async sendTransactionalEmail(
    to: string,
    toName: string,
    subject: string,
    htmlContent: string,
  ) {
    await this.brevo.transactionalEmails.sendTransacEmail({
      sender: { name: this.senderName, email: this.senderEmail },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent,
    });
  }
}
