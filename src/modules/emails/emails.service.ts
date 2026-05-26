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
import { BrevoClient } from '@getbrevo/brevo';
import { FairsService } from '../fairs/fairs.service';
import { Visitor } from '../visitors/entities/visitor.entity';
import { generateConfirmationEmail } from 'src/utils/emailLayoutGenerator';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const qr = require('qr-image');

export const EMAIL_QUEUE = 'email-queue';

export interface MarketingEmailJob {
  to: string;
  name: string;
  subject: string;
  htmlContent: string;
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

  async sendConfirmationEmail(
    to: string,
    visitorName: string,
    registrationCode: string,
    fairId: string,
  ) {
    const fair = await this.fairsService.findOne(fairId);
    if (!fair || !fair.startDate) {
      throw new BadRequestException('Dados da feira não encontrados.');
    }

    const date = new Date(fair.startDate);
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(date);
    end.setHours(18, 0, 0, 0);

    const qrData =
      'https://credenciamento-frontend.vercel.app/visitor/checkin' +
      registrationCode;

    let qrBuffer: Buffer;
    try {
      qrBuffer = qr.imageSync(qrData, { type: 'png', size: 5 }) as Buffer;
    } catch (err) {
      this.logger.error('Erro ao gerar QR code', err);
      throw new BadRequestException('Falha ao gerar QR code');
    }

    const html = generateConfirmationEmail(
      visitorName,
      registrationCode,
      'cid:qrcode',
      fair.name,
      start.toISOString(),
      end.toISOString(),
      fair.location,
    );

    try {
      await this.brevo.transactionalEmails.sendTransacEmail({
        sender: { name: this.senderName, email: this.senderEmail },
        to: [{ email: to, name: visitorName }],
        subject: `Confirmação – ${fair.name}`,
        htmlContent: html,
        attachment: [
          {
            content: qrBuffer.toString('base64'),
            name: 'qrcode.png',
          },
        ],
      });
      this.logger.log(`Email de confirmação enviado para ${to}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar email de confirmação para ${to}`, err);
      throw new InternalServerErrorException(
        'Falha ao enviar e-mail de confirmação',
      );
    }
  }

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

    const jobs = absentVisitors.map((visitor) => ({
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
      `${absentVisitors.length} emails enfileirados para a feira ${fair.name}`,
    );

    return {
      success: true,
      message: `${absentVisitors.length} email(s) enfileirados para envio`,
      fairId,
      totalAbsent: absentVisitors.length,
      absentVisitors: absentVisitors.map((v) => ({
        name: v.name,
        email: v.email,
        company: v.company,
      })),
      status: 'QUEUED',
    };
  }

  async sendMarketingEmail(
    targetFairId: string,
    templateFairId: string,
    sendTo: 'all' | 'absent',
    subject: string,
    htmlContent: string,
  ) {
    const [targetFair, templateFair] = await Promise.all([
      this.fairsService.findOne(targetFairId),
      this.fairsService.findOne(templateFairId),
    ]);

    if (!targetFair) throw new BadRequestException('Feira destino não encontrada.');
    if (!templateFair) throw new BadRequestException('Feira template não encontrada.');

    const qb = this.visitorsRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .where('fv.fairsId = :targetFairId', { targetFairId })
      .select(['visitor.name', 'visitor.email']);

    if (sendTo === 'absent') {
      qb.leftJoin(
        'checkins',
        'c',
        'c.visitorRegistrationCode = visitor.registrationCode',
      ).andWhere('c.id IS NULL');
    }

    const recipients = await qb.getMany();

    if (recipients.length === 0) {
      return {
        success: true,
        message: 'Nenhum destinatário encontrado para os critérios informados',
        targetFairId,
        templateFairId,
        sendTo,
        totalQueued: 0,
        status: 'QUEUED',
      };
    }

    const jobs = recipients.map((visitor) => ({
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
      `[${sendTo.toUpperCase()}] ${recipients.length} emails enfileirados — target: ${targetFair.name}, template: ${templateFair.name}`,
    );

    return {
      success: true,
      message: `${recipients.length} email(s) enfileirados para envio`,
      targetFairId,
      templateFairId,
      sendTo,
      totalQueued: recipients.length,
      status: 'QUEUED',
    };
  }

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
