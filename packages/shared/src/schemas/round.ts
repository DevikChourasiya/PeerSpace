import { z } from 'zod';
import { RoundStatus, FeedbackVisibility } from '../types/feedback.js';
import { QuestionnaireVersionResponseSchema } from './questionnaire.js';

export const FeedbackRoundCreateSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(150, 'Title cannot exceed 150 characters'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional(),
    questionnaireId: z.string().optional(),
    questionnaireVersionId: z.string().optional(),
    startDate: z.string().datetime({ message: 'Start date must be a valid ISO datetime' }),
    deadline: z.string().datetime({ message: 'Deadline must be a valid ISO datetime' }),
    isAnonymous: z.boolean().default(true),
    allowSubmissionEdit: z.boolean().default(true),
    submissionsPerPeer: z
      .number()
      .int()
      .min(1, 'At least 1 submission per peer required')
      .max(10, 'Submissions per peer cannot exceed 10')
      .default(1),
    feedbackVisibility: z.nativeEnum(FeedbackVisibility).default(FeedbackVisibility.AFTER_DEADLINE),
    targetClass: z.string().trim().max(100).default('CS-401'),
    eligibleStudentIds: z.array(z.string()).default([]),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.deadline);
      return end > start;
    },
    {
      message: 'Deadline must be after the start date',
      path: ['deadline'],
    }
  );

export type FeedbackRoundCreateInput = z.infer<typeof FeedbackRoundCreateSchema>;

export const FeedbackRoundUpdateSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(150, 'Title cannot exceed 150 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional(),
    questionnaireId: z.string().optional(),
    questionnaireVersionId: z.string().optional(),
    startDate: z
      .string()
      .datetime({ message: 'Start date must be a valid ISO datetime' })
      .optional(),
    deadline: z.string().datetime({ message: 'Deadline must be a valid ISO datetime' }).optional(),
    isAnonymous: z.boolean().optional(),
    allowSubmissionEdit: z.boolean().optional(),
    submissionsPerPeer: z.number().int().min(1).max(10).optional(),
    feedbackVisibility: z.nativeEnum(FeedbackVisibility).optional(),
    targetClass: z.string().trim().max(100).optional(),
    eligibleStudentIds: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.deadline) {
        return new Date(data.deadline) > new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'Deadline must be after the start date',
      path: ['deadline'],
    }
  );

export type FeedbackRoundUpdateInput = z.infer<typeof FeedbackRoundUpdateSchema>;

export const RoundStatusTransitionSchema = z.object({
  status: z.nativeEnum(RoundStatus),
  reason: z.string().trim().max(500).optional(),
});

export type RoundStatusTransitionInput = z.infer<typeof RoundStatusTransitionSchema>;

export const FeedbackRoundProgressSchema = z.object({
  roundId: z.string(),
  totalEligible: z.number().int().min(0),
  totalSubmitted: z.number().int().min(0),
  totalPending: z.number().int().min(0),
  completionPercentage: z.number().min(0).max(100),
});

export type FeedbackRoundProgress = z.infer<typeof FeedbackRoundProgressSchema>;

export const FeedbackRoundResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.nativeEnum(RoundStatus),
  questionnaireId: z.string().nullable().optional(),
  questionnaireVersionId: z.string().nullable().optional(),
  questionnaireTitle: z.string().optional(),
  questionnaireVersionNumber: z.number().int().optional(),
  questionnaireVersion: QuestionnaireVersionResponseSchema.nullable().optional(),
  startDate: z.string().datetime().or(z.date()),
  deadline: z.string().datetime().or(z.date()),
  isAnonymous: z.boolean(),
  allowSubmissionEdit: z.boolean(),
  submissionsPerPeer: z.number().int(),
  feedbackVisibility: z.nativeEnum(FeedbackVisibility),
  targetClass: z.string(),
  eligibleStudentIds: z.array(z.string()),
  createdBy: z.string(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  progress: FeedbackRoundProgressSchema.optional(),
});

export type FeedbackRoundResponse = z.infer<typeof FeedbackRoundResponseSchema>;
