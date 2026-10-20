import { z } from 'zod';
import { QuestionType } from '../types/feedback.js';

export const ResponseItemSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  questionType: z.nativeEnum(QuestionType),
  value: z.any().optional(),
  rating: z.number().min(0).max(100).optional(),
  comment: z.string().max(2000).optional(),
});

export type ResponseItem = z.infer<typeof ResponseItemSchema>;

export const CreateSubmissionDraftSchema = z.object({
  targetStudentId: z.string().min(1, 'Target peer ID is required'),
  responses: z.array(ResponseItemSchema),
});

export type CreateSubmissionDraftInput = z.infer<typeof CreateSubmissionDraftSchema>;

export const SubmitEvaluationSchema = z.object({
  targetStudentId: z.string().min(1, 'Target peer ID is required'),
  responses: z.array(ResponseItemSchema),
});

export type SubmitEvaluationInput = z.infer<typeof SubmitEvaluationSchema>;

export const UpdateSubmissionSchema = z.object({
  responses: z.array(ResponseItemSchema),
});

export type UpdateSubmissionInput = z.infer<typeof UpdateSubmissionSchema>;

export const SubmissionResponseSchema = z.object({
  id: z.string(),
  roundId: z.string(),
  questionnaireVersionId: z.string(),
  reviewerId: z.string(),
  targetStudentId: z.string(),
  targetStudentName: z.string().optional(),
  status: z.enum(['draft', 'submitted']),
  responses: z.array(ResponseItemSchema),
  isAnonymous: z.boolean(),
  submittedAt: z.string().optional(),
  updatedAt: z.string(),
  createdAt: z.string(),
});

export type SubmissionResponse = z.infer<typeof SubmissionResponseSchema>;

export const PeerCandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  department: z.string().optional(),
  classSection: z.string().optional(),
  studentId: z.string().optional(),
  submissionStatus: z.enum(['not_started', 'draft', 'submitted']),
  submissionId: z.string().optional(),
  submittedAt: z.string().optional(),
});

export type PeerCandidate = z.infer<typeof PeerCandidateSchema>;

export const ReceivedFeedbackItemSchema = z.object({
  id: z.string(),
  roundId: z.string(),
  roundTitle: z.string(),
  reviewerDisplayName: z.string(), // e.g. "Anonymous Peer" or actual name
  isAnonymous: z.boolean(),
  submittedAt: z.string(),
  responses: z.array(
    z.object({
      questionId: z.string(),
      title: z.string(),
      category: z.string().optional(),
      questionType: z.nativeEnum(QuestionType),
      rating: z.number().optional(),
      value: z.any().optional(),
      comment: z.string().optional(),
      isCommentHidden: z.boolean().optional(),
    })
  ),
});

export type ReceivedFeedbackItem = z.infer<typeof ReceivedFeedbackItemSchema>;
