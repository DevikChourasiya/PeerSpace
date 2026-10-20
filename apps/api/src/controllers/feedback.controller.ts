import type { Request, Response, NextFunction } from 'express';
import { FeedbackVisibility, RoundStatus, QuestionType } from '@peerspace/shared';
import { FeedbackSubmission } from '../models/feedbackSubmission.model.js';
import { User } from '../models/user.model.js';

/**
 * Returns constructive feedback received by the authenticated student according to round visibility and anonymity rules.
 */
export const getReceivedFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    const now = new Date();

    const submissions = await FeedbackSubmission.find({
      targetStudentId: currentUserId,
      status: 'submitted',
    })
      .populate<{ roundId: any }>('roundId')
      .populate<{ questionnaireVersionId: any }>('questionnaireVersionId')
      .populate<{ reviewerId: any }>('reviewerId', 'name email')
      .sort({ submittedAt: -1 })
      .lean();

    const visibleItems = [];

    for (const sub of submissions) {
      const round = sub.roundId;
      const version = sub.questionnaireVersionId;
      if (!round || !version) continue;

      // Check visibility rules
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

      if (!isVisible) continue;

      // Anonymity rule
      const isAnon = sub.isAnonymous || round.isAnonymous;
      const reviewerDisplayName = isAnon
        ? 'Anonymous Peer'
        : (sub.reviewerId as any)?.name || 'Peer Reviewer';

      // Map question details
      const qMap = new Map<string, any>();
      for (const q of version.questions || []) {
        qMap.set(q.id, q);
      }

      const responseDetails = (sub.responses || []).map((r: any) => {
        const qDef = qMap.get(r.questionId);
        return {
          questionId: r.questionId,
          title: qDef?.title || 'Question',
          category: qDef?.category || 'General',
          questionType: r.questionType || qDef?.type || QuestionType.SHORT_TEXT,
          rating: r.rating,
          value: r.value,
          comment: r.isCommentHidden ? undefined : r.comment,
          isCommentHidden: !!r.isCommentHidden,
        };
      });

      visibleItems.push({
        id: sub._id.toString(),
        roundId: round._id.toString(),
        roundTitle: round.title,
        reviewerDisplayName,
        isAnonymous: isAnon,
        submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : sub.createdAt.toISOString(),
        responses: responseDetails,
      });
    }

    res.status(200).json({
      success: true,
      data: visibleItems,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Returns aggregated competency benchmarks, rating distribution, and longitudinal metrics for Chart.js.
 */
export const getStudentAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    const now = new Date();

    const user = await User.findById(currentUserId).lean();
    const cohortClass = user?.classSection;

    // 1. Fetch all submitted evaluations targeting this student
    const mySubmissions = await FeedbackSubmission.find({
      targetStudentId: currentUserId,
      status: 'submitted',
    })
      .populate<{ roundId: any }>('roundId')
      .populate<{ questionnaireVersionId: any }>('questionnaireVersionId')
      .lean();

    // Filter to visible evaluations
    const visibleSubmissions = mySubmissions.filter((sub) => {
      const round = sub.roundId;
      if (!round) return false;
      const visibility = round.feedbackVisibility || FeedbackVisibility.AFTER_DEADLINE;
      if (visibility === FeedbackVisibility.IMMEDIATE) return true;
      if (visibility === FeedbackVisibility.AFTER_DEADLINE) {
        return (
          round.status === RoundStatus.CLOSED ||
          round.status === RoundStatus.ARCHIVED ||
          now > new Date(round.deadline)
        );
      }
      return round.status === RoundStatus.CLOSED || round.status === RoundStatus.ARCHIVED;
    });

    // 2. Fetch cohort-wide submissions for cohort benchmarking
    const cohortStudentIds = cohortClass
      ? (
          await User.find({ classSection: cohortClass, role: 'student', status: 'active' })
            .select('_id')
            .lean()
        ).map((u) => u._id)
      : [];

    const cohortSubmissions = await FeedbackSubmission.find({
      targetStudentId: { $in: cohortStudentIds },
      status: 'submitted',
    })
      .populate<{ questionnaireVersionId: any }>('questionnaireVersionId')
      .lean();

    // 3. Compute Category Competencies
    // Category -> { sum: number, count: number }
    const studentCategoryScores = new Map<string, { sum: number; count: number }>();
    const cohortCategoryScores = new Map<string, { sum: number; count: number }>();

    // Helper to get normalized 1-5 score from response
    const extractRating = (r: any): number | null => {
      if (typeof r.rating === 'number') {
        return r.rating;
      }
      if (r.questionType === QuestionType.YES_NO) {
        if (r.value === true || r.value === 'yes') return 5;
        if (r.value === false || r.value === 'no') return 1;
      }
      return null;
    };

    // Calculate student categories
    let studentTotalScoreSum = 0;
    let studentTotalScoredCount = 0;

    // Rating distribution counts (1 to 5)
    const ratingDistributionMap = new Map<number, number>([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
    ]);

    for (const sub of visibleSubmissions) {
      const version = sub.questionnaireVersionId;
      const qMap = new Map<string, any>();
      for (const q of version?.questions || []) {
        qMap.set(q.id, q);
      }

      for (const r of sub.responses || []) {
        const rating = extractRating(r);
        if (rating !== null) {
          const qDef = qMap.get(r.questionId);
          const category = qDef?.category || 'General';

          const current = studentCategoryScores.get(category) || { sum: 0, count: 0 };
          current.sum += rating;
          current.count += 1;
          studentCategoryScores.set(category, current);

          studentTotalScoreSum += rating;
          studentTotalScoredCount += 1;

          // Round rating to nearest integer between 1 and 5
          const starBin = Math.max(1, Math.min(5, Math.round(rating)));
          ratingDistributionMap.set(starBin, (ratingDistributionMap.get(starBin) || 0) + 1);
        }
      }
    }

    // Calculate cohort benchmark categories
    let cohortTotalScoreSum = 0;
    let cohortTotalScoredCount = 0;

    for (const sub of cohortSubmissions) {
      const version = sub.questionnaireVersionId;
      const qMap = new Map<string, any>();
      for (const q of version?.questions || []) {
        qMap.set(q.id, q);
      }

      for (const r of sub.responses || []) {
        const rating = extractRating(r);
        if (rating !== null) {
          const qDef = qMap.get(r.questionId);
          const category = qDef?.category || 'General';

          const current = cohortCategoryScores.get(category) || { sum: 0, count: 0 };
          current.sum += rating;
          current.count += 1;
          cohortCategoryScores.set(category, current);

          cohortTotalScoreSum += rating;
          cohortTotalScoredCount += 1;
        }
      }
    }

    // Build competencies array
    const allCategories = Array.from(
      new Set([...studentCategoryScores.keys(), ...cohortCategoryScores.keys()])
    );

    // If no categories yet, provide default domains
    if (allCategories.length === 0) {
      allCategories.push('Technical Competence', 'Collaboration', 'Communication', 'Punctuality');
    }

    const competencies = allCategories.map((category) => {
      const studentData = studentCategoryScores.get(category);
      const cohortData = cohortCategoryScores.get(category);

      const studentAvg =
        studentData && studentData.count > 0
          ? Number((studentData.sum / studentData.count).toFixed(2))
          : 0;

      const cohortAvg =
        cohortData && cohortData.count > 0
          ? Number((cohortData.sum / cohortData.count).toFixed(2))
          : studentAvg > 0
            ? studentAvg
            : 0;

      return {
        category,
        studentAverage: studentAvg,
        cohortAverage: cohortAvg,
        evaluationsCount: studentData?.count || 0,
      };
    });

    // 4. Longitudinal timeline by round
    const timelineMap = new Map<
      string,
      { title: string; date: Date; sum: number; count: number; evalCount: number }
    >();

    for (const sub of visibleSubmissions) {
      const round = sub.roundId;
      if (!round) continue;

      const roundId = round._id.toString();
      const current = timelineMap.get(roundId) || {
        title: round.title,
        date: sub.submittedAt || sub.createdAt,
        sum: 0,
        count: 0,
        evalCount: 0,
      };

      current.evalCount += 1;

      for (const r of sub.responses || []) {
        const rating = extractRating(r);
        if (rating !== null) {
          current.sum += rating;
          current.count += 1;
        }
      }

      timelineMap.set(roundId, current);
    }

    const timeline = Array.from(timelineMap.entries())
      .map(([roundId, data]) => ({
        roundId,
        roundTitle: data.title,
        date: data.date.toISOString().slice(0, 10),
        averageScore: data.count > 0 ? Number((data.sum / data.count).toFixed(2)) : 0,
        evaluationsCount: data.evalCount,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const overallAverageScore =
      studentTotalScoredCount > 0
        ? Number((studentTotalScoreSum / studentTotalScoredCount).toFixed(2))
        : 0;

    const cohortAverageScore =
      cohortTotalScoredCount > 0
        ? Number((cohortTotalScoreSum / cohortTotalScoredCount).toFixed(2))
        : 0;

    const ratingDistribution = Array.from(ratingDistributionMap.entries()).map(
      ([rating, count]) => ({
        rating,
        count,
      })
    );

    res.status(200).json({
      success: true,
      data: {
        totalEvaluationsReceived: visibleSubmissions.length,
        overallAverageScore,
        cohortAverageScore,
        competencies,
        ratingDistribution,
        timeline,
      },
    });
  } catch (err) {
    next(err);
  }
};
