/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import { config } from 'dotenv';
import { emailQueue } from 'src/config/bull.config';

config(); // Carregar variáveis do .env

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Criar um worker para processar os e-mails
new Worker(
  'emailQueue',
  async (job) => {
    const { email, subject, html } = job.data;

    console.log(`Sending email to ${email}...`);
    await transporter.sendMail({
      from: `"Expomultimix" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html,
    });
    console.log(`Email sent to ${email}`);
  },
  {
    connection: emailQueue.opts.connection,
  },
);

console.log('Email worker is running...');
