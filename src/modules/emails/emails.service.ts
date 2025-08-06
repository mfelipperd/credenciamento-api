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
import { createTransport } from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { FairsService } from '../fairs/fairs.service';
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
      // Para teste, apenas enviar para o email específico
      const testEmail = 'felipperabelodurans@gmail.com';
      
      await this.transporter.sendMail({
        from: `"Credenciamento - Marketing" <${this.config.get('SMTP_USER')}>`,
        to: testEmail,
        subject: subject,
        html: htmlContent,
      });

      return {
        success: true,
        message: 'Email de marketing enviado com sucesso',
        sentTo: [testEmail],
        fairId,
      };
    } catch (err) {
      console.error('Erro enviando email de marketing:', err);
      throw new InternalServerErrorException(
        'Falha ao enviar email de marketing',
      );
    }
  }
}
