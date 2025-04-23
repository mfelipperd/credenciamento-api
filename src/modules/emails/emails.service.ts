/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as qrcode from 'qrcode';
import { generateConfirmationEmail } from 'src/utils/emailLayoutGenerator';
import { Visitor } from '../visitors/entities/visitor.entity';
import { Repository } from 'typeorm';
import { CheckIn } from '../checkins/entity/checkins.entity';

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
      const qrCodeUrl = await qrcode.toDataURL('https://www.expomultimix.com/');

      const generatedHtml = generateConfirmationEmail(
        visitorName,
        registrationCode,
        qrCodeUrl,
      );

      const mailOptions = {
        from: `"Credenciamento" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Teste Credenciamento ',
        html: html || generatedHtml,
        attachDataUrls: true,
      };

      await this.transporter.sendMail(mailOptions);

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

    for (const visitor of visitors) {
      await this.sendEmail(
        visitor.email,
        visitor.name,
        visitor.registrationCode,
        html,
      );
    }

    return { message: `Emails sent to ${visitors.length} visitors` };
  }
}
