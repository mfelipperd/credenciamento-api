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
import { EmailCampaignPreview } from './entities/email-campaign-preview.entity';
import {
  generateConfirmationEmail,
  generateFirstAccessEmail,
  generatePasswordResetEmail,
} from 'src/utils/emailLayoutGenerator';
import { AudienceCondition, AudienceQuery } from './types/audience-query';
import { ExhibitorMember } from '../exhibitors/entities/exhibitor-member.entity';
import {
  Prospect,
  ProspectStatus,
  ProspectType,
} from '../prospecting/entities/prospect.entity';

const PREVIEW_TTL_MINUTES = 15;

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
    @InjectRepository(ExhibitorMember)
    private readonly exhibitorMembersRepository: Repository<ExhibitorMember>,
    @InjectRepository(Prospect)
    private readonly prospectsRepository: Repository<Prospect>,
    @InjectRepository(EmailCampaign)
    private readonly campaignRepository: Repository<EmailCampaign>,
    @InjectRepository(EmailCampaignPreview)
    private readonly campaignPreviewRepository: Repository<EmailCampaignPreview>,
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
        clicks: report.clicks ?? 0,
        uniqueClicks: report.uniqueClicks ?? 0,
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
    const clicked = report.clicks ?? 0;

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
        loadedByProxy: report.loadedByProxy ?? 0,
        clicks: clicked,
        uniqueClicks: report.uniqueClicks ?? 0,
        clickRate: delivered ? +((clicked / delivered) * 100).toFixed(1) : 0,
        unsubscribed: report.unsubscribed ?? 0,
      },
    };
  }

  // ── Account emails (primeiro acesso / recuperação de senha) ───────────────

  async sendFirstAccessEmail(to: string, name: string, code: string) {
    const html = generateFirstAccessEmail(name, code);
    await this.sendTransactionalEmail(
      to,
      name,
      'Bem-vindo(a) à ExpoMultimix — defina sua senha',
      html,
    );
  }

  async sendPasswordResetEmail(to: string, name: string, code: string) {
    const html = generatePasswordResetEmail(name, code);
    await this.sendTransactionalEmail(
      to,
      name,
      'Código pra redefinir sua senha',
      html,
    );
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

  private async resolveMarketingRecipients(
    targetFairId: string,
    additionalFairIds: string[],
    sendTo: 'all' | 'absent',
  ) {
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
      return { recipients, filtered: [], suppressedCount: 0 };
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

    return { recipients, filtered, suppressedCount };
  }

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

    const { recipients, filtered, suppressedCount } =
      await this.resolveMarketingRecipients(
        targetFairId,
        additionalFairIds,
        sendTo,
      );

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

  // ── Marketing: multi-fair audience segmentation (audienceQuery) ──────────

  // Resolves ONE condition (fairId + status) to a map of lowercased email -> name.
  private async resolveAudienceCondition(
    condition: AudienceCondition,
  ): Promise<Map<string, string>> {
    const qb = this.visitorsRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .where('fv.fairsId = :fairId', { fairId: condition.fairId })
      .select('visitor.email', 'email')
      .addSelect('MAX(visitor.name)', 'name')
      .groupBy('visitor.email');

    if (condition.status === 'present') {
      qb.innerJoin(
        'checkins',
        'c',
        'c.visitorRegistrationCode = visitor.registrationCode',
      );
    } else if (condition.status === 'absent') {
      qb.leftJoin(
        'checkins',
        'c',
        'c.visitorRegistrationCode = visitor.registrationCode',
      ).andWhere('c.id IS NULL');
    }
    // 'registered' needs no checkins join at all.

    const rows = await qb.getRawMany<{ email: string; name: string }>();
    return new Map(rows.map((r) => [r.email.toLowerCase(), r.name]));
  }

  // Combines each condition's matching set with AND (intersection) or OR (union).
  // AND-of-absence is an intersection of two "didn't show up" sets, NOT a union —
  // getting this backwards would silently target a much larger audience than intended.
  private async resolveAudienceQuery(
    query: AudienceQuery,
  ): Promise<{ email: string; name: string }[]> {
    const maps = await Promise.all(
      query.conditions.map((c) => this.resolveAudienceCondition(c)),
    );

    let resultKeys: Set<string>;
    if (query.operator === 'AND') {
      resultKeys = new Set(maps[0]?.keys() ?? []);
      for (const m of maps.slice(1)) {
        resultKeys = new Set([...resultKeys].filter((k) => m.has(k)));
      }
    } else {
      resultKeys = new Set(maps.flatMap((m) => [...m.keys()]));
    }

    const nameByEmail = new Map<string, string>();
    for (const m of maps) {
      for (const [email, name] of m) {
        if (!nameByEmail.has(email)) nameByEmail.set(email, name);
      }
    }

    return [...resultKeys].map((email) => ({
      email,
      name: nameByEmail.get(email) ?? '',
    }));
  }

  private async filterBlocked(
    recipients: { email: string; name: string }[],
  ): Promise<{
    filtered: { email: string; name: string }[];
    suppressedCount: number;
  }> {
    if (recipients.length === 0) return { filtered: [], suppressedCount: 0 };
    const blockedEmails = await this.getBrevoBlockedEmails();
    const filtered = recipients.filter(
      (v) => !blockedEmails.has(v.email.toLowerCase()),
    );
    return { filtered, suppressedCount: recipients.length - filtered.length };
  }

  private async resolveExhibitorMarketingRecipients(targetFairId: string) {
    const rows = await this.exhibitorMembersRepository
      .createQueryBuilder('member')
      .innerJoin('exhibitors', 'exhibitor', 'exhibitor.id = member.exhibitorId')
      .leftJoin(
        'exhibitor_fairs',
        'ef',
        'ef.exhibitorId = exhibitor.id AND ef.fairId = :targetFairId',
        {
          targetFairId,
        },
      )
      .where('member.isActive = :isActive', { isActive: true })
      .andWhere('member.email IS NOT NULL')
      .andWhere("TRIM(member.email) <> ''")
      .andWhere('exhibitor.isActive = :exhibitorActive', {
        exhibitorActive: true,
      })
      .andWhere('ef.id IS NULL')
      .select('member.email', 'email')
      .addSelect('MAX(member.name)', 'name')
      .groupBy('member.email')
      .getRawMany<{ email: string; name: string }>();

    const deduped = new Map<string, { email: string; name: string }>();

    for (const row of rows) {
      const email = row.email.trim().toLowerCase();
      if (!email || deduped.has(email)) continue;
      deduped.set(email, {
        email,
        name: row.name?.trim() || email,
      });
    }

    const recipients = [...deduped.values()];
    const { filtered, suppressedCount } = await this.filterBlocked(recipients);

    return { recipients, filtered, suppressedCount };
  }

  // Prospects (leads) sempre filtrados por type — EXPOSITOR e VISITANTE nunca
  // podem ser misturados no mesmo envio. Exclui DESCARTADO (lead já recusada).
  private async resolveProspectMarketingRecipients(
    fairId: string,
    type: ProspectType,
  ) {
    const rows = await this.prospectsRepository
      .createQueryBuilder('prospect')
      .where('prospect.fairId = :fairId', { fairId })
      .andWhere('prospect.type = :type', { type })
      .andWhere('prospect.status != :discarded', {
        discarded: ProspectStatus.DESCARTADO,
      })
      .andWhere('prospect.email IS NOT NULL')
      .andWhere("TRIM(prospect.email) <> ''")
      .select('prospect.email', 'email')
      .addSelect(
        'MAX(COALESCE(prospect.nomeFantasia, prospect.razaoSocial))',
        'name',
      )
      .groupBy('prospect.email')
      .getRawMany<{ email: string; name: string }>();

    const deduped = new Map<string, { email: string; name: string }>();
    for (const row of rows) {
      const email = row.email.trim().toLowerCase();
      if (!email || deduped.has(email)) continue;
      deduped.set(email, { email, name: row.name?.trim() || email });
    }

    const recipients = [...deduped.values()];
    const { filtered, suppressedCount } = await this.filterBlocked(recipients);

    return { recipients, filtered, suppressedCount };
  }

  // Shared by confirmMarketingEmail's audienceQuery path. sendMarketingEmail (the
  // legacy direct-send path used by the existing frontend endpoint) is untouched
  // and does its own persist+enqueue — kept separate deliberately to avoid any
  // behavior change to that already-proven, already-in-use code path.
  private async persistCampaignAndEnqueue(params: {
    title: string;
    subject: string;
    htmlContent: string;
    targetFairId: string | null;
    audienceQuery: AudienceQuery | null;
    sendTo?: string;
    recipients: { email: string; name: string }[];
    filtered: { email: string; name: string }[];
    suppressedCount: number;
  }) {
    const brevoTag = `emm-${randomUUID().replace(/-/g, '').substring(0, 12)}`;
    const campaign = this.campaignRepository.create({
      title: params.title,
      subject: params.subject,
      htmlContent: params.htmlContent,
      targetFairId: params.targetFairId,
      audienceQuery: params.audienceQuery,
      sendTo: params.sendTo ?? 'custom',
      totalQueued: params.filtered.length,
      suppressedCount: params.suppressedCount,
      brevoTag,
    });
    const savedCampaign = await this.campaignRepository.save(campaign);

    const jobs = params.filtered.map((visitor) => ({
      name: 'send-marketing-email',
      data: {
        to: visitor.email,
        name: visitor.name,
        subject: params.subject,
        htmlContent: params.htmlContent,
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
      `[CAMPAIGN ${savedCampaign.id}] ${params.filtered.length} emails enfileirados (audienceQuery)`,
    );

    return {
      success: true,
      message: `${params.filtered.length} email(s) enfileirados para envio`,
      campaignId: savedCampaign.id,
      brevoTag,
      audienceQuery: params.audienceQuery,
      totalRecipients: params.recipients.length,
      suppressedByBrevo: params.suppressedCount,
      totalQueued: params.filtered.length,
      status: 'QUEUED',
    };
  }

  // ── Marketing: preview + confirm (used by the MCP connector) ─────────────

  async previewMarketingEmail(params: {
    title: string;
    subject: string;
    htmlContent: string;
    targetFairId?: string;
    templateFairId?: string;
    sendTo?: 'all' | 'absent';
    additionalFairIds?: string[];
    audienceQuery?: AudienceQuery;
  }) {
    let recipients: { email: string; name: string }[];
    let filtered: { email: string; name: string }[];
    let suppressedCount: number;
    let audienceSummary: unknown;

    if (params.audienceQuery) {
      if (!params.audienceQuery.conditions?.length) {
        throw new BadRequestException(
          'audienceQuery precisa de pelo menos uma condição',
        );
      }

      const uniqueFairIds = [
        ...new Set(params.audienceQuery.conditions.map((c) => c.fairId)),
      ];
      const fairs = await Promise.all(
        uniqueFairIds.map((id) => this.fairsService.findOne(id)),
      );
      const missing = uniqueFairIds.filter((_, i) => !fairs[i]);
      if (missing.length) {
        throw new BadRequestException(
          `Feira(s) não encontrada(s): ${missing.join(', ')}`,
        );
      }

      recipients = await this.resolveAudienceQuery(params.audienceQuery);
      ({ filtered, suppressedCount } = await this.filterBlocked(recipients));
      audienceSummary = {
        operator: params.audienceQuery.operator,
        conditions: params.audienceQuery.conditions.map((c) => ({
          ...c,
          fairName: fairs[uniqueFairIds.indexOf(c.fairId)]?.name,
        })),
      };
    } else {
      if (!params.targetFairId || !params.templateFairId || !params.sendTo) {
        throw new BadRequestException(
          'Informe targetFairId + templateFairId + sendTo, ou audienceQuery.',
        );
      }
      const [targetFair, templateFair] = await Promise.all([
        this.fairsService.findOne(params.targetFairId),
        this.fairsService.findOne(params.templateFairId),
      ]);
      if (!targetFair)
        throw new BadRequestException('Feira destino não encontrada.');
      if (!templateFair)
        throw new BadRequestException('Feira template não encontrada.');

      const result = await this.resolveMarketingRecipients(
        params.targetFairId,
        params.additionalFairIds ?? [],
        params.sendTo,
      );
      recipients = result.recipients;
      filtered = result.filtered;
      suppressedCount = result.suppressedCount;
      audienceSummary = {
        targetFair: targetFair.name,
        templateFair: templateFair.name,
        sendTo: params.sendTo,
        additionalFairIds: params.additionalFairIds ?? [],
      };
    }

    const expiresAt = new Date(Date.now() + PREVIEW_TTL_MINUTES * 60 * 1000);
    const preview = this.campaignPreviewRepository.create({
      title: params.title,
      subject: params.subject,
      htmlContent: params.htmlContent,
      targetFairId: params.targetFairId ?? null,
      templateFairId: params.templateFairId ?? null,
      additionalFairIds: params.additionalFairIds ?? [],
      sendTo: params.audienceQuery ? null : (params.sendTo ?? null),
      audienceQuery: params.audienceQuery ?? null,
      totalRecipients: recipients.length,
      suppressedByBrevo: suppressedCount,
      used: false,
      expiresAt,
    });
    const saved = await this.campaignPreviewRepository.save(preview);

    return {
      previewId: saved.id,
      title: params.title,
      subject: params.subject,
      audience: audienceSummary,
      totalRecipients: recipients.length,
      suppressedByBrevo: suppressedCount,
      totalWouldBeQueued: filtered.length,
      expiresAt,
      note: 'Nenhum email foi enviado. Chame send_marketing_email com este previewId para enviar de verdade.',
    };
  }

  async confirmMarketingEmail(previewId: string) {
    const preview = await this.campaignPreviewRepository.findOne({
      where: { id: previewId },
    });
    if (!preview) {
      throw new NotFoundException('Preview não encontrado');
    }
    if (preview.used) {
      throw new BadRequestException('Este preview já foi enviado');
    }
    if (preview.expiresAt < new Date()) {
      throw new BadRequestException(
        'Preview expirado — gere um novo com preview_marketing_email',
      );
    }

    if (preview.sendTo === 'exhibitors') {
      return this.confirmExhibitorMarketingEmail(previewId);
    }
    if (preview.sendTo === 'prospects') {
      return this.confirmProspectMarketingEmail(previewId);
    }

    preview.used = true;
    await this.campaignPreviewRepository.save(preview);

    if (preview.audienceQuery) {
      const recipients = await this.resolveAudienceQuery(preview.audienceQuery);
      const { filtered, suppressedCount } =
        await this.filterBlocked(recipients);

      if (recipients.length === 0) {
        return {
          success: true,
          message:
            'Nenhum destinatário encontrado para os critérios informados',
          totalRecipients: 0,
          suppressedByBrevo: 0,
          totalQueued: 0,
          status: 'QUEUED',
        };
      }
      if (filtered.length === 0) {
        return {
          success: true,
          message:
            'Todos os destinatários estão na lista de supressão da Brevo',
          totalRecipients: recipients.length,
          suppressedByBrevo: suppressedCount,
          totalQueued: 0,
          status: 'SUPPRESSED',
        };
      }

      return this.persistCampaignAndEnqueue({
        title: preview.title,
        subject: preview.subject,
        htmlContent: preview.htmlContent,
        targetFairId: null,
        audienceQuery: preview.audienceQuery,
        recipients,
        filtered,
        suppressedCount,
      });
    }

    return this.sendMarketingEmail(
      preview.targetFairId!,
      preview.templateFairId ?? preview.targetFairId!,
      preview.sendTo as 'all' | 'absent',
      preview.subject,
      preview.htmlContent,
      preview.title,
      preview.additionalFairIds,
    );
  }

  async previewExhibitorMarketingEmail(params: {
    title: string;
    subject: string;
    htmlContent: string;
    targetFairId: string;
  }) {
    const targetFair = await this.fairsService.findOne(params.targetFairId);
    if (!targetFair) {
      throw new BadRequestException('Feira destino não encontrada.');
    }

    const { recipients, filtered, suppressedCount } =
      await this.resolveExhibitorMarketingRecipients(params.targetFairId);

    const expiresAt = new Date(Date.now() + PREVIEW_TTL_MINUTES * 60 * 1000);
    const preview = this.campaignPreviewRepository.create({
      title: params.title,
      subject: params.subject,
      htmlContent: params.htmlContent,
      targetFairId: params.targetFairId,
      templateFairId: null,
      additionalFairIds: [],
      sendTo: 'exhibitors',
      audienceQuery: null,
      totalRecipients: recipients.length,
      suppressedByBrevo: suppressedCount,
      used: false,
      expiresAt,
    });

    const saved = await this.campaignPreviewRepository.save(preview);

    return {
      previewId: saved.id,
      title: params.title,
      subject: params.subject,
      audience: {
        targetFair: targetFair.name,
        sendTo: 'exhibitors',
        note: 'Destinatários: expositores ativos ainda não vinculados a esta feira.',
      },
      totalRecipients: recipients.length,
      suppressedByBrevo: suppressedCount,
      totalWouldBeQueued: filtered.length,
      expiresAt,
      note: 'Nenhum email foi enviado. Chame send_exhibitor_marketing_email com este previewId para enviar de verdade.',
    };
  }

  async confirmExhibitorMarketingEmail(previewId: string) {
    const preview = await this.campaignPreviewRepository.findOne({
      where: { id: previewId },
    });
    if (!preview) {
      throw new NotFoundException('Preview não encontrado');
    }
    if (preview.used) {
      throw new BadRequestException('Este preview já foi enviado');
    }
    if (preview.expiresAt < new Date()) {
      throw new BadRequestException(
        'Preview expirado — gere um novo com preview_exhibitor_marketing_email',
      );
    }
    if (!preview.targetFairId) {
      throw new BadRequestException(
        'Preview de expositores sem feira alvo — gere um novo preview.',
      );
    }

    preview.used = true;
    await this.campaignPreviewRepository.save(preview);

    const { recipients, filtered, suppressedCount } =
      await this.resolveExhibitorMarketingRecipients(preview.targetFairId);

    if (recipients.length === 0) {
      return {
        success: true,
        message:
          'Nenhum expositor elegível encontrado para participar da feira alvo',
        totalRecipients: 0,
        suppressedByBrevo: 0,
        totalQueued: 0,
        status: 'QUEUED',
      };
    }

    if (filtered.length === 0) {
      return {
        success: true,
        message: 'Todos os destinatários estão na lista de supressão da Brevo',
        totalRecipients: recipients.length,
        suppressedByBrevo: suppressedCount,
        totalQueued: 0,
        status: 'SUPPRESSED',
      };
    }

    return this.persistCampaignAndEnqueue({
      title: preview.title,
      subject: preview.subject,
      htmlContent: preview.htmlContent,
      targetFairId: preview.targetFairId,
      audienceQuery: null,
      sendTo: 'exhibitors',
      recipients,
      filtered,
      suppressedCount,
    });
  }

  async previewProspectMarketingEmail(params: {
    title: string;
    subject: string;
    htmlContent: string;
    fairId: string;
    type: ProspectType;
  }) {
    const fair = await this.fairsService.findOne(params.fairId);
    if (!fair) {
      throw new BadRequestException('Feira destino não encontrada.');
    }

    const { recipients, filtered, suppressedCount } =
      await this.resolveProspectMarketingRecipients(params.fairId, params.type);

    const expiresAt = new Date(Date.now() + PREVIEW_TTL_MINUTES * 60 * 1000);
    const preview = this.campaignPreviewRepository.create({
      title: params.title,
      subject: params.subject,
      htmlContent: params.htmlContent,
      targetFairId: params.fairId,
      templateFairId: null,
      additionalFairIds: [],
      sendTo: 'prospects',
      prospectType: params.type,
      audienceQuery: null,
      totalRecipients: recipients.length,
      suppressedByBrevo: suppressedCount,
      used: false,
      expiresAt,
    });

    const saved = await this.campaignPreviewRepository.save(preview);

    return {
      previewId: saved.id,
      title: params.title,
      subject: params.subject,
      audience: {
        fair: fair.name,
        type: params.type,
        sendTo: 'prospects',
        note: `Destinatários: prospects tipo ${params.type} desta feira, com e-mail válido e status diferente de DESCARTADO.`,
      },
      totalRecipients: recipients.length,
      suppressedByBrevo: suppressedCount,
      totalWouldBeQueued: filtered.length,
      expiresAt,
      note: 'Nenhum email foi enviado. Chame send_prospect_marketing_email com este previewId para enviar de verdade.',
    };
  }

  async confirmProspectMarketingEmail(previewId: string) {
    const preview = await this.campaignPreviewRepository.findOne({
      where: { id: previewId },
    });
    if (!preview) {
      throw new NotFoundException('Preview não encontrado');
    }
    if (preview.used) {
      throw new BadRequestException('Este preview já foi enviado');
    }
    if (preview.expiresAt < new Date()) {
      throw new BadRequestException(
        'Preview expirado — gere um novo com preview_prospect_marketing_email',
      );
    }
    if (!preview.targetFairId || !preview.prospectType) {
      throw new BadRequestException(
        'Preview de prospects sem feira/tipo alvo — gere um novo preview.',
      );
    }

    preview.used = true;
    await this.campaignPreviewRepository.save(preview);

    const { recipients, filtered, suppressedCount } =
      await this.resolveProspectMarketingRecipients(
        preview.targetFairId,
        preview.prospectType as ProspectType,
      );

    if (recipients.length === 0) {
      return {
        success: true,
        message: 'Nenhum prospect elegível encontrado para os critérios informados',
        totalRecipients: 0,
        suppressedByBrevo: 0,
        totalQueued: 0,
        status: 'QUEUED',
      };
    }

    if (filtered.length === 0) {
      return {
        success: true,
        message: 'Todos os destinatários estão na lista de supressão da Brevo',
        totalRecipients: recipients.length,
        suppressedByBrevo: suppressedCount,
        totalQueued: 0,
        status: 'SUPPRESSED',
      };
    }

    return this.persistCampaignAndEnqueue({
      title: preview.title,
      subject: preview.subject,
      htmlContent: preview.htmlContent,
      targetFairId: preview.targetFairId,
      audienceQuery: null,
      sendTo: 'prospects',
      recipients,
      filtered,
      suppressedCount,
    });
  }

  async getCampaignHtmlContent(id: string) {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      select: ['id', 'title', 'subject', 'htmlContent', 'sentAt'],
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    return campaign;
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
