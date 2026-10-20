import mongoose, { Schema, Document } from 'mongoose';
import { QuestionType, QuestionnaireStatus, type Question } from '@peerspace/shared';

export interface IQuestionDocument extends Question {}

export interface IQuestionnaire extends Document {
  title: string;
  description?: string;
  category: string;
  status: QuestionnaireStatus;
  currentVersion: number;
  publishedVersionId?: mongoose.Types.ObjectId;
  questions: IQuestionDocument[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const questionSubSchema = new Schema(
  {
    id: { type: String, required: true },
    order: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    type: {
      type: String,
      enum: Object.values(QuestionType),
      required: true,
    },
    required: { type: Boolean, default: true },
    options: [{ type: String, trim: true }],
    scaleMin: { type: Number },
    scaleMax: { type: Number },
    scaleLabels: {
      min: { type: String, trim: true },
      max: { type: String, trim: true },
    },
    maxLength: { type: Number },
  },
  { _id: false }
);

const questionnaireSchema = new Schema<IQuestionnaire>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
      maxlength: [100, 'Category cannot exceed 100 characters'],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(QuestionnaireStatus),
      default: QuestionnaireStatus.DRAFT,
      required: true,
      index: true,
    },
    currentVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
    publishedVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'QuestionnaireVersion',
    },
    questions: [questionSubSchema],
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
        if (ret.publishedVersionId) {
          ret.publishedVersionId = (ret.publishedVersionId as mongoose.Types.ObjectId).toString();
        }
        if (ret.createdBy) {
          ret.createdBy = (ret.createdBy as mongoose.Types.ObjectId).toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

questionnaireSchema.index({ status: 1, category: 1 });
questionnaireSchema.index({ title: 'text', description: 'text' });

export const Questionnaire = mongoose.model<IQuestionnaire>('Questionnaire', questionnaireSchema);
