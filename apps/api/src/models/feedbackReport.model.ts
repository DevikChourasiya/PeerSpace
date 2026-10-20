import mongoose, { Document, Schema, Model } from 'mongoose';
import { ReportReason, ReportStatus, ModerationResolutionAction } from '@peerspace/shared';

export interface IFeedbackReport extends Document {
  submissionId: mongoose.Types.ObjectId;
  questionId: string;
  reportedComment: string;
  reporterId: mongoose.Types.ObjectId;
  reason: ReportReason;
  explanation?: string;
  status: ReportStatus;
  actionTaken?: ModerationResolutionAction;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  moderationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackReportSchema = new Schema<IFeedbackReport>(
  {
    submissionId: {
      type: Schema.Types.ObjectId,
      ref: 'FeedbackSubmission',
      required: true,
      index: true,
    },
    questionId: {
      type: String,
      required: true,
    },
    reportedComment: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: Object.values(ReportReason),
      required: true,
    },
    explanation: {
      type: String,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.PENDING,
      index: true,
    },
    actionTaken: {
      type: String,
      enum: Object.values(ModerationResolutionAction),
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    moderatedAt: {
      type: Date,
    },
    moderationNotes: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id.toString();
        ret.submissionId = ret.submissionId?.toString();
        ret.reporterId = ret.reporterId?.toString();
        if (ret.moderatedBy) {
          ret.moderatedBy = ret.moderatedBy.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Query optimization indexes
feedbackReportSchema.index({ status: 1, createdAt: -1 });
feedbackReportSchema.index({ submissionId: 1, questionId: 1, reporterId: 1 });

export const FeedbackReport: Model<IFeedbackReport> =
  mongoose.models.FeedbackReport ||
  mongoose.model<IFeedbackReport>('FeedbackReport', feedbackReportSchema);
