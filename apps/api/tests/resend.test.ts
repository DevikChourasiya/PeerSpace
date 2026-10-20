import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  sendVerificationEmail,
  setMockResendClient,
  setMockDeliveryFailure,
  clearSentEmailsLog,
  getSentEmailsLog,
  getLastSentEmail,
  getSenderAddress,
  type ResendSendEmailOptions,
  type ResendSendEmailResponse,
} from '../src/services/email.service.js';
import { env } from '../src/config/env.js';

describe('Resend HTTP Email Service', () => {
  beforeEach(() => {
    clearSentEmailsLog();
    setMockResendClient(null);
    setMockDeliveryFailure(false);
  });

  afterEach(() => {
    clearSentEmailsLog();
    setMockResendClient(null);
    setMockDeliveryFailure(false);
    vi.restoreAllMocks();
  });

  describe('1. Resend SDK Delivery over HTTPS', () => {
    it('successfully delivers verification email via Resend client and records log', async () => {
      let capturedPayload: ResendSendEmailOptions | null = null;

      setMockResendClient({
        emails: {
          send: async (payload: ResendSendEmailOptions): Promise<ResendSendEmailResponse> => {
            capturedPayload = payload;
            return {
              data: { id: 'resend_msg_abc123' },
              error: null,
            };
          },
        },
      });

      const result = await sendVerificationEmail(
        'student.resend@university.edu',
        'Elena Rostova',
        'test-token-resend-456'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('resend_msg_abc123');

      expect(capturedPayload).not.toBeNull();
      expect(capturedPayload!.to).toBe('student.resend@university.edu');
      expect(capturedPayload!.subject).toBe('PeerSpace — Verify your university email address');
      expect(capturedPayload!.text).toContain('Elena Rostova');
      expect(capturedPayload!.text).toContain('test-token-resend-456');
      expect(capturedPayload!.html).toContain('Verify Email Address');

      const lastSent = getLastSentEmail();
      expect(lastSent).toBeDefined();
      expect(lastSent?.to).toBe('student.resend@university.edu');
      expect(lastSent?.token).toBe('test-token-resend-456');
      expect(lastSent?.verificationLink).toContain('token=test-token-resend-456');
    });

    it('rejects and safely logs when Resend returns an API provider error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      setMockResendClient({
        emails: {
          send: async (): Promise<ResendSendEmailResponse> => ({
            data: null,
            error: {
              name: 'validation_error',
              message: 'You can only send testing emails to your own email address.',
            },
          }),
        },
      });

      await expect(
        sendVerificationEmail('unverified.domain@random.edu', 'Test Student', 'secret-token-789')
      ).rejects.toThrow('Email delivery failed');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedError = consoleErrorSpy.mock.calls[0].join(' ');
      expect(loggedError).toContain('Resend API error');
      expect(loggedError).toContain('validation_error');
      // Ensure raw token is not exposed in the error log
      expect(loggedError).not.toContain('secret-token-789');
    });

    it('rejects and safely handles network exceptions from Resend API call', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      setMockResendClient({
        emails: {
          send: async (): Promise<ResendSendEmailResponse> => {
            throw new Error('ETIMEDOUT connecting to https://api.resend.com');
          },
        },
      });

      await expect(
        sendVerificationEmail('student@university.edu', 'Network Fail', 'token-network-000')
      ).rejects.toThrow('Email delivery failed');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logged = consoleErrorSpy.mock.calls[0].join(' ');
      expect(logged).toContain('Failed to deliver verification email via Resend');
      expect(logged).not.toContain('token-network-000');
    });
  });

  describe('2. Sender Configuration & Domain Verification Awareness', () => {
    it('resolves explicit sender address or falls back to onboarding@resend.dev default', () => {
      const sender = getSenderAddress();
      expect(sender).toBeDefined();
      expect(typeof sender).toBe('string');
      // Either custom RESEND_FROM, EMAIL_FROM, onboarding@resend.dev, or SMTP_FROM fallback
      expect(sender).toMatch(/@/);
    });
  });

  describe('3. Missing Configuration Guard & Test Mock Fallback', () => {
    it('falls back to mock transport in test/development when Resend is not configured', async () => {
      setMockResendClient(null);

      const result = await sendVerificationEmail(
        'mock.student@university.edu',
        'Mock Student',
        'mock-token-xyz'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();

      const logs = getSentEmailsLog();
      expect(logs.length).toBe(1);
      expect(logs[0].to).toBe('mock.student@university.edu');
      expect(logs[0].token).toBe('mock-token-xyz');
    });

    it('respects setMockDeliveryFailure toggle for simulated failure testing', async () => {
      setMockDeliveryFailure(true);

      await expect(
        sendVerificationEmail('fail@university.edu', 'Fail Student', 'token-fail')
      ).rejects.toThrow('Simulated email delivery failure');
    });

    it('enforces email provider configuration in production mode', async () => {
      const originalNodeEnv = env.NODE_ENV;
      const originalSmtpHost = env.SMTP_HOST;
      const originalResendKey = env.RESEND_API_KEY;

      try {
        (env as any).NODE_ENV = 'production';
        (env as any).SMTP_HOST = undefined;
        (env as any).RESEND_API_KEY = undefined;
        setMockResendClient(null);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(
          sendVerificationEmail('prod@university.edu', 'Prod Student', 'prod-token')
        ).rejects.toThrow(/Email provider not configured/i);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Missing email provider configuration')
        );
      } finally {
        (env as any).NODE_ENV = originalNodeEnv;
        (env as any).SMTP_HOST = originalSmtpHost;
        (env as any).RESEND_API_KEY = originalResendKey;
      }
    });
  });
});
