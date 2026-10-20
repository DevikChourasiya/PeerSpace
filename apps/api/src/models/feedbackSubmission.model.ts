import mongoose, { Document, Schema, Model } from 'mongoose';
import { QuestionType } from '@peerspace/shared';

export interface IFeedbackResponseItem {
  questionId: string;
  questionType: QuestionType;
  value?: any;
  rating?: number;
  comment?: string;
}

export interface IFeedbackSubmission extends Document {
  roundId: mongoose.Types.ObjectId;
  questionnaireVersionId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  targetStudentId: mongoose.Types.ObjectId;
  status: 'draft' | 'submitted';
  responses: IFeedbackResponseItem[];
  isAnonymous: boolean;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackResponseItemSchema = new Schema<IFeedbackResponseItem>(
  {
    questionId: { type: String, required: true },
    questionType: { type: String, required: true, enum: Object.values(QuestionType) },
    value: { type: Schema.Types.Mixed },
    rating: { type: Number, min: 0, max: 100 },
    comment: { type: String, maxlength: 2000 },
  },
  { _id: false }
);

const feedbackSubmissionSchema = new Schema<IFeedbackSubmission>(
  {
    roundId: {
      type: Schema.Types.ObjectId,
      ref: 'FeedbackRound',
      required: true,
      index: true,
    },
    questionnaireVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'QuestionnaireVersion',
      required: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetStudentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted'],
      default: 'draft',
      index: true,
    },
    responses: {
      type: [feedbackResponseItemSchema],
      default: [],
    },
    isAnonymous: {
      type: Boolean,
      default: true,
    },
    submittedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id.toString();
        ret.roundId = ret.roundId?.toString();
        ret.questionnaireVersionId = ret.questionnaireVersionId?.toString();
        ret.reviewerId = ret.reviewerId?.toString();
        ret.targetStudentId = ret.targetStudentId?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// One submission per reviewer per target peer per round
feedbackSubmissionSchema.index({ roundId: 1, reviewerId: 1, targetStudentId: 1 }, { unique: true });

// Indexes for fast querying of received feedback and round metrics
feedbackSubmissionSchema.index({ targetStudentId: 1, status: 1 });
feedbackSubmissionSchema.index({ roundId: 1, status: 1 });
feedbackSubmissionSchema.index({ reviewerId: 1, roundId: 1 });

export const FeedbackSubmission: Model<IFeedbackSubmission> = mongoose.model<IFeedbackSubmission>(
  'FeedbackSubmission',
  feedbackSubmissionSchema
);
