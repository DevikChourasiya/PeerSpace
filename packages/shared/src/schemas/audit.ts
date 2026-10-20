import { z } from 'zod';

export const AuditAction = {
  MEMBERSHIP_APPROVED: 'MEMBERSHIP_APPROVED',
  MEMBERSHIP_REJECTED: 'MEMBERSHIP_REJECTED',
  MEMBERSHIP_SUSPENDED: 'MEMBERSHIP_SUSPENDED',
  MEMBERSHIP_RESTORED: 'MEMBERSHIP_RESTORED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  ROUND_CREATED: 'ROUND_CREATED',
  ROUND_UPDATED: 'ROUND_UPDATED',
  ROUND_STATUS_TRANSITION: 'ROUND_STATUS_TRANSITION',
  QUESTIONNAIRE_CREATED: 'QUESTIONNAIRE_CREATED',
  QUESTIONNAIRE_PUBLISHED: 'QUESTIONNAIRE_PUBLISHED',
  QUESTIONNAIRE_DUPLICATED: 'QUESTIONNAIRE_DUPLICATED',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const AuditLogItemSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  actorEmail: z.string(),
  actorRole: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  details: z.record(z.any()),
  ip: z.string().optional(),
  createdAt: z.string(),
});

export type AuditLogItem = z.infer<typeof AuditLogItemSchema>;

export const AuditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  entityType: z.string().optional(),
  action: z.string().optional(),
  actorId: z.string().optional(),
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

export const PaginatedAuditLogResponseSchema = z.object({
  items: z.array(AuditLogItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type PaginatedAuditLogResponse = z.infer<typeof PaginatedAuditLogResponseSchema>;
