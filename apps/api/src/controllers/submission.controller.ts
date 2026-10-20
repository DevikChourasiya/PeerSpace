import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  RoundStatus,
  QuestionType,
  SubmitEvaluationSchema,
  CreateSubmissionDraftSchema,
  UpdateSubmissionSchema,
} from '@peerspace/shared';
import { FeedbackRound } from '../models/feedbackRound.model.js';
import { QuestionnaireVersion } from '../models/questionnaireVersion.model.js';
import { FeedbackSubmission } from '../models/feedbackSubmission.model.js';
import { User } from '../models/user.model.js';

/**
 * Helper to check whether a user belongs to the round's target class / eligible students.
 */
export function isUserEligibleForRound(
  user: { _id?: any; id?: any; role?: string; classSection?: string },
  round: { targetClass?: string; eligibleStudentIds?: (mongoose.Types.ObjectId | string)[] }
): boolean {
  if (user.role === 'admin') {
    return true;
  }

  const userIdStr = user._id ? user._id.toString() : user.id ? user.id.toString() : '';

  // If explicit eligibleStudentIds list is provided, user must be included
  if (round.eligibleStudentIds && round.eligibleStudentIds.length > 0) {
    const isIncluded = round.eligibleStudentIds.some((id) => id.toString() === userIdStr);
    if (!isIncluded) {
      return false;
    }
  }

  // If targetClass is set, user's classSection must match
  if (round.targetClass) {
    if (user.classSection !== round.targetClass) {
      return false;
    }
  }

  return true;
}

/**
 * Returns the published questionnaire rubric version linked to a feedback round.
 * Accessible to authorized students and administrators.
 */
