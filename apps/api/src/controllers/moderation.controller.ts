import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  ReportStatus,
  ModerationResolutionAction,
  CreateFeedbackReportSchema,
  ResolveFeedbackReportSchema,
  FeedbackVisibility,
  RoundStatus,
  AuditAction,
} from '@peerspace/shared';
import { FeedbackSubmission } from '../models/feedbackSubmission.model.js';
import { FeedbackReport } from '../models/feedbackReport.model.js';
import '../models/feedbackRound.model.js';
import '../models/questionnaireVersion.model.js';
import { logAuditEvent } from '../services/auditLog.service.js';

/**
 * Report an inappropriate feedback comment received by an authenticated student.
 */
export const reportFeedbackComment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
      return;
    }

    const parseResult = CreateFeedbackReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid report payload.',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const { submissionId, questionId, reason, explanation } = parseResult.data;

    if (!mongoose.isValidObjectId(submissionId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_SUBMISSION_ID', message: 'Invalid submission ID format.' },
      });
      return;
    }

    const submission = await FeedbackSubmission.findById(submissionId).populate<{
      roundId: any;
    }>('roundId');

    if (!submission || submission.status !== 'submitted') {
      res.status(404).json({
        success: false,
        error: { code: 'SUBMISSION_NOT_FOUND', message: 'Feedback submission not found.' },
      });
      return;
    }

    // Authorization: only the recipient student can report received feedback
    if (submission.targetStudentId.toString() !== currentUserId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED_FEEDBACK_ACCESS',
          message: 'You are only authorized to report feedback comments addressed to you.',
        },
      });
      return;
    }

    // Visibility check: ensure feedback is released and authorized for viewing
    const round = submission.roundId;
    if (!round) {
      res.status(404).json({
        success: false,
        error: { code: 'ROUND_NOT_FOUND', message: 'Associated feedback round not found.' },
      });
      return;
    }

    const now = new Date();
    let isVisible = false;
    const visibility = round.feedbackVisibility || FeedbackVisibility.AFTER_DEADLINE;

    if (visibility === FeedbackVisibility.IMMEDIATE) {
      isVisible = true;
    } else if (visibility === FeedbackVisibility.AFTER_DEADLINE) {
      isVisible =
        round.status === RoundStatus.CLOSED ||
        round.status === RoundStatus.ARCHIVED ||
        now > new Date(round.deadline);
    } else if (visibility === FeedbackVisibility.INSTRUCTOR_RELEASED) {
      isVisible = round.status === RoundStatus.CLOSED || round.status === RoundStatus.ARCHIVED;
    }

    if (!isVisible) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FEEDBACK_NOT_RELEASED',
          message: 'Feedback for this round has not been released yet.',
        },
      });
      return;
    }

    // Locate response item
    const responseItem = submission.responses.find((r) => r.questionId === questionId);
    if (!responseItem || !responseItem.comment || responseItem.comment.trim() === '') {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_COMMENT_TO_REPORT',
          message: 'The specified question does not contain a feedback comment to report.',
        },
      });
      return;
    }

    // Duplicate active report check: prevent multiple pending reports for the same comment
    const existingPendingReport = await FeedbackReport.findOne({
      submissionId,
      questionId,
      reporterId: currentUserId,
      status: ReportStatus.PENDING,
    });

    if (existingPendingReport) {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_REPORT',
          message: 'An active report for this feedback comment is already pending review.',
        },
      });
      return;
    }

    // Create report snapshotting the reported comment
    const report = await FeedbackReport.create({
      submissionId,
      questionId,
      reportedComment: responseItem.comment,
      reporterId: currentUserId,
      reason,
      explanation: explanation?.trim() || undefined,
      status: ReportStatus.PENDING,
    });

    // Record audit event
    await logAuditEvent({
      req,
      action: AuditAction.FEEDBACK_REPORTED,
      entityType: 'FeedbackReport',
      entityId: report.id,
      details: {
        submissionId: submission._id.toString(),
        questionId,
        reason,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: report.id,
        submissionId: report.submissionId.toString(),
        questionId: report.questionId,
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
      },
      message: 'Feedback comment reported successfully. A moderator will review it.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List moderation reports for administrators (paginated).
 */
export const getModerationReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (
      req.query.status &&
      Object.values(ReportStatus).includes(req.query.status as ReportStatus)
    ) {
      filter.status = req.query.status;
    }

    const [total, pendingCount, reports] = await Promise.all([
      FeedbackReport.countDocuments(filter),
      FeedbackReport.countDocuments({ status: ReportStatus.PENDING }),
      FeedbackReport.find(filter)
        .populate<{ reporterId: any }>('reporterId', 'name email classSection')
        .populate<{
          submissionId: any;
        }>({
          path: 'submissionId',
          select: 'roundId questionnaireVersionId responses',
          populate: [
            { path: 'roundId', select: 'title' },
            { path: 'questionnaireVersionId', select: 'questions' },
          ],
        })
        .populate<{ moderatedBy: any }>('moderatedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const items = reports.map((r: any) => {
      const submission = r.submissionId;
      const round = submission?.roundId;
      const version = submission?.questionnaireVersionId;
      const responseItem = (submission?.responses || []).find(
        (resp: any) => resp.questionId === r.questionId
      );
      const questionDef = (version?.questions || []).find((q: any) => q.id === r.questionId);

      return {
        id: r._id.toString(),
        submissionId: r.submissionId?._id
          ? r.submissionId._id.toString()
          : r.submissionId?.toString() || '',
        questionId: r.questionId,
        questionTitle: questionDef?.title || 'Question',
        roundTitle: round?.title || 'Evaluation Round',
        reportedComment: r.reportedComment,
        reporterId: r.reporterId?._id
          ? r.reporterId._id.toString()
          : r.reporterId?.toString() || '',
        reporterName: r.reporterId?.name || 'Student Reporter',
        reporterEmail: r.reporterId?.email || '',
        reason: r.reason,
        explanation: r.explanation,
        status: r.status,
        actionTaken: r.actionTaken,
        moderatedBy: r.moderatedBy?.name || undefined,
        moderatedAt: r.moderatedAt ? r.moderatedAt.toISOString() : undefined,
        moderationNotes: r.moderationNotes,
        isCommentHidden: !!responseItem?.isCommentHidden,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    res.status(200).json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        pendingCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Resolve a moderation report (hide comment, dismiss, restore).
 */
export const resolveModerationReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REPORT_ID', message: 'Invalid report ID format.' },
      });
      return;
    }

    const parseResult = ResolveFeedbackReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid moderation action payload.',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const { action, note } = parseResult.data;
    const moderatorId = req.user?.id;

    const report = await FeedbackReport.findById(id);
    if (!report) {
      res.status(404).json({
        success: false,
        error: { code: 'REPORT_NOT_FOUND', message: 'Moderation report not found.' },
      });
      return;
    }

    const now = new Date();

    if (action === ModerationResolutionAction.HIDE_COMMENT) {
      // Hide the comment in the submission while preserving ratings
      await FeedbackSubmission.updateOne(
        { _id: report.submissionId, 'responses.questionId': report.questionId },
        { $set: { 'responses.$.isCommentHidden': true } }
      );

      report.status = ReportStatus.RESOLVED;
      report.actionTaken = ModerationResolutionAction.HIDE_COMMENT;
      report.moderatedBy = moderatorId ? new mongoose.Types.ObjectId(moderatorId) : undefined;
      report.moderatedAt = now;
      report.moderationNotes = note;
      await report.save();
    } else if (action === ModerationResolutionAction.DISMISS) {
      report.status = ReportStatus.DISMISSED;
      report.actionTaken = ModerationResolutionAction.DISMISS;
      report.moderatedBy = moderatorId ? new mongoose.Types.ObjectId(moderatorId) : undefined;
      report.moderatedAt = now;
      report.moderationNotes = note;
      await report.save();
    } else if (action === ModerationResolutionAction.RESTORE_COMMENT) {
      // Restore the comment in the submission
      await FeedbackSubmission.updateOne(
        { _id: report.submissionId, 'responses.questionId': report.questionId },
        { $set: { 'responses.$.isCommentHidden': false } }
      );

      report.status = ReportStatus.RESOLVED;
      report.actionTaken = ModerationResolutionAction.RESTORE_COMMENT;
      report.moderatedBy = moderatorId ? new mongoose.Types.ObjectId(moderatorId) : undefined;
      report.moderatedAt = now;
      report.moderationNotes = note;
      await report.save();
    }

    // Log moderation action in audit trail
    await logAuditEvent({
      req,
      action: AuditAction.FEEDBACK_MODERATED,
      entityType: 'FeedbackReport',
      entityId: report.id,
      details: {
        action,
        submissionId: report.submissionId.toString(),
        questionId: report.questionId,
        note,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        id: report.id,
        submissionId: report.submissionId.toString(),
        questionId: report.questionId,
        status: report.status,
        actionTaken: report.actionTaken,
        moderatedAt: report.moderatedAt?.toISOString(),
        moderationNotes: report.moderationNotes,
      },
      message: `Moderation report successfully updated with action: ${action}.`,
    });
  } catch (err) {
    next(err);
  }
};
