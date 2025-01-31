/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { BadRequestException, Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as qrcode from 'qrcode';

@Injectable()
export class EmailsService {
  private transporter;

  constructor() {
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

  async sendEmail(to: string, visitorName: string, registrationCode: string) {
    try {
      await qrcode.toDataURL(
        'https://www.expomultimix.com/',
        async (err, url) => {
          if (err) {
            throw new BadRequestException('Failed to generate QR Code');
          }
          console.log(url);
          const html = `
        <h1>Welcome, ${visitorName}!</h1>
        <p>Thank you for registering for our event.</p>
        <p>Your QR Code: <strong>${registrationCode}</strong></p>
        <img src="${url}" alt="QR Code" />
        <p>Please present this QR Code at check-in.</p>
      `;

          const mailOptions = {
            from: `"Credenciamento" <${process.env.SMTP_USER}>`,
            to,
            subject: 'Teste Credednciamento ',
            html,
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
}