export const getRoundRubric = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: roundId } = req.params;
    const currentUserId = req.user?.id;

    if (!mongoose.isValidObjectId(roundId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ROUND_ID', message: 'Invalid feedback round ID format.' },
      });
      return;
    }

    const round = await FeedbackRound.findById(roundId).lean();
    if (!round) {
      res.status(404).json({
        success: false,
        error: { code: 'ROUND_NOT_FOUND', message: 'Feedback round not found.' },
      });
      return;
    }

    const reviewer = await User.findById(currentUserId).lean();
    if (!reviewer || !isUserEligibleForRound(reviewer, round)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'REVIEWER_NOT_ELIGIBLE',
          message:
            'You are not eligible to participate in or view rubrics for this feedback round.',
        },
      });
      return;
    }

    if (!round.questionnaireVersionId) {
      res.status(404).json({
        success: false,
        error: {
          code: 'RUBRIC_NOT_ASSIGNED',
          message: 'No questionnaire rubric has been assigned to this round.',
        },
      });
      return;
    }

    const version = await QuestionnaireVersion.findById(round.questionnaireVersionId).lean();
    if (!version) {
      res.status(404).json({
        success: false,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: 'Questionnaire rubric version not found.',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      version: {
        id: version._id.toString(),
        questionnaireId: version.questionnaireId.toString(),
        versionNumber: version.versionNumber,
        title: version.title,
        description: version.description,
        category: version.category,
        questions: version.questions,
        publishedBy: version.publishedBy.toString(),
        publishedAt: version.publishedAt,
        createdAt: version.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Returns eligible peer candidates in the round's cohort for the authenticated student.
 */
export const getPeerCandidates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: roundId } = req.params;
    const currentUserId = req.user?.id;

    if (!mongoose.isValidObjectId(roundId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ROUND_ID', message: 'Invalid feedback round ID format.' },
      });
      return;
    }

    const round = await FeedbackRound.findById(roundId);
    if (!round) {
      res.status(404).json({
        success: false,
        error: { code: 'ROUND_NOT_FOUND', message: 'Feedback round not found.' },
      });
      return;
    }

    const reviewer = await User.findById(currentUserId).lean();
    if (!reviewer || !isUserEligibleForRound(reviewer, round)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'REVIEWER_NOT_ELIGIBLE',
          message: 'You are not eligible to participate in this feedback round.',
        },
      });
      return;
    }

    // Cohort peers query: active students with matching classSection (or eligible list), excluding self
    const peerFilter: Record<string, any> = {
      _id: { $ne: new mongoose.Types.ObjectId(currentUserId) },
      role: 'student',
      status: 'active',
    };

    if (round.targetClass) {
      peerFilter.classSection = round.targetClass;
    }

    if (round.eligibleStudentIds && round.eligibleStudentIds.length > 0) {
      peerFilter._id = {
        $in: round.eligibleStudentIds.filter((id) => id.toString() !== currentUserId),
      };
    }

    const [peers, existingSubmissions] = await Promise.all([
      User.find(peerFilter)
        .select('name email department classSection studentId')
        .sort({ name: 1 })
        .lean(),
      FeedbackSubmission.find({
        roundId,
        reviewerId: currentUserId,
      }).lean(),
    ]);

    const submissionMap = new Map<string, any>();
    for (const sub of existingSubmissions) {
      submissionMap.set(sub.targetStudentId.toString(), sub);
    }

    const candidates = peers.map((p) => {
      const pId = p._id.toString();
      const existing = submissionMap.get(pId);

      return {
        id: pId,
        name: p.name,
        department: p.department,
        classSection: p.classSection,
        studentId: p.studentId,
        submissionStatus: existing ? existing.status : 'not_started',
        submissionId: existing ? existing._id.toString() : undefined,
        submittedAt: existing?.submittedAt ? existing.submittedAt.toISOString() : undefined,
      };
    });

    const submittedCount = existingSubmissions.filter((s) => s.status === 'submitted').length;

    res.status(200).json({
      success: true,
      data: {
        roundId: round.id,
        roundTitle: round.title,
        submissionsPerPeer: round.submissionsPerPeer || 1,
        submittedCount,
        candidates,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves reviewer's existing submission (draft or submitted) for a specific peer.
 */
export const getPeerSubmission = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: roundId, peerId } = req.params;
    const currentUserId = req.user?.id;

    if (!mongoose.isValidObjectId(roundId) || !mongoose.isValidObjectId(peerId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid round ID or peer ID format.' },
      });
      return;
    }

    const submission = await FeedbackSubmission.findOne({
      roundId,
      reviewerId: currentUserId,
      targetStudentId: peerId,
    }).lean();

    res.status(200).json({
      success: true,
      data: submission
        ? {
            id: submission._id.toString(),
            roundId: submission.roundId.toString(),
            questionnaireVersionId: submission.questionnaireVersionId.toString(),
            reviewerId: submission.reviewerId.toString(),
            targetStudentId: submission.targetStudentId.toString(),
            status: submission.status,
            responses: submission.responses,
            isAnonymous: submission.isAnonymous,
            submittedAt: submission.submittedAt?.toISOString(),
            createdAt: submission.createdAt.toISOString(),
            updatedAt: submission.updatedAt.toISOString(),
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Saves or updates a draft evaluation without enforcing complete required question answers.
 */
export const saveSubmissionDraft = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: roundId } = req.params;
    const currentUserId = req.user?.id;

    if (!mongoose.isValidObjectId(roundId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ROUND_ID', message: 'Invalid round ID.' },
      });
      return;
    }

    const parsed = CreateSubmissionDraftSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid submission draft format.',
          details: parsed.error.format(),
        },
      });
      return;
    }

    const { targetStudentId, responses } = parsed.data;

    if (!mongoose.isValidObjectId(targetStudentId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_PEER_ID', message: 'Invalid target peer ID.' },
      });
      return;
    }

    if (targetStudentId === currentUserId) {
      res.status(400).json({
        success: false,
        error: { code: 'SELF_REVIEW_PROHIBITED', message: 'You cannot evaluate yourself.' },
      });
      return;
    }

    const round = await FeedbackRound.findById(roundId);
    if (!round) {
      res.status(404).json({
        success: false,
        error: { code: 'ROUND_NOT_FOUND', message: 'Feedback round not found.' },
      });
      return;
    }

    if (round.status !== RoundStatus.OPEN && round.status !== RoundStatus.SCHEDULED) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ROUND_NOT_OPEN',
          message: `Submissions are not permitted when round is in "${round.status}" status.`,
        },
      });
      return;
    }

    if (new Date() > new Date(round.deadline)) {
      res.status(400).json({
        success: false,
        error: { code: 'DEADLINE_PASSED', message: 'The submission deadline has passed.' },
      });
      return;
    }

    // Verify reviewer eligibility for round
    const reviewer = await User.findById(currentUserId).lean();
    if (!reviewer || !isUserEligibleForRound(reviewer, round)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'REVIEWER_NOT_ELIGIBLE',
          message: 'You are not eligible to participate in this feedback round.',
        },
      });
      return;
    }

    // Verify target student exists, is an active student, and belongs to permitted cohort
    const targetUser = await User.findById(targetStudentId).lean();
    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: { code: 'TARGET_NOT_FOUND', message: 'Target peer not found.' },
      });
      return;
    }

    if (targetUser.role !== 'student') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TARGET_PEER', message: 'Target user must be a student.' },
      });
      return;
    }

    if (targetUser.status !== 'active') {
      res.status(400).json({
        success: false,
        error: { code: 'PEER_NOT_ACTIVE', message: 'Target student account is not active.' },
      });
      return;
    }

    if (!isUserEligibleForRound(targetUser, round)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'PEER_NOT_IN_COHORT',
          message: 'Target student is not in the permitted cohort for this feedback round.',
        },
      });
      return;
    }

    let submission = await FeedbackSubmission.findOne({
      roundId,
      reviewerId: currentUserId,
      targetStudentId,
    });

    if (submission && submission.status === 'submitted') {
      res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_SUBMITTED',
          message: 'Final evaluation has already been submitted for this peer.',
        },
      });
      return;
    }

    if (!submission) {
      submission = new FeedbackSubmission({
        roundId,
        questionnaireVersionId: round.questionnaireVersionId,
        reviewerId: currentUserId,
        targetStudentId,
        status: 'draft',
        responses,
        isAnonymous: round.isAnonymous,
      });
    } else {
      submission.responses = responses as any;
      submission.isAnonymous = round.isAnonymous;
    }

    await submission.save();

    res.status(200).json({
      success: true,
      message: 'Draft saved successfully.',
      data: submission.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Finalizes and submits an evaluation after validating all required questions and rubric constraints.
 */
export const submitFinalEvaluation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: roundId } = req.params;
    const currentUserId = req.user?.id;

    if (!mongoose.isValidObjectId(roundId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ROUND_ID', message: 'Invalid round ID.' },
      });
      return;
    }

    const parsed = SubmitEvaluationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid submission payload.',
          details: parsed.error.format(),
        },
      });
      return;
    }

    const { targetStudentId, responses } = parsed.data;

    if (!mongoose.isValidObjectId(targetStudentId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_PEER_ID', message: 'Invalid target peer ID.' },
      });
      return;
    }

    if (targetStudentId === currentUserId) {
      res.status(400).json({
        success: false,
        error: { code: 'SELF_REVIEW_PROHIBITED', message: 'You cannot evaluate yourself.' },
      });
      return;
    }

    const round = await FeedbackRound.findById(roundId);
    if (!round) {
      res.status(404).json({
        success: false,
        error: { code: 'ROUND_NOT_FOUND', message: 'Feedback round not found.' },
      });
      return;
    }

    if (round.status !== RoundStatus.OPEN) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ROUND_NOT_OPEN',
          message: `Evaluation can only be submitted when round status is "open". Current status is "${round.status}".`,
        },
      });
      return;
    }

    if (new Date() > new Date(round.deadline)) {
      res.status(400).json({
        success: false,
        error: { code: 'DEADLINE_PASSED', message: 'The submission deadline has passed.' },
      });
      return;
    }

    // Verify reviewer eligibility for round
    const reviewer = await User.findById(currentUserId).lean();
    if (!reviewer || !isUserEligibleForRound(reviewer, round)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'REVIEWER_NOT_ELIGIBLE',
          message: 'You are not eligible to participate in this feedback round.',
        },
      });
      return;
    }

    // Verify target student exists, is an active student, and belongs to permitted cohort
    const targetUser = await User.findById(targetStudentId).lean();
    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: { code: 'TARGET_NOT_FOUND', message: 'Target peer not found.' },
      });
      return;
    }

    if (targetUser.role !== 'student') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TARGET_PEER', message: 'Target user must be a student.' },
      });
      return;
    }

    if (targetUser.status !== 'active') {
      res.status(400).json({
        success: false,
        error: { code: 'PEER_NOT_ACTIVE', message: 'Target student account is not active.' },
      });
      return;
    }

    if (!isUserEligibleForRound(targetUser, round)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'PEER_NOT_IN_COHORT',
          message: 'Target student is not in the permitted cohort for this feedback round.',
        },
      });
      return;
    }

    // Verify submission limit
    const existingSubmittedCount = await FeedbackSubmission.countDocuments({
      roundId,
      reviewerId: currentUserId,
      targetStudentId: { $ne: targetStudentId },
      status: 'submitted',
    });

    const maxAllowed = round.submissionsPerPeer || 1;
    if (existingSubmittedCount >= maxAllowed) {
      res.status(403).json({
        success: false,
        error: {
          code: 'SUBMISSION_LIMIT_EXCEEDED',
          message: `You have reached the maximum allowed submissions (${maxAllowed}) for this round.`,
        },
      });
      return;
    }

    // Validate responses against the frozen QuestionnaireVersion
    const version = await QuestionnaireVersion.findById(round.questionnaireVersionId);
    if (!version) {
      res.status(500).json({
        success: false,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: 'The linked questionnaire rubric version was not found.',
        },
      });
      return;
    }

    const responseMap = new Map<string, any>();
    for (const r of responses) {
      responseMap.set(r.questionId, r);
    }

    for (const question of version.questions) {
      const resp = responseMap.get(question.id);

      if (question.required) {
        if (!resp) {
          res.status(400).json({
            success: false,
            error: {
              code: 'REQUIRED_QUESTION_MISSING',
              message: `Question "${question.title}" is required.`,
            },
          });
          return;
        }

        const hasRating = resp.rating !== undefined && resp.rating !== null;
        const hasValue = resp.value !== undefined && resp.value !== null && resp.value !== '';
        if (!hasRating && !hasValue) {
          res.status(400).json({
            success: false,
            error: {
              code: 'REQUIRED_QUESTION_EMPTY',
              message: `Please provide an answer for "${question.title}".`,
            },
          });
          return;
        }
      }

      // Check rating bounds if rating provided
      if (resp && resp.rating !== undefined && resp.rating !== null) {
        if (question.type === QuestionType.STAR_RATING) {
          const maxStars = question.scaleMax || 5;
          if (resp.rating < 1 || resp.rating > maxStars) {
            res.status(400).json({
              success: false,
              error: {
                code: 'INVALID_RATING_BOUND',
                message: `Rating for "${question.title}" must be between 1 and ${maxStars}.`,
              },
            });
            return;
          }
        } else if (question.type === QuestionType.NUMERIC_RATING) {
          const min = question.scaleMin ?? 1;
          const max = question.scaleMax ?? 10;
          if (resp.rating < min || resp.rating > max) {
            res.status(400).json({
              success: false,
              error: {
                code: 'INVALID_RATING_BOUND',
                message: `Numeric score for "${question.title}" must be between ${min} and ${max}.`,
              },
            });
            return;
          }
        }
      }
    }

    // Upsert submission as submitted
    let submission = await FeedbackSubmission.findOne({
      roundId,
      reviewerId: currentUserId,
      targetStudentId,
    });

    if (submission && submission.status === 'submitted') {
      res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_SUBMITTED',
          message: 'An evaluation for this peer has already been finalized and submitted.',
        },
      });
      return;
    }

    if (!submission) {
      submission = new FeedbackSubmission({
        roundId,
        questionnaireVersionId: round.questionnaireVersionId,
        reviewerId: currentUserId,
        targetStudentId,
        status: 'submitted',
        responses,
        isAnonymous: round.isAnonymous,
        submittedAt: new Date(),
      });
    } else {
      submission.status = 'submitted';
      submission.responses = responses as any;
      submission.isAnonymous = round.isAnonymous;
      submission.submittedAt = new Date();
    }

    await submission.save();

    res.status(201).json({
      success: true,
      message: 'Peer evaluation finalized and submitted successfully.',
      data: submission.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Updates an already submitted evaluation before the deadline (if allowed by round settings).
 */
export const updateSubmission = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: roundId, submissionId } = req.params;
    const currentUserId = req.user?.id;

    if (!mongoose.isValidObjectId(roundId) || !mongoose.isValidObjectId(submissionId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid round ID or submission ID format.' },
      });
      return;
    }

    const parsed = UpdateSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid submission update payload.',
          details: parsed.error.format(),
        },
      });
      return;
    }

    const round = await FeedbackRound.findById(roundId);
    if (!round) {
      res.status(404).json({
        success: false,
        error: { code: 'ROUND_NOT_FOUND', message: 'Feedback round not found.' },
      });
      return;
    }

    if (!round.allowSubmissionEdit) {
      res.status(403).json({
        success: false,
        error: {
          code: 'SUBMISSION_EDIT_NOT_ALLOWED',
          message: 'This round does not permit editing submitted evaluations.',
        },
      });
      return;
    }

    if (round.status !== RoundStatus.OPEN) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ROUND_NOT_OPEN',
          message: 'Submissions can only be edited while round status is "open".',
        },
      });
      return;
    }

    if (new Date() > new Date(round.deadline)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DEADLINE_PASSED',
          message: 'Deadline has passed. Edits are no longer accepted.',
        },
      });
      return;
    }

    const submission = await FeedbackSubmission.findOne({
      _id: submissionId,
      roundId,
      reviewerId: currentUserId,
    });

    if (!submission) {
      res.status(404).json({
        success: false,
        error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found or unauthorized.' },
      });
      return;
    }

    submission.responses = parsed.data.responses as any;
    submission.updatedAt = new Date();
    await submission.save();

    res.status(200).json({
      success: true,
      message: 'Submission updated successfully.',
      data: submission.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};
