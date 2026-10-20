import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  RoundStatus,
  UserRole,
  UserStatus,
  FeedbackRoundCreateSchema,
  FeedbackRoundUpdateSchema,
  RoundStatusTransitionSchema,
} from '@peerspace/shared';
import { FeedbackRound } from '../models/feedbackRound.model.js';
import { Questionnaire } from '../models/questionnaire.model.js';
import { QuestionnaireVersion } from '../models/questionnaireVersion.model.js';
import { User } from '../models/user.model.js';

/**
 * Validate lifecycle state transitions
 */
function isValidTransition(current: RoundStatus, target: RoundStatus): boolean {
  if (current === target) return true;

  switch (current) {
    case RoundStatus.DRAFT:
      return target === RoundStatus.SCHEDULED || target === RoundStatus.OPEN;
    case RoundStatus.SCHEDULED:
      return target === RoundStatus.DRAFT || target === RoundStatus.OPEN;
    case RoundStatus.OPEN:
      return target === RoundStatus.CLOSED;
    case RoundStatus.CLOSED:
      return target === RoundStatus.OPEN || target === RoundStatus.ARCHIVED;
    case RoundStatus.ARCHIVED:
      return false; // Terminal state
    default:
      return false;
  }
}

/**
 * List all rounds for administrators
 */
