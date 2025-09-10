/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/modules/emails/emails.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createTransport } from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { FairsService } from '../fairs/fairs.service';
import { Visitor } from '../visitors/entities/visitor.entity';
import { generateConfirmationEmail } from 'src/utils/emailLayoutGenerator';

@Injectable()
export class EmailsService {
  private transporter = createTransport({
    host: this.config.get('SMTP_HOST'),
    port: this.config.get<number>('SMTP_PORT'),
    secure: false,
    auth: {
      user: this.config.get('SMTP_USER'),
      pass: this.config.get('SMTP_PASS'),
    },
  });

  constructor(
    private readonly config: ConfigService,
    private readonly fairsService: FairsService,
    @InjectRepository(Visitor)
    private readonly visitorsRepository: Repository<Visitor>,
  ) {}

  async sendConfirmationEmail(
    to: string,
    visitorName: string,
    registrationCode: string,
    fairId: string,
  ) {
    // 1) busca dados da feira
    const fair = await this.fairsService.findOne(fairId);
    if (!fair || !fair.date) {
      throw new BadRequestException('Dados da feira não encontrados.');
    }
    const title = fair.name;
    const location = fair.location;
    const date = new Date(fair.date);
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(date);
    end.setHours(18, 0, 0, 0);

    const data =
      'https://credenciamento-frontend.vercel.app/visitor/checkin' +
      registrationCode;

    // 2) Gera QR code como Buffer (PNG)
    let qrBuffer: Buffer;
    try {
      const qr = require('qr-image');
      qrBuffer = qr.imageSync(data, { type: 'png', size: 5 });
    } catch (err) {
      console.error('Erro ao gerar QR code:', err);
      throw new BadRequestException('Falha ao gerar QR code');
    }

    // 3) Monta o HTML referenciando o CID "qrcode"
    //    Ajuste o template para <img src="cid:qrcode" ...>
    const html = generateConfirmationEmail(
      visitorName,
      registrationCode,
      'cid:qrcode', // passa o CID em vez de URL
      title,
      start.toISOString(),
      end.toISOString(),
      location,
    );

    // 4) Envia o e-mail com o QR como anexo inline
    try {
      await this.transporter.sendMail({
        from: `"Credenciamento" <${this.config.get('SMTP_USER')}>`,
        to,
        subject: `Confirmação – ${title}`,
        html,
        attachments: [
          {
            filename: 'qrcode.png',
            content: qrBuffer,
            cid: 'qrcode', // este mesmo CID usado no <img src>
          },
        ],
      });
    } catch (err) {
      console.error('Erro enviando e-mail de confirmação:', err);
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
    try {
      // Verifica se a feira existe
      const fair = await this.fairsService.findOne(fairId);
      if (!fair) {
        throw new BadRequestException('Feira não encontrada.');
      }

      // Busca visitantes ausentes da feira específica (mesmo método do dashboard)
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
        .andWhere('c.id IS NULL') // Filtra apenas os que NÃO têm check-in registrado
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
          sentTo: [],
          fairId,
          totalAbsent: 0,
        };
      }

      // Coleta todos os emails dos visitantes ausentes
      const emailsToSend = absentVisitors.map((visitor) => visitor.email);

      // Inicia processamento em background para evitar timeout
      this.processBulkEmails(emailsToSend, subject, htmlContent).catch(
        (error) => {
          console.error('Erro no processamento em background:', error);
        },
      );

      // Retorna imediatamente para o cliente
      return {
        success: true,
        message: `Processamento de ${emailsToSend.length} email(s) iniciado em background`,
        fairId,
        totalAbsent: absentVisitors.length,
        absentVisitors: absentVisitors.map((v) => ({
          name: v.name,
          email: v.email,
          company: v.company,
        })),
        status: 'PROCESSING_STARTED',
      };
    } catch (err) {
      console.error('Erro enviando email de marketing:', err);
      throw new InternalServerErrorException(
        'Falha ao enviar email de marketing',
      );
    }
  }

  private async processBulkEmails(
    emails: string[],
    subject: string,
    htmlContent: string,
  ) {
    // 📧 CONFIGURAÇÕES OTIMIZADAS PARA GMAIL SMTP
    const DELAY_BETWEEN_EMAILS = 30000; // 30 segundos entre emails (2 emails/minuto)
    const DELAY_BETWEEN_HOURS = 3600000; // 1 hora = 3.600.000ms
    const EMAILS_PER_HOUR_LIMIT = 90; // 90 emails/hora (margem de segurança)
    const MAX_RETRIES = 5; // Mais tentativas para Gmail

    let successCount = 0;
    let errorCount = 0;
    let hourlyCount = 0;
    let hourStartTime = Date.now();
    const errors: Array<{ email: string; error: string }> = [];

    console.log(
      `🚀 [GMAIL OPTIMIZED] Iniciando processamento de ${emails.length} emails`,
    );
    console.log('⚙️ Configurações: 1 email a cada 30s, máximo 90/hora');
    console.log(
      `⏱️ Tempo estimado: ${Math.ceil((emails.length * 30) / 60)} minutos`,
    );

    // Processa emails individualmente
    // Processa emails individualmente para Gmail
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const currentTime = Date.now();

      // Verifica limite por hora (pausa se necessário)
      if (hourlyCount >= EMAILS_PER_HOUR_LIMIT) {
        const timeElapsed = currentTime - hourStartTime;
        if (timeElapsed < DELAY_BETWEEN_HOURS) {
          const waitTime = DELAY_BETWEEN_HOURS - timeElapsed;
          console.log(
            `⏰ Limite de ${EMAILS_PER_HOUR_LIMIT} emails/hora atingido. Aguardando ${Math.ceil(waitTime / 60000)} minutos...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
        hourlyCount = 0;
        hourStartTime = Date.now();
      }

      console.log(`📧 Processando email ${i + 1}/${emails.length}: ${email}`);

      try {
        await this.sendSingleEmailWithRetry(
          email,
          subject,
          htmlContent,
          MAX_RETRIES,
        );
        successCount++;
        hourlyCount++;
        console.log(
          `✅ Email ${i + 1} enviado com sucesso (${successCount}/${emails.length})`,
        );
      } catch (error) {
        errorCount++;
        errors.push({
          email: email,
          error: error.message || 'Erro desconhecido',
        });
        console.error(`❌ Falha no email ${i + 1}: ${error.message}`);
      }

      // Delay entre emails (exceto no último)
      if (i < emails.length - 1) {
        console.log(
          `⏳ Aguardando 30s antes do próximo email... (${i + 2}/${emails.length})`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_EMAILS),
        );
      }
    }

    // Log final
    console.log(
      `🏁 Processamento concluído: ${successCount} sucessos, ${errorCount} erros de ${emails.length} emails`,
    );

    if (errors.length > 0) {
      console.log('❌ Erros encontrados:', errors);
    }

    // Aqui você poderia salvar o resultado em banco para consulta posterior
    // await this.saveEmailCampaignResult(fairId, successCount, errorCount, errors);
  }

  private async sendSingleEmailWithRetry(
    email: string,
    subject: string,
    htmlContent: string,
    maxRetries: number,
  ): Promise<void> {
    let lastError: Error = new Error('Erro desconhecido');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.transporter.sendMail({
          from: `"Credenciamento - Marketing" <${this.config.get('SMTP_USER')}>`,
          to: email,
          subject: subject,
          html: htmlContent,
        });

        // Se chegou aqui, deu certo
        return;
      } catch (error) {
        lastError = error;
        console.warn(
          `⚠️ Tentativa ${attempt}/${maxRetries} falhou para ${email}: ${error.message}`,
        );

        if (attempt < maxRetries) {
          // Para Gmail, usa delays maiores e específicos
          let delay = 60000; // 1 minuto base

          // Aumenta delay baseado no erro
          if (error.message.includes('454 4.7.0')) {
            delay = 300000; // 5 minutos para rate limiting
          } else if (error.message.includes('421')) {
            delay = 600000; // 10 minutos para service unavailable
          } else {
            delay = Math.pow(2, attempt) * 30000; // 30s, 60s, 120s...
          }

          console.log(
            `⏳ Aguardando ${delay / 1000}s antes da próxima tentativa...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError;
  }
}
