/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as qrcode from 'qrcode';
import { generateConfirmationEmail } from 'src/utils/emailLayoutGenerator';
import { Visitor } from '../visitors/entities/visitor.entity';
import { Repository } from 'typeorm';
import { CheckIn } from '../checkins/entity/checkins.entity';
import { emailQueue } from 'src/config/bull.config';

@Injectable()
export class EmailsService {
  private transporter: Transporter;

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
    fairId: string,
  ) {
    let visitors: Visitor[];

    if (registrationCodes.length) {
      visitors = await this.visitorsRepository.findByIds(registrationCodes);
    } else {
      visitors = await this.visitorsRepository
        .createQueryBuilder('visitor')
        .innerJoin(
          'fair_visitor',
          'fv',
          'fv.visitorsRegistrationCode = visitor.registrationCode',
        )
        .leftJoin(
          CheckIn,
          'checkin',
          'checkin.visitor = visitor.registrationCode',
        )
        .where('fv.fairsId = :fairId', { fairId })
        .andWhere('checkin.id IS NULL')
        .getMany();
    }

    if (!visitors.length) {
      throw new Error('No visitors found to send emails.');
    }

    console.log(`Adding ${visitors.length} emails to the queue...`);

    for (const visitor of visitors) {
      await emailQueue.add('sendEmail', {
        email: visitor.email,
        name: visitor.name,
        subject,
        html,
      });
    }

    return { message: `Emails added to queue for ${visitors.length} visitors` };
  }
}