export const listAdminRounds = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};

    if (req.query.status && typeof req.query.status === 'string') {
      filter.status = req.query.status;
    }

    if (req.query.targetClass && typeof req.query.targetClass === 'string') {
      filter.targetClass = req.query.targetClass;
    }

    const rounds = await FeedbackRound.find(filter)
      .populate('questionnaireId', 'title category')
      .populate('questionnaireVersionId', 'versionNumber title questions')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: rounds.length,
      rounds: rounds.map((r) => {
        const q = r.questionnaireId as { _id?: unknown; title?: string } | null;
        const qv = r.questionnaireVersionId as {
          _id?: unknown;
          versionNumber?: number;
          title?: string;
        } | null;

        return {
          id: r._id.toString(),
          title: r.title,
          description: r.description,
          status: r.status,
          questionnaireId: q ? (q._id ? String(q._id) : String(r.questionnaireId)) : null,
          questionnaireTitle: q?.title,
          questionnaireVersionId: qv
            ? qv._id
              ? String(qv._id)
              : String(r.questionnaireVersionId)
            : null,
          questionnaireVersionNumber: qv?.versionNumber,
          startDate: r.startDate,
          deadline: r.deadline,
          isAnonymous: r.isAnonymous,
          allowSubmissionEdit: r.allowSubmissionEdit,
          submissionsPerPeer: r.submissionsPerPeer,
          feedbackVisibility: r.feedbackVisibility,
          targetClass: r.targetClass,
          eligibleStudentIds: r.eligibleStudentIds.map(String),
          createdBy: r.createdBy.toString(),
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new feedback round
 */
export const createRound = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parseResult = FeedbackRoundCreateSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid feedback round data.',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const data = parseResult.data;
    const adminId = new mongoose.Types.ObjectId(req.user!.id);

    let questionnaireId: mongoose.Types.ObjectId | undefined;
    let questionnaireVersionId: mongoose.Types.ObjectId | undefined;

    if (data.questionnaireId) {
      if (!mongoose.isValidObjectId(data.questionnaireId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUESTIONNAIRE_ID',
            message: 'Invalid questionnaire ID format.',
          },
        });
        return;
      }

      const q = await Questionnaire.findById(data.questionnaireId);
      if (!q) {
        res.status(404).json({
          success: false,
          error: {
            code: 'QUESTIONNAIRE_NOT_FOUND',
            message: 'Specified questionnaire not found.',
          },
        });
        return;
      }

      questionnaireId = q._id as mongoose.Types.ObjectId;

      if (data.questionnaireVersionId) {
        if (!mongoose.isValidObjectId(data.questionnaireVersionId)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_VERSION_ID',
              message: 'Invalid questionnaire version ID.',
            },
          });
          return;
        }

        const qv = await QuestionnaireVersion.findById(data.questionnaireVersionId);
        if (!qv) {
          res.status(404).json({
            success: false,
            error: {
              code: 'VERSION_NOT_FOUND',
              message: 'Specified questionnaire version not found.',
            },
          });
          return;
        }
        questionnaireVersionId = qv._id as mongoose.Types.ObjectId;
      } else if (q.publishedVersionId) {
        questionnaireVersionId = q.publishedVersionId;
      }
    }

    const round = await FeedbackRound.create({
      title: data.title,
      description: data.description,
      status: RoundStatus.DRAFT,
      questionnaireId,
      questionnaireVersionId,
      startDate: new Date(data.startDate),
      deadline: new Date(data.deadline),
      isAnonymous: data.isAnonymous ?? true,
      allowSubmissionEdit: data.allowSubmissionEdit ?? true,
      submissionsPerPeer: data.submissionsPerPeer ?? 1,
      feedbackVisibility: data.feedbackVisibility,
      targetClass: data.targetClass || 'CS-401',
      eligibleStudentIds: (data.eligibleStudentIds || []).map(
        (id) => new mongoose.Types.ObjectId(id)
      ),
      createdBy: adminId,
    });

    res.status(201).json({
      success: true,
      message: 'Feedback round created in draft status.',
      round: round.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get round detail by ID with questionnaire version and progress
 */
export const getRoundById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ROUND_ID',
          message: 'Invalid round ID format.',
        },
      });
      return;
    }

    const round = await FeedbackRound.findById(id)
      .populate('questionnaireId', 'title category')
      .populate('questionnaireVersionId')
      .lean();

    if (!round) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ROUND_NOT_FOUND',
          message: 'Feedback round not found.',
        },
      });
      return;
    }

    // Calculate eligible students count
    const studentQuery: Record<string, unknown> = {
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    };

    if (round.eligibleStudentIds && round.eligibleStudentIds.length > 0) {
      studentQuery._id = { $in: round.eligibleStudentIds };
    } else if (round.targetClass) {
      studentQuery.classSection = round.targetClass;
    }

    const totalEligible = await User.countDocuments(studentQuery);

    const q = round.questionnaireId as { _id?: unknown; title?: string } | null;
    const qv = round.questionnaireVersionId as {
      _id?: unknown;
      versionNumber?: number;
      title?: string;
      questions?: unknown[];
    } | null;

    res.status(200).json({
      success: true,
      round: {
        id: round._id.toString(),
        title: round.title,
        description: round.description,
        status: round.status,
        questionnaireId: q ? (q._id ? String(q._id) : String(round.questionnaireId)) : null,
        questionnaireTitle: q?.title,
        questionnaireVersionId: qv
          ? qv._id
            ? String(qv._id)
            : String(round.questionnaireVersionId)
          : null,
        questionnaireVersionNumber: qv?.versionNumber,
        questionnaireVersion: round.questionnaireVersionId,
        startDate: round.startDate,
        deadline: round.deadline,
        isAnonymous: round.isAnonymous,
        allowSubmissionEdit: round.allowSubmissionEdit,
        submissionsPerPeer: round.submissionsPerPeer,
        feedbackVisibility: round.feedbackVisibility,
        targetClass: round.targetClass,
        eligibleStudentIds: round.eligibleStudentIds.map(String),
        createdBy: round.createdBy.toString(),
        createdAt: round.createdAt,
        updatedAt: round.updatedAt,
        progress: {
          roundId: round._id.toString(),
          totalEligible,
          totalSubmitted: 0,
          totalPending: totalEligible,
          completionPercentage: 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update feedback round configuration
 */
export const updateRound = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ROUND_ID',
          message: 'Invalid round ID format.',
        },
      });
      return;
    }

    const parseResult = FeedbackRoundUpdateSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid round update payload.',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const round = await FeedbackRound.findById(id);

    if (!round) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ROUND_NOT_FOUND',
          message: 'Feedback round not found.',
        },
      });
      return;
    }

    if (round.status === RoundStatus.ARCHIVED) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ROUND_ARCHIVED',
          message: 'Archived feedback rounds cannot be modified.',
        },
      });
      return;
    }

    const data = parseResult.data;

    // If changing questionnaire version, verify it exists and is published
    if (data.questionnaireVersionId) {
      if (!mongoose.isValidObjectId(data.questionnaireVersionId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_VERSION_ID',
            message: 'Invalid questionnaire version ID.',
          },
        });
        return;
      }

      const qv = await QuestionnaireVersion.findById(data.questionnaireVersionId);
      if (!qv) {
        res.status(404).json({
          success: false,
          error: {
            code: 'VERSION_NOT_FOUND',
            message: 'Questionnaire version not found.',
          },
        });
        return;
      }
      round.questionnaireVersionId = qv._id as mongoose.Types.ObjectId;
      round.questionnaireId = qv.questionnaireId;
    }

    if (data.title !== undefined) round.title = data.title;
    if (data.description !== undefined) round.description = data.description;
    if (data.startDate !== undefined) round.startDate = new Date(data.startDate);
    if (data.deadline !== undefined) round.deadline = new Date(data.deadline);
    if (data.isAnonymous !== undefined) round.isAnonymous = data.isAnonymous;
    if (data.allowSubmissionEdit !== undefined)
      round.allowSubmissionEdit = data.allowSubmissionEdit;
    if (data.submissionsPerPeer !== undefined) round.submissionsPerPeer = data.submissionsPerPeer;
    if (data.feedbackVisibility !== undefined) round.feedbackVisibility = data.feedbackVisibility;
    if (data.targetClass !== undefined) round.targetClass = data.targetClass;
    if (data.eligibleStudentIds !== undefined) {
      round.eligibleStudentIds = data.eligibleStudentIds.map(
        (stId) => new mongoose.Types.ObjectId(stId)
      );
    }

    await round.save();

    res.status(200).json({
      success: true,
      message: 'Feedback round updated successfully.',
      round: round.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Transition feedback round lifecycle state (draft -> scheduled -> open -> closed -> archived)
 */
export const transitionRoundStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ROUND_ID',
          message: 'Invalid round ID format.',
        },
      });
      return;
    }

    const parseResult = RoundStatusTransitionSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status transition payload.',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const { status: targetStatus } = parseResult.data;
    const round = await FeedbackRound.findById(id);

    if (!round) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ROUND_NOT_FOUND',
          message: 'Feedback round not found.',
        },
      });
      return;
    }

    // Check transition validity
    if (!isValidTransition(round.status, targetStatus)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition round from status "${round.status}" to "${targetStatus}".`,
        },
      });
      return;
    }

    // Transitioning to SCHEDULED or OPEN requires a published questionnaire version
    if (targetStatus === RoundStatus.SCHEDULED || targetStatus === RoundStatus.OPEN) {
      if (!round.questionnaireVersionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'QUESTIONNAIRE_REQUIRED',
            message:
              'Cannot open or schedule a feedback round without an associated published questionnaire version.',
          },
        });
        return;
      }

      const qv = await QuestionnaireVersion.findById(round.questionnaireVersionId);
      if (!qv) {
        res.status(400).json({
          success: false,
          error: {
            code: 'QUESTIONNAIRE_REQUIRED',
            message: 'Associated questionnaire version is invalid or missing.',
          },
        });
        return;
      }

      // Check deadline
      if (new Date(round.deadline) <= new Date()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'DEADLINE_EXPIRED',
            message:
              'Cannot launch round because deadline is in the past. Please extend the deadline first.',
          },
        });
        return;
      }
    }

    round.status = targetStatus;
    await round.save();

    res.status(200).json({
      success: true,
      message: `Feedback round status transitioned to "${targetStatus}".`,
      round: round.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get round progress summary
 */
export const getRoundProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ROUND_ID',
          message: 'Invalid round ID format.',
        },
      });
      return;
    }

    const round = await FeedbackRound.findById(id).lean();

    if (!round) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ROUND_NOT_FOUND',
          message: 'Feedback round not found.',
        },
      });
      return;
    }

    const studentFilter: Record<string, unknown> = {
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    };

    if (round.eligibleStudentIds && round.eligibleStudentIds.length > 0) {
      studentFilter._id = { $in: round.eligibleStudentIds };
    } else if (round.targetClass) {
      studentFilter.classSection = round.targetClass;
    }

    const totalEligible = await User.countDocuments(studentFilter);

    res.status(200).json({
      success: true,
      progress: {
        roundId: round._id.toString(),
        totalEligible,
        totalSubmitted: 0,
        totalPending: totalEligible,
        completionPercentage: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List rounds accessible to the signed-in student
 * Only rounds in SCHEDULED, OPEN, or CLOSED status are returned
 */
export const listStudentRounds = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studentUser = req.user!;
    const studentDoc = await User.findById(studentUser.id).lean();

    const studentClass = studentDoc?.classSection || 'CS-401';
    const studentIdObj = new mongoose.Types.ObjectId(studentUser.id);

    const rounds = await FeedbackRound.find({
      status: { $in: [RoundStatus.OPEN, RoundStatus.SCHEDULED, RoundStatus.CLOSED] },
      $or: [
        { eligibleStudentIds: studentIdObj },
        { targetClass: studentClass, eligibleStudentIds: { $size: 0 } },
        { targetClass: { $exists: false }, eligibleStudentIds: { $size: 0 } },
      ],
    })
      .populate('questionnaireVersionId', 'title category questions')
      .sort({ deadline: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: rounds.length,
      rounds: rounds.map((r) => {
        const qv = r.questionnaireVersionId as {
          _id?: unknown;
          title?: string;
          questions?: unknown[];
        } | null;

        return {
          id: r._id.toString(),
          title: r.title,
          description: r.description,
          status: r.status,
          startDate: r.startDate,
          deadline: r.deadline,
          isAnonymous: r.isAnonymous,
          allowSubmissionEdit: r.allowSubmissionEdit,
          submissionsPerPeer: r.submissionsPerPeer,
          feedbackVisibility: r.feedbackVisibility,
          targetClass: r.targetClass,
          questionnaireId: r.questionnaireId ? r.questionnaireId.toString() : undefined,
          questionnaireVersionId: r.questionnaireVersionId
            ? (qv as any)?._id?.toString() || r.questionnaireVersionId.toString()
            : undefined,
          questionnaireTitle: qv?.title,
          questionCount: Array.isArray(qv?.questions) ? qv.questions.length : 0,
          createdAt: r.createdAt,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
};
