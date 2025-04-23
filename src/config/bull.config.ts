/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import nodemailer from 'nodemailer';
import { config } from 'dotenv';

config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface SendEmailPayload {
  email: string;
  subject: string;
  html: string;
}

export async function sendEmail({ email, subject, html }: SendEmailPayload) {
  console.log(`Sending email to ${email}...`);

  await transporter.sendMail({
    from: `"Expomultimix" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    html,
  });

  console.log(`Email sent to ${email}`);
}
