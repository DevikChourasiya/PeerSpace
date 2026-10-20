import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  QuestionType,
  QuestionnaireStatus,
  QuestionnaireCreateSchema,
  QuestionnaireUpdateSchema,
  type Question,
} from '@peerspace/shared';
import { Questionnaire } from '../models/questionnaire.model.js';
import { QuestionnaireVersion } from '../models/questionnaireVersion.model.js';

/**
 * Validate question details before publication
 */
function validateQuestionsForPublication(questions: Question[]): {
  valid: boolean;
  error?: string;
  code?: string;
} {
  if (!questions || questions.length === 0) {
    return {
      valid: false,
      code: 'QUESTIONNAIRE_EMPTY',
      error: 'Cannot publish a questionnaire without any questions.',
    };
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q) continue;
    const qNum = i + 1;

    if (!q.title || !q.title.trim()) {
      return {
        valid: false,
        code: 'INVALID_QUESTION_TITLE',
        error: `Question #${qNum} is missing a title.`,
      };
    }

    if (
      q.type === QuestionType.SINGLE_CHOICE ||
      q.type === QuestionType.MULTIPLE_CHOICE ||
      q.type === QuestionType.CATEGORY_BASED
    ) {
      if (!q.options || q.options.length < 2) {
        return {
          valid: false,
          code: 'INVALID_QUESTION_OPTIONS',
          error: `Question #${qNum} ("${q.title}") requires at least 2 choice options.`,
        };
      }
      const uniqueOptions = new Set(q.options.map((opt) => opt.trim()));
      if (uniqueOptions.size !== q.options.length) {
        return {
          valid: false,
          code: 'DUPLICATE_CHOICE_OPTIONS',
          error: `Question #${qNum} ("${q.title}") contains duplicate choice options.`,
        };
      }
    }

    if (q.type === QuestionType.NUMERIC_RATING || q.type === QuestionType.STAR_RATING) {
      const min = q.scaleMin ?? 1;
      const max = q.scaleMax ?? (q.type === QuestionType.STAR_RATING ? 5 : 10);
      if (min >= max) {
        return {
          valid: false,
          code: 'INVALID_RATING_SCALE',
          error: `Question #${qNum} ("${q.title}") rating scale minimum (${min}) must be strictly less than maximum (${max}).`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * List all questionnaires (Admin only)
 */
export const listQuestionnaires = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};

    if (req.query.status && typeof req.query.status === 'string') {
      filter.status = req.query.status;
    }

    if (req.query.category && typeof req.query.category === 'string') {
      filter.category = req.query.category;
    }

    const questionnaires = await Questionnaire.find(filter)
      .populate('publishedVersionId')
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: questionnaires.length,
      questionnaires: questionnaires.map((q) => ({
        id: q._id.toString(),
        title: q.title,
        description: q.description,
        category: q.category,
        status: q.status,
        currentVersion: q.currentVersion,
        publishedVersionId: q.publishedVersionId
          ? (q.publishedVersionId as { _id?: mongoose.Types.ObjectId })._id?.toString() ||
            q.publishedVersionId.toString()
          : null,
        publishedVersion: q.publishedVersionId,
        questions: q.questions,
        createdBy: q.createdBy.toString(),
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new questionnaire in draft mode
 */
export const createQuestionnaire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parseResult = QuestionnaireCreateSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid questionnaire data.',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const { title, description, category, questions } = parseResult.data;
    const adminId = new mongoose.Types.ObjectId(req.user!.id);

    // Ensure questions have valid order
    const formattedQuestions = questions.map((q, idx) => ({
      ...q,
      order: q.order || idx + 1,
    }));

    const questionnaire = await Questionnaire.create({
      title,
      description,
      category,
      questions: formattedQuestions,
      status: QuestionnaireStatus.DRAFT,
      currentVersion: 0,
      createdBy: adminId,
    });

    res.status(201).json({
      success: true,
      message: 'Questionnaire draft created successfully.',
      questionnaire: questionnaire.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get questionnaire detail by ID
 */
export const getQuestionnaireById = async (
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
          code: 'INVALID_QUESTIONNAIRE_ID',
          message: 'Invalid questionnaire ID format.',
        },
      });
      return;
    }

    const questionnaire = await Questionnaire.findById(id).populate('publishedVersionId').lean();

    if (!questionnaire) {
      res.status(404).json({
        success: false,
        error: {
          code: 'QUESTIONNAIRE_NOT_FOUND',
          message: 'Questionnaire not found.',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      questionnaire: {
        id: questionnaire._id.toString(),
        title: questionnaire.title,
        description: questionnaire.description,
        category: questionnaire.category,
        status: questionnaire.status,
        currentVersion: questionnaire.currentVersion,
        publishedVersionId: questionnaire.publishedVersionId
          ? (
              questionnaire.publishedVersionId as {
                _id?: mongoose.Types.ObjectId;
              }
            )._id?.toString() || questionnaire.publishedVersionId.toString()
          : null,
        publishedVersion: questionnaire.publishedVersionId,
        questions: questionnaire.questions,
        createdBy: questionnaire.createdBy.toString(),
        createdAt: questionnaire.createdAt,
        updatedAt: questionnaire.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update questionnaire draft
 */
export const updateQuestionnaire = async (
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
          code: 'INVALID_QUESTIONNAIRE_ID',
          message: 'Invalid questionnaire ID format.',
        },
      });
      return;
    }

    const parseResult = QuestionnaireUpdateSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid questionnaire update payload.',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const questionnaire = await Questionnaire.findById(id);

    if (!questionnaire) {
      res.status(404).json({
        success: false,
        error: {
          code: 'QUESTIONNAIRE_NOT_FOUND',
          message: 'Questionnaire not found.',
        },
      });
      return;
    }

    const updates = parseResult.data;

    if (updates.title !== undefined) questionnaire.title = updates.title;
    if (updates.description !== undefined) questionnaire.description = updates.description;
    if (updates.category !== undefined) questionnaire.category = updates.category;
    if (updates.questions !== undefined) {
      questionnaire.questions = updates.questions.map((q, idx) => ({
        ...q,
        order: q.order || idx + 1,
      }));
    }

    await questionnaire.save();

    res.status(200).json({
      success: true,
      message: 'Questionnaire updated successfully.',
      questionnaire: questionnaire.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Duplicate a questionnaire
 */
export const duplicateQuestionnaire = async (
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
          code: 'INVALID_QUESTIONNAIRE_ID',
          message: 'Invalid questionnaire ID format.',
        },
      });
      return;
    }

    const existing = await Questionnaire.findById(id);

    if (!existing) {
      res.status(404).json({
        success: false,
        error: {
          code: 'QUESTIONNAIRE_NOT_FOUND',
          message: 'Questionnaire not found.',
        },
      });
      return;
    }

    const adminId = new mongoose.Types.ObjectId(req.user!.id);

    const duplicated = await Questionnaire.create({
      title: `${existing.title} (Copy)`,
      description: existing.description,
      category: existing.category,
      questions: existing.questions.map((q, idx) => ({
        ...q,
        id: `q_${Date.now()}_${idx + 1}`,
      })),
      status: QuestionnaireStatus.DRAFT,
      currentVersion: 0,
      createdBy: adminId,
    });

    res.status(201).json({
      success: true,
      message: 'Questionnaire duplicated successfully.',
      questionnaire: duplicated.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Publish a new immutable version of the questionnaire
 */
export const publishQuestionnaire = async (
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
          code: 'INVALID_QUESTIONNAIRE_ID',
          message: 'Invalid questionnaire ID format.',
        },
      });
      return;
    }

    const questionnaire = await Questionnaire.findById(id);

    if (!questionnaire) {
      res.status(404).json({
        success: false,
        error: {
          code: 'QUESTIONNAIRE_NOT_FOUND',
          message: 'Questionnaire not found.',
        },
      });
      return;
    }

    // Comprehensive question validation before freezing version
    const validation = validateQuestionsForPublication(questionnaire.questions);

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: {
          code: validation.code || 'VALIDATION_ERROR',
          message: validation.error || 'Questionnaire questions failed validation.',
        },
      });
      return;
    }

    const newVersionNumber = questionnaire.currentVersion + 1;
    const adminId = new mongoose.Types.ObjectId(req.user!.id);

    // Create immutable published version document
    const newVersion = await QuestionnaireVersion.create({
      questionnaireId: questionnaire._id,
      versionNumber: newVersionNumber,
      title: questionnaire.title,
      description: questionnaire.description,
      category: questionnaire.category,
      questions: questionnaire.questions,
      publishedBy: adminId,
      publishedAt: new Date(),
    });

    // Update questionnaire pointer and status
    questionnaire.currentVersion = newVersionNumber;
    questionnaire.publishedVersionId = newVersion._id as mongoose.Types.ObjectId;
    questionnaire.status = QuestionnaireStatus.PUBLISHED;

    await questionnaire.save();

    res.status(200).json({
      success: true,
      message: `Questionnaire version v${newVersionNumber} published successfully.`,
      questionnaire: questionnaire.toJSON(),
      publishedVersion: newVersion.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all historical versions of a questionnaire
 */
export const listQuestionnaireVersions = async (
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
          code: 'INVALID_QUESTIONNAIRE_ID',
          message: 'Invalid questionnaire ID format.',
        },
      });
      return;
    }

    const versions = await QuestionnaireVersion.find({ questionnaireId: id })
      .sort({ versionNumber: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: versions.length,
      versions: versions.map((v) => ({
        id: v._id.toString(),
        questionnaireId: v.questionnaireId.toString(),
        versionNumber: v.versionNumber,
        title: v.title,
        description: v.description,
        category: v.category,
        questions: v.questions,
        publishedBy: v.publishedBy.toString(),
        publishedAt: v.publishedAt,
        createdAt: v.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific immutable questionnaire version
 */
export const getQuestionnaireVersionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { versionId } = req.params;

    if (!mongoose.isValidObjectId(versionId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_VERSION_ID',
          message: 'Invalid version ID format.',
        },
      });
      return;
    }

    const version = await QuestionnaireVersion.findById(versionId).lean();

    if (!version) {
      res.status(404).json({
        success: false,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: 'Questionnaire version not found.',
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
  } catch (error) {
    next(error);
  }
};
