import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export interface SentEmailRecord {
  to: string;
  subject: string;
  token?: string;
  verificationLink?: string;
  sentAt: Date;
}

// In-memory record of sent emails for local test verification and diagnostics
const sentEmailsLog: SentEmailRecord[] = [];

export const getSentEmailsLog = (): readonly SentEmailRecord[] => sentEmailsLog;
export const getLastSentEmail = (): SentEmailRecord | undefined =>
  sentEmailsLog[sentEmailsLog.length - 1];
export const clearSentEmailsLog = (): void => {
  sentEmailsLog.length = 0;
};

// Configurable mock transport override for testing delivery failure scenarios
let mockDeliveryFailure = false;
export const setMockDeliveryFailure = (shouldFail: boolean): void => {
  mockDeliveryFailure = shouldFail;
};

export interface ResendSendEmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface ResendSendEmailResponse {
  data: { id: string } | null;
  error: { name: string; message: string } | null;
}

export interface ResendEmailsClient {
  emails: {
    send: (payload: ResendSendEmailOptions) => Promise<ResendSendEmailResponse>;
  };
}

let resendInstance: Resend | null = null;
let mockResendClient: ResendEmailsClient | null = null;

/**
 * Injects a mock Resend client for unit testing provider responses, API errors, and network issues.
 */
export const setMockResendClient = (client: ResendEmailsClient | null): void => {
  mockResendClient = client;
};

const getResendClient = (): ResendEmailsClient | Resend | null => {
  if (mockResendClient) {
    return mockResendClient;
  }
  if (env.RESEND_API_KEY) {
    if (!resendInstance) {
      resendInstance = new Resend(env.RESEND_API_KEY);
    }
    return resendInstance;
  }
  return null;
};

/**
 * Resolves the sender address from environment variables.
 * Note: Sending to arbitrary external student addresses in production requires a verified domain in Resend.
 * For initial sandbox testing, onboarding@resend.dev is used as the fallback test sender.
 */
export const getSenderAddress = (): string => {
  if (env.RESEND_FROM) {
    return env.RESEND_FROM;
  }
  if (env.EMAIL_FROM) {
    return env.EMAIL_FROM;
  }
  if (env.RESEND_API_KEY) {
    return 'PeerSpace <onboarding@resend.dev>';
  }
  return env.SMTP_FROM || 'PeerSpace <no-reply@peerspace.edu>';
};

// Deprecated SMTP transporter fallback (used only if SMTP is explicitly configured and RESEND_API_KEY is unset)
const createSmtpTransporter = () => {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return null;
};

const smtpTransporter = createSmtpTransporter();

export const sendVerificationEmail = async (
  recipientEmail: string,
  recipientName: string,
  verificationToken: string
): Promise<{ success: boolean; messageId?: string }> => {
  if (mockDeliveryFailure) {
    throw new Error('Simulated email delivery failure for testing.');
  }

  const baseUrl = env.APP_URL || env.CORS_ORIGIN || 'http://localhost:5173';
  const verificationLink = `${baseUrl.replace(/\/+$/, '')}/verify-email?token=${encodeURIComponent(verificationToken)}`;

  const subject = 'PeerSpace — Verify your university email address';

  const textContent = `Hello ${recipientName},

Welcome to PeerSpace — Student Feedback Management System.

Please verify your email address to complete your registration by visiting the following link:
${verificationLink}

This verification link will expire in 24 hours.

After verifying your email, your account registration will be placed in the queue for course administrator approval.

If you did not request this registration, please disregard this email.

Best regards,
The PeerSpace Academic Team`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F5F2EB; margin: 0; padding: 24px; color: #1C1B18; }
    .card { max-width: 560px; margin: 0 auto; background: #FCFBF9; border: 1px solid #E4E0D8; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(28, 27, 24, 0.04); }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; border-bottom: 1px solid #E4E0D8; padding-bottom: 16px; }
    .brand { font-size: 20px; font-weight: 700; color: #1C1B18; }
    .btn { display: inline-block; background-color: #5B9CF6; color: #ffffff !important; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 10px; text-decoration: none; margin: 20px 0; }
    .footer { font-size: 12px; color: #6E6A61; margin-top: 32px; border-top: 1px solid #E4E0D8; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="brand">PeerSpace</span>
    </div>
    <h2 style="font-size: 18px; color: #1C1B18; margin-top: 0;">Verify your email address</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #5C5952;">
      Hello <strong>${recipientName}</strong>,
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #5C5952;">
      Welcome to PeerSpace — Student Feedback Management System. Please confirm that this email address belongs to you by clicking the button below:
    </p>
    <div style="text-align: center;">
      <a href="${verificationLink}" class="btn">Verify Email Address</a>
    </div>
    <p style="font-size: 12px; line-height: 1.5; color: #6E6A61;">
      Or copy and paste this link into your browser:<br>
      <a href="${verificationLink}" style="color: #5B9CF6; word-break: break-all;">${verificationLink}</a>
    </p>
    <p style="font-size: 13px; line-height: 1.5; color: #5C5952; margin-top: 20px;">
      <em>Note: This verification link expires in 24 hours. After verification, your account will await administrator approval before course evaluations are unlocked.</em>
    </p>
    <div class="footer">
      PeerSpace Academic Portal — Confidential institutional notification.
    </div>
  </div>
</body>
</html>`;

  // 1. Primary delivery path: Resend Node.js SDK over HTTPS
  const resend = getResendClient();
  if (resend) {
    const fromAddress = getSenderAddress();
    try {
      const response = await resend.emails.send({
        from: fromAddress,
        to: recipientEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      if (response.error) {
        console.error(
          `[EmailService] Resend API error: ${response.error.name} - ${response.error.message}`
        );
        throw new Error(`Email delivery failed: ${response.error.message}`);
      }

      sentEmailsLog.push({
        to: recipientEmail,
        subject,
        token: verificationToken,
        verificationLink,
        sentAt: new Date(),
      });

      return {
        success: true,
        messageId: response.data?.id,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[EmailService] Failed to deliver verification email via Resend to recipient: ${errorMsg}`
      );
      throw new Error('Email delivery failed');
    }
  }

  // 2. Production guard: Enforce configured email provider in production mode
  if (env.NODE_ENV === 'production' && !env.SMTP_HOST) {
    console.error(
      '[EmailService] Missing email provider configuration: RESEND_API_KEY is not configured in production.'
    );
    throw new Error('Email delivery failed: Email provider not configured.');
  }

  // 3. Deprecated fallback: SMTP transport if SMTP credentials are provided
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: env.SMTP_FROM,
        to: recipientEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      sentEmailsLog.push({
        to: recipientEmail,
        subject,
        token: verificationToken,
        verificationLink,
        sentAt: new Date(),
      });

      return {
        success: true,
        messageId: info?.messageId,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[EmailService] Failed to deliver verification email via SMTP: ${errorMsg}`);
      throw new Error('Email delivery failed');
    }
  }

  // 4. Local development / test mock transport fallback
  sentEmailsLog.push({
    to: recipientEmail,
    subject,
    token: verificationToken,
    verificationLink,
    sentAt: new Date(),
  });

  if (env.NODE_ENV === 'development') {
    console.log('\n============================================================');
    console.log('📨 [PeerSpace Email Service — Development Mock Transport]');
    console.log(`To: ${recipientEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(
      'Notice: RESEND_API_KEY is not configured in .env. No real email was sent to your inbox.'
    );
    console.log(`👉 Development Verification Link: ${verificationLink}`);
    console.log('============================================================\n');
  }

  return {
    success: true,
    messageId: `mock-${Date.now()}`,
  };
};
