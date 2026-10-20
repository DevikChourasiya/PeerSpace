import { z } from 'zod';

export enum ReportReason {
  HARASSMENT = 'harassment',
  OFFENSIVE_LANGUAGE = 'offensive_language',
  UNCONSTRUCTIVE = 'unconstructive',
  SPAM = 'spam',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum ModerationResolutionAction {
  HIDE_COMMENT = 'hide_comment',
  DISMISS = 'dismiss',
  RESTORE_COMMENT = 'restore_comment',
}

export const CreateFeedbackReportSchema = z.object({
  submissionId: z.string().min(1, 'Submission ID is required'),
  questionId: z.string().min(1, 'Question ID is required'),
  reason: z.nativeEnum(ReportReason, {
    errorMap: () => ({ message: 'Please select a valid report reason' }),
  }),
  explanation: z.string().max(1000, 'Explanation cannot exceed 1000 characters').optional(),
});

export type CreateFeedbackReportInput = z.infer<typeof CreateFeedbackReportSchema>;

export const ResolveFeedbackReportSchema = z.object({
  action: z.nativeEnum(ModerationResolutionAction, {
    errorMap: () => ({ message: 'Please select a valid moderation action' }),
  }),
  note: z
    .string()
    .min(2, 'Moderation note is required')
    .max(1000, 'Note cannot exceed 1000 characters'),
});

export type ResolveFeedbackReportInput = z.infer<typeof ResolveFeedbackReportSchema>;

export const FeedbackReportResponseSchema = z.object({
  id: z.string(),
  submissionId: z.string(),
  questionId: z.string(),
  questionTitle: z.string().optional(),
  roundTitle: z.string().optional(),
  reportedComment: z.string(),
  reporterId: z.string(),
  reporterName: z.string().optional(),
  reporterEmail: z.string().optional(),
  reason: z.nativeEnum(ReportReason),
  explanation: z.string().optional(),
  status: z.nativeEnum(ReportStatus),
  actionTaken: z.string().optional(),
  moderatedBy: z.string().optional(),
  moderatedAt: z.string().optional(),
  moderationNotes: z.string().optional(),
  isCommentHidden: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FeedbackReportResponse = z.infer<typeof FeedbackReportResponseSchema>;

export const PaginatedModerationReportsResponseSchema = z.object({
  items: z.array(FeedbackReportResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  pendingCount: z.number(),
});

export type PaginatedModerationReportsResponse = z.infer<
  typeof PaginatedModerationReportsResponseSchema
>;
