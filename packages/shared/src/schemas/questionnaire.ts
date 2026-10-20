import { z } from 'zod';
import { QuestionType, QuestionnaireStatus } from '../types/feedback.js';

export const QuestionOptionSchema = z.string().trim().min(1, 'Option cannot be empty');

export const QuestionSchema = z.object({
  id: z.string().min(1, 'Question ID is required'),
  order: z.number().int().min(1, 'Order must be positive integer'),
  title: z
    .string()
    .trim()
    .min(1, 'Question title is required')
    .max(250, 'Title cannot exceed 250 characters'),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional(),
  category: z.string().trim().max(100, 'Category cannot exceed 100 characters').optional(),
  type: z.nativeEnum(QuestionType),
  required: z.boolean().default(true),
  options: z.array(QuestionOptionSchema).optional(),
  scaleMin: z.number().int().optional(),
  scaleMax: z.number().int().optional(),
  scaleLabels: z
    .object({
      min: z.string().trim().max(50).optional(),
      max: z.string().trim().max(50).optional(),
    })
    .optional(),
  maxLength: z.number().int().positive().max(5000).optional(),
});

export type Question = z.infer<typeof QuestionSchema>;

export const QuestionnaireCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional(),
  category: z.string().trim().max(100, 'Category cannot exceed 100 characters').default('General'),
  questions: z.array(QuestionSchema).default([]),
});

export type QuestionnaireCreateInput = z.infer<typeof QuestionnaireCreateSchema>;

export const QuestionnaireUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title cannot exceed 150 characters')
    .optional(),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional(),
  category: z.string().trim().max(100, 'Category cannot exceed 100 characters').optional(),
  questions: z.array(QuestionSchema).optional(),
});

export type QuestionnaireUpdateInput = z.infer<typeof QuestionnaireUpdateSchema>;

export const QuestionnaireVersionResponseSchema = z.object({
  id: z.string(),
  questionnaireId: z.string(),
  versionNumber: z.number().int(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string(),
  questions: z.array(QuestionSchema),
  publishedBy: z.string(),
  publishedAt: z.string().datetime().or(z.date()),
  createdAt: z.string().datetime().or(z.date()),
});

export type QuestionnaireVersionResponse = z.infer<typeof QuestionnaireVersionResponseSchema>;

export const QuestionnaireResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string(),
  status: z.nativeEnum(QuestionnaireStatus),
  currentVersion: z.number().int(),
  publishedVersionId: z.string().nullable().optional(),
  questions: z.array(QuestionSchema),
  createdBy: z.string(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  publishedVersion: QuestionnaireVersionResponseSchema.nullable().optional(),
});

export type QuestionnaireResponse = z.infer<typeof QuestionnaireResponseSchema>;
