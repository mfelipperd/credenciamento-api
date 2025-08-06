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

      // Para teste, enviar apenas para o email de teste
      // Em produção, seria: absentVisitors.map(visitor => visitor.email)
      const testEmail = 'felipperabelodurans@gmail.com';
      const emailsToSend = [testEmail]; // Futuramente: absentVisitors.map(v => v.email)

      // Inicia processamento em background para evitar timeout
      this.processBulkEmails(emailsToSend, subject, htmlContent, fairId)
        .catch(error => {
          console.error('Erro no processamento em background:', error);
        });

      // Retorna imediatamente para o cliente
      return {
        success: true,
        message: `Processamento de ${emailsToSend.length} email(s) iniciado em background`,
        fairId,
        totalAbsent: absentVisitors.length,
        absentVisitors: absentVisitors.map(v => ({
          name: v.name,
          email: v.email,
          company: v.company
        })),
        status: 'PROCESSING_STARTED'
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
    fairId: string,
  ) {
    const BATCH_SIZE = 10; // Processa 10 emails por vez
    const DELAY_BETWEEN_BATCHES = 2000; // 2 segundos entre lotes
    const MAX_RETRIES = 3;

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{email: string, error: string}> = [];

    console.log(`🚀 Iniciando processamento de ${emails.length} emails em lotes de ${BATCH_SIZE}`);

    // Processa emails em lotes
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      console.log(`📧 Processando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(emails.length/BATCH_SIZE)}: ${batch.length} emails`);

      // Processa o lote atual em paralelo
      const batchPromises = batch.map(async (email) => {
        return this.sendSingleEmailWithRetry(email, subject, htmlContent, MAX_RETRIES);
      });

      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Conta sucessos e erros
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successCount++;
          } else {
            errorCount++;
            errors.push({
              email: batch[index],
              error: result.reason.message || 'Erro desconhecido'
            });
          }
        });

        // Log do progresso
        console.log(`✅ Lote concluído: ${successCount} sucessos, ${errorCount} erros`);

      } catch (error) {
        console.error('Erro no processamento do lote:', error);
        errorCount += batch.length;
      }

      // Delay entre lotes para não sobrecarregar o SMTP
      if (i + BATCH_SIZE < emails.length) {
        console.log(`⏳ Aguardando ${DELAY_BETWEEN_BATCHES}ms antes do próximo lote...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // Log final
    console.log(`🏁 Processamento concluído: ${successCount} sucessos, ${errorCount} erros de ${emails.length} emails`);
    
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
    maxRetries: number
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
        console.warn(`⚠️ Tentativa ${attempt}/${maxRetries} falhou para ${email}:`, error.message);
        
        if (attempt < maxRetries) {
          // Delay crescente entre tentativas (backoff exponencial)
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError;
  }
}
