import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  ChevronRight,
  CheckCircle2,
  FileText,
  BookOpen,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Inbox,
  Award,
} from 'lucide-react';
import type { UserResponse } from '@peerspace/shared';
import { StudentDirectory } from './StudentDirectory';
import { StudentRoundsList } from './StudentRoundsList';
import { StudentAnalyticsDashboard } from './StudentAnalyticsDashboard';
import { useStudentRounds } from '../hooks/useRounds';
import { useReceivedFeedback, useStudentAnalytics } from '../hooks/useFeedbackAnalytics';

interface ActivePortalProps {
  user: UserResponse;
}

export const ActivePortal: React.FC<ActivePortalProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rounds' | 'directory' | 'analytics'>(
    'dashboard'
  );

  const { rounds, isLoading: isRoundsLoading } = useStudentRounds();
  const { data: feedbackList } = useReceivedFeedback();
  const { data: analytics } = useStudentAnalytics();

  const now = new Date();
  const activeRounds = rounds.filter((r) => r.status === 'open' && new Date(r.deadline) >= now);
  const upcomingRounds = rounds.filter(
    (r) => r.status === 'scheduled' || (r.status === 'open' && new Date(r.startDate) > now)
  );
  const completedOrClosedRounds = rounds.filter(
    (r) => r.status === 'closed' || new Date(r.deadline) < now
  );

  const reviewsReceivedCount = analytics?.totalEvaluationsReceived ?? (feedbackList?.length || 0);

  const tabDescriptions = {
    dashboard: 'Explore assigned feedback cycles, peer reviews, and your academic progress.',
    rounds: 'Active and upcoming peer evaluation cycles scheduled for your cohort.',
    directory: 'Browse classmates in your department and course cohort.',
    analytics: 'Explore feedback received, evaluation progress, and competency benchmarks.',
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 py-6 px-4 sm:px-6">
      {/* Tactile macOS Spatial Header Area */}
      <div className="bg-[#FCFBF9] dark:bg-[#211F1D] rounded-2xl border border-[#E4E0D8] dark:border-[#33302B] p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34A866]/30 bg-[#EEF9F2] dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-[#34A866] dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approved & Active Member
            </span>
            <span className="inline-flex items-center rounded-full bg-[#EFECE6] dark:bg-[#1C1A17] border border-[#E4E0D8] dark:border-[#33302B] px-2.5 py-0.5 text-xs font-semibold text-[#5C5952] dark:text-[#B5B0A4] capitalize">
              {user.role}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1B18] dark:text-[#F5F2EB] tracking-tight">
            Welcome back, {user.name}!
          </h1>

          <p className="text-xs sm:text-sm text-[#5C5952] dark:text-[#B5B0A4] leading-relaxed">
            {tabDescriptions[activeTab]}
          </p>
        </div>

        {/* Section / Academic Status Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-[#1C1B18] dark:text-[#F5F2EB] bg-[#EFECE6] dark:bg-[#1C1A17] px-3.5 py-2 rounded-xl border border-[#E4E0D8] dark:border-[#33302B]">
          <ShieldCheck className="h-4 w-4 text-[#34A866]" />
          <span>{user.classSection ? `Cohort: ${user.classSection}` : 'Enrolled Student'}</span>
        </div>
      </div>

      {/* Tactile Navigation Row */}
      <div className="bg-[#FCFBF9] dark:bg-[#211F1D] rounded-xl border border-[#E4E0D8] dark:border-[#33302B] px-4 pt-1 shadow-xs overflow-x-auto">
        <nav className="flex space-x-2 sm:space-x-6 text-xs sm:text-sm font-semibold min-w-max border-b border-[#E4E0D8]/60 dark:border-[#33302B]/60">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3 px-2 flex items-center gap-2 transition-all border-b-2 -mb-[1px] font-semibold ${
              activeTab === 'dashboard'
                ? 'border-[#5B9CF6] text-[#5B9CF6] dark:border-[#5B9CF6] dark:text-[#5B9CF6]'
                : 'border-transparent text-[#5C5952] hover:text-[#1C1B18] dark:text-[#B5B0A4] dark:hover:text-[#F5F2EB]'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rounds')}
            className={`pb-3 px-2 flex items-center gap-2 transition-all border-b-2 -mb-[1px] font-semibold ${
              activeTab === 'rounds'
                ? 'border-[#5B9CF6] text-[#5B9CF6] dark:border-[#5B9CF6] dark:text-[#5B9CF6]'
                : 'border-transparent text-[#5C5952] hover:text-[#1C1B18] dark:text-[#B5B0A4] dark:hover:text-[#F5F2EB]'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Assigned Feedback Rounds</span>
            {activeRounds.length > 0 && (
              <span
                className={`h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  activeTab === 'rounds'
                    ? 'bg-[#5B9CF6] text-white'
                    : 'bg-[#EFECE6] text-[#5C5952] dark:bg-[#1C1A17] dark:text-[#B5B0A4]'
                }`}
              >
                {activeRounds.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`pb-3 px-2 flex items-center gap-2 transition-all border-b-2 -mb-[1px] font-semibold ${
              activeTab === 'directory'
                ? 'border-[#5B9CF6] text-[#5B9CF6] dark:border-[#5B9CF6] dark:text-[#5B9CF6]'
                : 'border-transparent text-[#5C5952] hover:text-[#1C1B18] dark:text-[#B5B0A4] dark:hover:text-[#F5F2EB]'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Classmate Directory</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-2 flex items-center gap-2 transition-all border-b-2 -mb-[1px] font-semibold ${
              activeTab === 'analytics'
                ? 'border-[#5B9CF6] text-[#5B9CF6] dark:border-[#5B9CF6] dark:text-[#5B9CF6]'
                : 'border-transparent text-[#5C5952] hover:text-[#1C1B18] dark:text-[#B5B0A4] dark:hover:text-[#F5F2EB]'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Feedback Analytics</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Useful Student Landing Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Authentic Real-Data Metrics Overview: Pastel Surfaces with Matching Icon Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Active Evaluation Cycles (Sky Pastel) */}
            <div className="rounded-2xl border border-[#5B9CF6]/25 bg-[#EDF5FD] dark:bg-sky-950/30 p-5 shadow-xs flex items-center justify-between gap-3 transition-all">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#5B9CF6]">
                  Active Rounds
                </p>
                <p className="text-3xl font-extrabold text-[#1C1B18] dark:text-[#F5F2EB] tracking-tight mt-1">
                  {isRoundsLoading ? '...' : activeRounds.length}
                </p>
                <p className="text-xs font-medium text-[#5C5952] dark:text-[#B5B0A4] mt-1">
                  {activeRounds.length > 0 ? 'Open for evaluation' : 'No open rounds'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/80 dark:bg-sky-900/40 text-[#5B9CF6] border border-[#5B9CF6]/20 flex items-center justify-center shrink-0 shadow-xs">
                <Calendar className="h-6 w-6" />
              </div>
            </div>

            {/* Metric 2: Reviews Received (Mint Pastel) */}
            <div className="rounded-2xl border border-[#34A866]/25 bg-[#EEF9F2] dark:bg-emerald-950/30 p-5 shadow-xs flex items-center justify-between gap-3 transition-all">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#34A866]">
                  Reviews Received
                </p>
                <p className="text-3xl font-extrabold text-[#1C1B18] dark:text-[#F5F2EB] tracking-tight mt-1">
                  {reviewsReceivedCount}
                </p>
                <p className="text-xs font-medium text-[#5C5952] dark:text-[#B5B0A4] mt-1">
                  {reviewsReceivedCount > 0 ? 'Constructive peer feedback' : 'Awaiting feedback'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/80 dark:bg-emerald-900/40 text-[#34A866] border border-[#34A866]/20 flex items-center justify-center shrink-0 shadow-xs">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>

            {/* Metric 3: Upcoming Cycles (Lavender Pastel) */}
            <div className="rounded-2xl border border-[#6C5CE7]/25 bg-[#F2F0FC] dark:bg-purple-950/30 p-5 shadow-xs flex items-center justify-between gap-3 transition-all">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#6C5CE7]">
                  Upcoming Cycles
                </p>
                <p className="text-3xl font-extrabold text-[#1C1B18] dark:text-[#F5F2EB] tracking-tight mt-1">
                  {upcomingRounds.length}
                </p>
                <p className="text-xs font-medium text-[#5C5952] dark:text-[#B5B0A4] mt-1">
                  Scheduled by instructors
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/80 dark:bg-purple-900/40 text-[#6C5CE7] border border-[#6C5CE7]/20 flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="h-6 w-6" />
              </div>
            </div>

            {/* Metric 4: Academic Cohort (Peach Pastel) */}
            <div className="rounded-2xl border border-[#F47B55]/25 bg-[#FDF2EC] dark:bg-amber-950/30 p-5 shadow-xs flex items-center justify-between gap-3 transition-all">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#F47B55]">
                  Enrolled Section
                </p>
                <p className="text-3xl font-extrabold text-[#1C1B18] dark:text-[#F5F2EB] tracking-tight mt-1 truncate max-w-[140px]">
                  {user.classSection || 'Course Cohort'}
                </p>
                <p className="text-xs font-medium text-[#5C5952] dark:text-[#B5B0A4] mt-1 truncate max-w-[140px]">
                  {user.department || 'Enrolled Student'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/80 dark:bg-amber-900/40 text-[#F47B55] border border-[#F47B55]/20 flex items-center justify-center shrink-0 shadow-xs">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Two-Column Responsive Layout: Pending Reviews vs Completed Reviews on Wide Screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Pending Reviews */}
            <div className="bg-[#FCFBF9] dark:bg-[#211F1D] rounded-2xl border border-[#E4E0D8] dark:border-[#33302B] p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#E4E0D8] dark:border-[#33302B] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-[#EDF5FD] text-[#5B9CF6] flex items-center justify-center">
                      <Inbox className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-[#1C1B18] dark:text-[#F5F2EB]">
                        Pending Reviews
                      </h2>
                      <p className="text-xs text-[#5C5952] dark:text-[#B5B0A4]">
                        Evaluation cycles currently awaiting your peer feedback.
                      </p>
                    </div>
                  </div>
                  {activeRounds.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDF5FD] text-[#5B9CF6] border border-[#5B9CF6]/30">
                      {activeRounds.length} due
                    </span>
                  )}
                </div>

                {isRoundsLoading ? (
                  <div className="py-8 text-center text-xs text-[#5C5952] dark:text-[#B5B0A4]">
                    Loading pending feedback tasks...
                  </div>
                ) : activeRounds.length === 0 ? (
                  <div className="p-8 text-center bg-[#F5F2EB]/60 dark:bg-[#1C1A17]/60 rounded-xl border border-[#E4E0D8] dark:border-[#33302B] space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-[#34A866] mx-auto" />
                    <p className="text-sm font-semibold text-[#1C1B18] dark:text-[#F5F2EB]">
                      All caught up!
                    </p>
                    <p className="text-xs text-[#5C5952] dark:text-[#B5B0A4] max-w-xs mx-auto">
                      No feedback rounds are currently awaiting your submission.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeRounds.slice(0, 3).map((round) => (
                      <div
                        key={round.id}
                        className="p-4 rounded-xl border border-[#E4E0D8] dark:border-[#33302B] bg-[#FCFBF9] hover:bg-[#F5F2EB] dark:bg-[#1C1A17] dark:hover:bg-[#262420] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#1C1B18] dark:text-[#F5F2EB]">
                              {round.title}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EEF9F2] text-[#34A866] border border-[#34A866]/30">
                              Open
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#5C5952] dark:text-[#B5B0A4]">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5 text-[#6E6A61]" />
                              {round.questionnaireTitle || 'Rubric'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-[#6E6A61]" />
                              Due{' '}
                              {new Date(round.deadline).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveTab('rounds')}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5B9CF6] hover:bg-[#4689E2] text-white font-semibold text-xs transition-colors shadow-xs self-start sm:self-auto"
                        >
                          <span>Give Feedback</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#E4E0D8] dark:border-[#33302B]">
                <button
                  type="button"
                  onClick={() => setActiveTab('rounds')}
                  className="w-full inline-flex items-center justify-center gap-1 py-2 text-xs font-semibold text-[#5B9CF6] hover:text-[#4689E2] transition-colors"
                >
                  <span>View all evaluation cycles</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Column 2: Completed Reviews & Historical Cycles */}
            <div className="bg-[#FCFBF9] dark:bg-[#211F1D] rounded-2xl border border-[#E4E0D8] dark:border-[#33302B] p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#E4E0D8] dark:border-[#33302B] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-[#EEF9F2] text-[#34A866] flex items-center justify-center">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-[#1C1B18] dark:text-[#F5F2EB]">
                        Completed Reviews
                      </h2>
                      <p className="text-xs text-[#5C5952] dark:text-[#B5B0A4]">
                        Evaluations received and completed feedback cycles.
                      </p>
                    </div>
                  </div>
                  {reviewsReceivedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EEF9F2] text-[#34A866] border border-[#34A866]/30">
                      {reviewsReceivedCount} received
                    </span>
                  )}
                </div>

                {reviewsReceivedCount === 0 && completedOrClosedRounds.length === 0 ? (
                  <div className="p-8 text-center bg-[#F5F2EB]/60 dark:bg-[#1C1A17]/60 rounded-xl border border-[#E4E0D8] dark:border-[#33302B] space-y-2">
                    <BookOpen className="h-8 w-8 text-[#5B9CF6] mx-auto" />
                    <p className="text-sm font-semibold text-[#1C1B18] dark:text-[#F5F2EB]">
                      No completed reviews yet
                    </p>
                    <p className="text-xs text-[#5C5952] dark:text-[#B5B0A4] max-w-xs mx-auto">
                      Completed peer feedback and received evaluations will appear here once
                      submitted.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedOrClosedRounds.slice(0, 3).map((round) => (
                      <div
                        key={round.id}
                        className="p-4 rounded-xl border border-[#E4E0D8] dark:border-[#33302B] bg-[#FCFBF9] hover:bg-[#F5F2EB] dark:bg-[#1C1A17] dark:hover:bg-[#262420] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#1C1B18] dark:text-[#F5F2EB]">
                              {round.title}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EFECE6] text-[#5C5952] dark:bg-[#2A2824] dark:text-[#B5B0A4] border border-[#E4E0D8] dark:border-[#33302B]">
                              Closed
                            </span>
                          </div>
                          <p className="text-xs text-[#5C5952] dark:text-[#B5B0A4]">
                            Ended on{' '}
                            {new Date(round.deadline).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveTab('analytics')}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E4E0D8] dark:border-[#33302B] bg-[#FCFBF9] hover:bg-white dark:bg-[#1C1A17] dark:hover:bg-[#2A2824] text-[#1C1B18] dark:text-[#F5F2EB] font-semibold text-xs transition-colors shadow-xs self-start sm:self-auto"
                        >
                          <span>View Insights</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#E4E0D8] dark:border-[#33302B]">
                <button
                  type="button"
                  onClick={() => setActiveTab('analytics')}
                  className="w-full inline-flex items-center justify-center gap-1 py-2 text-xs font-semibold text-[#34A866] hover:text-emerald-700 transition-colors"
                >
                  <span>Explore feedback analytics</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Core Academic Modules (Preserving existing test strings) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Module 1: Course Feedback Cycles */}
            <div
              onClick={() => setActiveTab('rounds')}
              className="cursor-pointer rounded-2xl border border-[#E4E0D8] dark:border-[#33302B] bg-[#FCFBF9] dark:bg-[#211F1D] p-5 shadow-xs hover:border-[#5B9CF6]/50 hover:shadow-sm transition-all space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="h-10 w-10 rounded-xl bg-[#EDF5FD] dark:bg-sky-950/50 text-[#5B9CF6] flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-[#1C1B18] dark:text-[#F5F2EB] text-sm">
                  Course Feedback Cycles
                </h3>
                <p className="text-xs text-[#5C5952] dark:text-[#B5B0A4] leading-relaxed">
                  Assigned peer groups, rubric criteria, and evaluation schedules configured by your
                  course instructor.
                </p>
              </div>
              <div className="pt-2 flex items-center gap-1 text-xs font-semibold text-[#5B9CF6] transition-colors">
                <span>Go to rounds</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {/* Module 2: Anonymous Peer Reviews */}
            <div
              onClick={() => setActiveTab('directory')}
              className="cursor-pointer rounded-2xl border border-[#E4E0D8] dark:border-[#33302B] bg-[#FCFBF9] dark:bg-[#211F1D] p-5 shadow-xs hover:border-[#6C5CE7]/50 hover:shadow-sm transition-all space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="h-10 w-10 rounded-xl bg-[#F2F0FC] dark:bg-purple-950/50 text-[#6C5CE7] flex items-center justify-center">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-[#1C1B18] dark:text-[#F5F2EB] text-sm">
                  Anonymous Peer Reviews
                </h3>
                <p className="text-xs text-[#5C5952] dark:text-[#B5B0A4] leading-relaxed">
                  Constructive qualitative feedback loops with privacy protection, rubric scoring,
                  and report moderation.
                </p>
              </div>
              <div className="pt-2 flex items-center gap-1 text-xs font-semibold text-[#6C5CE7] transition-colors">
                <span>View directory</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {/* Module 3: Growth & Analytics */}
            <div
              onClick={() => setActiveTab('analytics')}
              className="cursor-pointer rounded-2xl border border-[#E4E0D8] dark:border-[#33302B] bg-[#FCFBF9] dark:bg-[#211F1D] p-5 shadow-xs hover:border-[#34A866]/50 hover:shadow-sm transition-all space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="h-10 w-10 rounded-xl bg-[#EEF9F2] dark:bg-emerald-950/50 text-[#34A866] flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-[#1C1B18] dark:text-[#F5F2EB] text-sm">
                  Growth & Analytics
                </h3>
                <p className="text-xs text-[#5C5952] dark:text-[#B5B0A4] leading-relaxed">
                  Longitudinal tracking of competency benchmarks, scoring distributions, and
                  constructive peer growth insights.
                </p>
              </div>
              <div className="pt-2 flex items-center gap-1 text-xs font-semibold text-[#34A866] transition-colors">
                <span>View analytics</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Feedback Rounds */}
      {activeTab === 'rounds' && <StudentRoundsList />}

      {/* Tab 3: Classmate Directory */}
      {activeTab === 'directory' && <StudentDirectory />}

      {/* Tab 4: Growth & Analytics */}
      {activeTab === 'analytics' && <StudentAnalyticsDashboard />}
    </div>
  );
};
