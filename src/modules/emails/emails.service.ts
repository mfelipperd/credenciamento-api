/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as nodemailer from 'nodemailer';
import * as qrcode from 'qrcode';
import { generateConfirmationEmail } from 'src/utils/emailLayoutGenerator';
import { Visitor } from '../visitors/entities/visitor.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EmailsService {
  private transporter;

  constructor(
    @InjectRepository(Visitor)
    private readonly visitorsRepository: Repository<Visitor>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '', 10),
      secure: process.env.SMTP_SECURE === 'true', // Usar SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(
    to: string,
    visitorName: string,
    registrationCode: string,
    html?: string,
  ) {
    try {
      await qrcode.toDataURL(
        'https://www.expomultimix.com/',
        async (err, url) => {
          if (err) {
            throw new BadRequestException('Failed to generate QR Code');
          }
          const generatedHtml = generateConfirmationEmail(
            visitorName,
            registrationCode,
            url as string,
          );

          const mailOptions = {
            from: `"Credenciamento" <${process.env.SMTP_USER}>`,
            to,
            subject: 'Teste Credednciamento ',
            html: html || generatedHtml,
            attachDataUrls: true,
          };

          await this.transporter.sendMail(mailOptions);
        },
      );

      return { success: true, message: `Email sent to ${to}` };
    } catch (error) {
      console.error('Email Error:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendCustomEmails(
    registrationCodes: string[],
    subject: string,
    html: string,
  ) {
    const visitors = await this.visitorsRepository.findByIds(registrationCodes);

    if (!visitors.length) {
      throw new BadRequestException(
        'No visitors found for the given registrationCodes',
      );
    }

    for (const visitor of visitors) {
      await this.sendEmail(visitor.email, visitor.name, subject, html);
    }

    return { message: `Emails sent to ${visitors.length} visitors` };
  }
}
