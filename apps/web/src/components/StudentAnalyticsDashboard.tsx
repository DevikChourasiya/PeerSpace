import React, { useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useStudentAnalytics, useReceivedFeedback } from '../hooks/useFeedbackAnalytics';

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
      {/* Top Banner / Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Evaluations Received
            </span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {isLoading ? '--' : analytics?.totalEvaluationsReceived || 0}
          </div>
          <p className="text-[11px] text-slate-400">Total peer reviews completed for you</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Your Average Score
            </span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 flex items-center gap-1">
            {isLoading ? '--' : (analytics?.overallAverageScore || 0).toFixed(1)}
            <span className="text-xs font-normal text-slate-400">/ 5.0</span>
          </div>
          <p className="text-[11px] text-slate-400">Across all evaluated rubric categories</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Cohort Benchmark</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 flex items-center gap-1">
            {isLoading ? '--' : (analytics?.cohortAverageScore || 0).toFixed(1)}
            <span className="text-xs font-normal text-slate-400">/ 5.0</span>
          </div>
          <p className="text-[11px] text-slate-400">Class-wide average performance</p>
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
                    <div key={rIdx} className="text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">{resp.title}</span>
                        {resp.rating !== undefined && (
                          <span className="font-bold text-amber-600 flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-amber-400" />
                            {resp.rating} / 5
                          </span>
                        )}
                      </div>
                      {resp.comment && (
                        <p className="text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/70 italic text-[11px] leading-relaxed">
                          "{resp.comment}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
