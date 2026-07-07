import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  if (!env.smtp.host) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
};

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email via SMTP if configured. If no SMTP host is set (e.g. local dev),
 * logs the email to the console instead so the auth flows can still be tested end to end.
 */
export const sendMail = async ({ to, subject, html }: SendMailOptions): Promise<void> => {
  const t = getTransporter();

  if (!t) {
    console.log('\n📧  [DEV MAIL] SMTP not configured — logging email instead of sending:');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${html}\n`);
    return;
  }

  await t.sendMail({
    from: env.smtp.from,
    to,
    subject,
    html,
  });
};

export const sendVerificationEmail = async (to: string, token: string): Promise<void> => {
  const link = `${env.clientUrl}/verify-email?token=${token}`;
  await sendMail({
    to,
    subject: 'Verify your email address',
    html: `<p>Welcome! Please verify your email by clicking the link below:</p>
           <p><a href="${link}">${link}</a></p>
           <p>This link expires in 24 hours.</p>`,
  });
};

export const sendPasswordResetEmail = async (to: string, token: string): Promise<void> => {
  const link = `${env.clientUrl}/reset-password?token=${token}`;
  await sendMail({
    to,
    subject: 'Reset your password',
    html: `<p>We received a request to reset your password. Click the link below to choose a new one:</p>
           <p><a href="${link}">${link}</a></p>
           <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
  });
};
