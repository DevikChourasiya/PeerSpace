import mongoose, { Schema, Document } from 'mongoose';
import { RoundStatus, FeedbackVisibility } from '@peerspace/shared';

export interface IFeedbackRound extends Document {
  title: string;
  description?: string;
  status: RoundStatus;
  questionnaireId?: mongoose.Types.ObjectId;
  questionnaireVersionId?: mongoose.Types.ObjectId;
  startDate: Date;
  deadline: Date;
  isAnonymous: boolean;
  allowSubmissionEdit: boolean;
  submissionsPerPeer: number;
  feedbackVisibility: FeedbackVisibility;
  targetClass: string;
  eligibleStudentIds: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackRoundSchema = new Schema<IFeedbackRound>(
  {
    title: {
      type: String,
      required: [true, 'Round title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(RoundStatus),
      default: RoundStatus.DRAFT,
      required: true,
      index: true,
    },
    questionnaireId: {
      type: Schema.Types.ObjectId,
      ref: 'Questionnaire',
      index: true,
    },
    questionnaireVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'QuestionnaireVersion',
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
      index: true,
    },
    isAnonymous: {
      type: Boolean,
      default: true,
      required: true,
    },
    allowSubmissionEdit: {
      type: Boolean,
      default: true,
      required: true,
    },
    submissionsPerPeer: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
      required: true,
    },
    feedbackVisibility: {
      type: String,
      enum: Object.values(FeedbackVisibility),
      default: FeedbackVisibility.AFTER_DEADLINE,
      required: true,
    },
    targetClass: {
      type: String,
      trim: true,
      default: 'CS-401',
      index: true,
    },
    eligibleStudentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        if (ret.questionnaireId) {
          ret.questionnaireId = (ret.questionnaireId as mongoose.Types.ObjectId).toString();
        }
        if (ret.questionnaireVersionId) {
          ret.questionnaireVersionId = (
            ret.questionnaireVersionId as mongoose.Types.ObjectId
          ).toString();
        }
        if (ret.createdBy) {
          ret.createdBy = (ret.createdBy as mongoose.Types.ObjectId).toString();
        }
        if (Array.isArray(ret.eligibleStudentIds)) {
          ret.eligibleStudentIds = ret.eligibleStudentIds.map((id: unknown) =>
            id instanceof mongoose.Types.ObjectId ? id.toString() : String(id)
          );
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

feedbackRoundSchema.index({ status: 1, targetClass: 1 });
feedbackRoundSchema.index({ status: 1, deadline: 1 });
feedbackRoundSchema.index({ title: 'text', description: 'text' });

export const FeedbackRound = mongoose.model<IFeedbackRound>('FeedbackRound', feedbackRoundSchema);
