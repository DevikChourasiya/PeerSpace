import { z } from 'zod';

export const CompetencyBenchmarkSchema = z.object({
  category: z.string(),
  studentAverage: z.number(),
  cohortAverage: z.number(),
  evaluationsCount: z.number(),
});

export type CompetencyBenchmark = z.infer<typeof CompetencyBenchmarkSchema>;

export const RatingDistributionSchema = z.object({
  rating: z.number(), // 1, 2, 3, 4, 5
  count: z.number(),
});

export type RatingDistribution = z.infer<typeof RatingDistributionSchema>;

export const LongitudinalPointSchema = z.object({
  roundId: z.string(),
  roundTitle: z.string(),
  date: z.string(),
  averageScore: z.number(),
  evaluationsCount: z.number(),
});

export type LongitudinalPoint = z.infer<typeof LongitudinalPointSchema>;

export const StudentAnalyticsResponseSchema = z.object({
  totalEvaluationsReceived: z.number(),
  overallAverageScore: z.number(),
  cohortAverageScore: z.number(),
  competencies: z.array(CompetencyBenchmarkSchema),
  ratingDistribution: z.array(RatingDistributionSchema),
  timeline: z.array(LongitudinalPointSchema),
});

export type StudentAnalyticsResponse = z.infer<typeof StudentAnalyticsResponseSchema>;
