import { AuditLog } from '../models/auditLog.model.js';
import type { Request } from 'express';

interface LogAuditParams {
  actor?: {
    id: string;
    email: string;
    role: string;
  };
  req?: Request;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
}

export const logAuditEvent = async ({
  actor,
  req,
  action,
  entityType,
  entityId = '',
  details = {},
}: LogAuditParams): Promise<void> => {
  try {
    const actorId = actor?.id || (req?.user as any)?.id;
    const actorEmail = actor?.email || (req?.user as any)?.email || 'system';
    const actorRole = actor?.role || (req?.user as any)?.role || 'system';
    const ip = req?.ip || req?.socket?.remoteAddress;

    if (!actorId) return;

    // Filter out any sensitive keys from details (passwords, tokens, cookies, secrets)
    const sanitizedDetails: Record<string, any> = {};
    for (const [key, value] of Object.entries(details)) {
      if (/password|secret|token|hash|cookie|session/i.test(key) || typeof value === 'function') {
        continue;
      }
      sanitizedDetails[key] = value;
    }

    await AuditLog.create({
      actorId,
      actorEmail,
      actorRole,
      action,
      entityType,
      entityId,
      details: sanitizedDetails,
      ip,
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit event:', err);
  }
};
