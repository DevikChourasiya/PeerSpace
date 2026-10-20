import mongoose, { Schema, Document } from 'mongoose';
import { type Question } from '@peerspace/shared';
import { questionSubSchema } from './questionnaire.model.js';

export interface IQuestionnaireVersion extends Document {
  questionnaireId: mongoose.Types.ObjectId;
  versionNumber: number;
  title: string;
  description?: string;
  category: string;
  questions: Question[];
  publishedBy: mongoose.Types.ObjectId;
  publishedAt: Date;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const questionnaireVersionSchema = new Schema<IQuestionnaireVersion>(
  {
    questionnaireId: {
      type: Schema.Types.ObjectId,
      ref: 'Questionnaire',
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    questions: {
      type: [questionSubSchema],
      validate: {
        validator: (v: unknown[]) => Array.isArray(v) && v.length > 0,
        message: 'A published questionnaire version must contain at least 1 question',
      },
    },
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        ret.questionnaireId = (ret.questionnaireId as mongoose.Types.ObjectId).toString();
        ret.publishedBy = (ret.publishedBy as mongoose.Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Immutable version: compound index ensuring unique version numbers per questionnaire
questionnaireVersionSchema.index({ questionnaireId: 1, versionNumber: 1 }, { unique: true });

export const QuestionnaireVersion = mongoose.model<IQuestionnaireVersion>(
  'QuestionnaireVersion',
  questionnaireVersionSchema
);
