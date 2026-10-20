import React, { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  RadarController,
  BarController,
  LineController,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  TrendingUp,
  Award,
  Users,
  MessageSquare,
  ShieldCheck,
  Star,
  Calendar,
  Sparkles,
  Flag,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { useStudentAnalytics, useReceivedFeedback } from '../hooks/useFeedbackAnalytics';
import { ReportFeedbackModal } from './ReportFeedbackModal';

// Register Chart.js components including controllers, elements, scales, and plugins
ChartJS.register(
  RadarController,
  BarController,
  LineController,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend
);

export const StudentAnalyticsDashboard: React.FC = () => {
  const { data: analytics, isLoading: isAnalyticsLoading } = useStudentAnalytics();
  const { data: feedbackList, isLoading: isFeedbackLoading } = useReceivedFeedback();

  const [reportingComment, setReportingComment] = useState<{
    submissionId: string;
    questionId: string;
    questionTitle: string;
    commentText: string;
  } | null>(null);
  const [reportSuccessToast, setReportSuccessToast] = useState<string | null>(null);

  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lineCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const radarChartRef = useRef<ChartJS | null>(null);
  const barChartRef = useRef<ChartJS | null>(null);
  const lineChartRef = useRef<ChartJS | null>(null);

  // 1. Render Radar Chart (Competencies)
  useEffect(() => {
    if (!radarCanvasRef.current || !analytics?.competencies) return;

    const existingChart = ChartJS.getChart(radarCanvasRef.current);
    if (existingChart) {
      existingChart.destroy();
    }
    if (radarChartRef.current) {
      radarChartRef.current.destroy();
      radarChartRef.current = null;
    }

    const labels = analytics.competencies.map((c) => c.category);
    const studentScores = analytics.competencies.map((c) => c.studentAverage);
    const cohortScores = analytics.competencies.map((c) => c.cohortAverage);

    radarChartRef.current = new ChartJS(radarCanvasRef.current, {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: 'Your Average Score',
            data: studentScores,
            backgroundColor: 'rgba(37, 99, 235, 0.25)',
            borderColor: 'rgb(37, 99, 235)',
            pointBackgroundColor: 'rgb(37, 99, 235)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(37, 99, 235)',
            fill: true,
          },
          {
            label: 'Cohort Benchmark',
            data: cohortScores,
            backgroundColor: 'rgba(148, 163, 184, 0.2)',
            borderColor: 'rgb(148, 163, 184)',
            borderDash: [4, 4],
            pointBackgroundColor: 'rgb(148, 163, 184)',
            pointBorderColor: '#fff',
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: 'rgba(226, 232, 240, 0.8)' },
            grid: { color: 'rgba(226, 232, 240, 0.8)' },
            suggestedMin: 0,
            suggestedMax: 5,
            ticks: { stepSize: 1, backdropColor: 'transparent' },
          },
        },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ${context.raw} / 5.0`,
            },
          },
        },
      },
    });

    return () => {
      if (radarChartRef.current) {
        radarChartRef.current.destroy();
        radarChartRef.current = null;
      }
    };
  }, [analytics?.competencies]);

  // 2. Render Bar Chart (Rating Distribution)
  useEffect(() => {
    if (!barCanvasRef.current || !analytics?.ratingDistribution) return;

    const existingChart = ChartJS.getChart(barCanvasRef.current);
    if (existingChart) {
      existingChart.destroy();
    }
    if (barChartRef.current) {
      barChartRef.current.destroy();
      barChartRef.current = null;
    }

    const labels = ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'];
    const dataCounts = [1, 2, 3, 4, 5].map((star) => {
      const item = analytics.ratingDistribution.find((d) => d.rating === star);
      return item ? item.count : 0;
    });

    barChartRef.current = new ChartJS(barCanvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Evaluations Count',
            data: dataCounts,
            backgroundColor: [
              'rgba(239, 68, 68, 0.7)',
              'rgba(249, 115, 22, 0.7)',
              'rgba(234, 179, 8, 0.7)',
              'rgba(59, 130, 246, 0.7)',
              'rgba(16, 185, 129, 0.7)',
            ],
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { size: 10 } },
            grid: { color: 'rgba(241, 245, 249, 1)' },
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });

    return () => {
      if (barChartRef.current) {
        barChartRef.current.destroy();
        barChartRef.current = null;
      }
    };
  }, [analytics?.ratingDistribution]);

  // 3. Render Line Chart (Longitudinal Timeline)
  useEffect(() => {
    if (!lineCanvasRef.current || !analytics?.timeline) return;

    const existingChart = ChartJS.getChart(lineCanvasRef.current);
    if (existingChart) {
      existingChart.destroy();
    }
    if (lineChartRef.current) {
      lineChartRef.current.destroy();
      lineChartRef.current = null;
    }

    const labels = analytics.timeline.map((t) => t.roundTitle);
    const scores = analytics.timeline.map((t) => t.averageScore);

    lineChartRef.current = new ChartJS(lineCanvasRef.current, {
      type: 'line',
      data: {
        labels: labels.length > 0 ? labels : ['No Rounds Completed'],
        datasets: [
          {
            label: 'Average Score',
            data: scores.length > 0 ? scores : [0],
            borderColor: 'rgb(79, 70, 229)',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: 'rgb(79, 70, 229)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: 5,
            ticks: { stepSize: 1, font: { size: 10 } },
            grid: { color: 'rgba(241, 245, 249, 1)' },
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });

    return () => {
      if (lineChartRef.current) {
        lineChartRef.current.destroy();
        lineChartRef.current = null;
      }
    };
  }, [analytics?.timeline]);

  const isLoading = isAnalyticsLoading || isFeedbackLoading;

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Overview - Tactile Pastel Surfaces */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#5B9CF6]/30 bg-[#EDF5FD] dark:bg-sky-950/30 p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#5B9CF6]">
            <span className="text-xs font-bold uppercase tracking-wider">Evaluations Received</span>
            <Users className="h-4 w-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#1C1B18] dark:text-[#F5F2EB]">
            {isLoading ? '--' : analytics?.totalEvaluationsReceived || 0}
          </div>
          <p className="text-[11px] text-[#5C5952] dark:text-[#B5B0A4]">
            Total peer reviews completed for you
          </p>
        </div>

        <div className="rounded-2xl border border-[#F47B55]/30 bg-[#FDF2EC] dark:bg-amber-950/30 p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#F47B55]">
            <span className="text-xs font-bold uppercase tracking-wider">Your Average Score</span>
            <Award className="h-4 w-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#1C1B18] dark:text-[#F5F2EB] flex items-center gap-1">
            {isLoading ? '--' : (analytics?.overallAverageScore || 0).toFixed(1)}
            <span className="text-xs font-normal text-[#5C5952] dark:text-[#B5B0A4]">/ 5.0</span>
          </div>
          <p className="text-[11px] text-[#5C5952] dark:text-[#B5B0A4]">
            Across all evaluated rubric categories
          </p>
        </div>

        <div className="rounded-2xl border border-[#34A866]/30 bg-[#EEF9F2] dark:bg-emerald-950/30 p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#34A866]">
            <span className="text-xs font-bold uppercase tracking-wider">Cohort Benchmark</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#1C1B18] dark:text-[#F5F2EB] flex items-center gap-1">
            {isLoading ? '--' : (analytics?.cohortAverageScore || 0).toFixed(1)}
            <span className="text-xs font-normal text-[#5C5952] dark:text-[#B5B0A4]">/ 5.0</span>
          </div>
          <p className="text-[11px] text-[#5C5952] dark:text-[#B5B0A4]">
            Class-wide average performance
          </p>
        </div>
      </div>

      {/* Visual Charts Grid (Radar & Bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart: Competency Benchmarks */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Competency Benchmarks (Radar)
              </h3>
              <p className="text-xs text-slate-500">
                Multi-axis comparison of your category scores vs. cohort benchmark
              </p>
            </div>
          </div>
          <div className="relative h-64 w-full flex items-center justify-center">
            <canvas ref={radarCanvasRef} data-testid="competency-radar-chart" />
          </div>
        </div>

        {/* Bar Chart: Rating Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500" />
                Rating Level Distribution
              </h3>
              <p className="text-xs text-slate-500">
                Frequency distribution of star ratings received
              </p>
            </div>
          </div>
          <div className="relative h-64 w-full flex items-center justify-center">
            <canvas ref={barCanvasRef} data-testid="rating-bar-chart" />
          </div>
        </div>
      </div>

      {/* Longitudinal Line Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              Longitudinal Growth & Progression
            </h3>
            <p className="text-xs text-slate-500">
              Score trajectory across consecutive evaluation rounds
            </p>
          </div>
        </div>
        <div className="relative h-56 w-full flex items-center justify-center">
          <canvas ref={lineCanvasRef} data-testid="longitudinal-line-chart" />
        </div>
      </div>

      {/* Constructive Qualitative Feedback Received */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              Constructive Peer Feedback Received
            </h3>
            <p className="text-xs text-slate-500">
              Evaluations authorized for release with strict anonymity protection
            </p>
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            Anonymity Preserved
          </div>
        </div>

        {/* Success Alert Toast */}
        {reportSuccessToast && (
          <div
            role="status"
            className="m-4 flex items-center justify-between gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{reportSuccessToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setReportSuccessToast(null)}
              className="text-emerald-600 hover:text-emerald-800 p-1"
              aria-label="Dismiss message"
            >
              &times;
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Loading received feedback...
          </div>
        ) : !feedbackList || feedbackList.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <MessageSquare className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No Feedback Received Yet</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Once peers complete evaluations and round visibility rules are met, your constructive
              feedback will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 p-4 space-y-4">
            {feedbackList.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.isAnonymous
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.reviewerDisplayName}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      Round: {item.roundTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(item.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Responses breakdown */}
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  {item.responses.map((resp, rIdx) => (
                    <div key={rIdx} className="text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">{resp.title}</span>
                        {resp.rating !== undefined && (
                          <span className="font-bold text-amber-600 flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-amber-400" />
                            {resp.rating} / 5
                          </span>
                        )}
                      </div>
                      {resp.isCommentHidden ? (
                        <div className="flex items-center gap-1.5 text-slate-400 bg-slate-100/70 p-2.5 rounded-lg border border-slate-200/50 text-[11px] italic">
                          <EyeOff className="h-3.5 w-3.5 shrink-0" />
                          <span>[Feedback comment hidden by moderator for policy violation]</span>
                        </div>
                      ) : resp.comment ? (
                        <div className="relative group">
                          <p className="text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/70 italic text-[11px] leading-relaxed pr-16">
                            "{resp.comment}"
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setReportingComment({
                                submissionId: item.id,
                                questionId: resp.questionId,
                                questionTitle: resp.title,
                                commentText: resp.comment || '',
                              })
                            }
                            className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-red-600 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors"
                            title="Report this feedback comment"
                          >
                            <Flag className="h-3 w-3" />
                            <span>Report</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Feedback Modal */}
      {reportingComment && (
        <ReportFeedbackModal
          submissionId={reportingComment.submissionId}
          questionId={reportingComment.questionId}
          questionTitle={reportingComment.questionTitle}
          commentText={reportingComment.commentText}
          onClose={() => setReportingComment(null)}
          onSuccess={() => {
            setReportingComment(null);
            setReportSuccessToast(
              'Your report was submitted and will be reviewed by an administrator.'
            );
            setTimeout(() => setReportSuccessToast(null), 6000);
          }}
        />
      )}
    </div>
  );
};
