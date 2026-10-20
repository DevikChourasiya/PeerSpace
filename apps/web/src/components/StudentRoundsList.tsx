import React from 'react';
import {
  Calendar,
  Clock,
  ShieldCheck,
  FileText,
  AlertCircle,
  RefreshCw,
  Lock,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { useStudentRounds } from '../hooks/useRounds';

export const StudentRoundsList: React.FC = () => {
  const { rounds, isLoading, isFetching, error, refetch } = useStudentRounds();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Assigned Feedback & Evaluation Rounds
              </h2>
              <p className="text-xs text-slate-500">
                Peer review cycles scheduled for your course cohort and section.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
          <span>Sync Rounds</span>
        </button>
      </div>

      {/* Info notice about Stage 6 submissions */}
      <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl flex items-start gap-3 text-xs text-blue-900">
        <Lock className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
        <div>
          <span className="font-semibold text-blue-950">
            Stage 5: Feedback Round Scheduling & Questionnaire Assignment Active
          </span>
          <p className="mt-0.5 text-blue-900/90 leading-relaxed">
            Below are the peer evaluation cycles configured by course administrators. Interactive
            rubric submission and evaluation forms will unlock in Stage 6.
          </p>
        </div>
      </div>

      {/* Content Body */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 text-xs bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="h-7 w-7 animate-spin mx-auto mb-3 text-indigo-600" />
          <p className="font-semibold text-slate-700">Loading scheduled feedback rounds...</p>
        </div>
      ) : error ? (
        <div className="p-12 text-center bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
          <AlertCircle className="h-8 w-8 text-rose-600 mx-auto mb-2" />
          <p className="font-bold text-sm">Failed to load feedback rounds</p>
          <p className="text-xs text-rose-700 mt-1">{error.message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : rounds.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Calendar className="h-10 w-10 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">No Feedback Cycles Active</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your course instructor has not yet launched a feedback round for your cohort. Check back
            soon!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rounds.map((round) => {
            const isDeadlinePassed = new Date(round.deadline) < new Date();
            const isOpen = round.status === 'open' && !isDeadlinePassed;

            return (
              <div
                key={round.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-200 hover:shadow-sm transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                        isOpen
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/40'
                          : round.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300/40'
                            : 'bg-slate-100 text-slate-700 border border-slate-300/40'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {round.status}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        round.isAnonymous
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {round.isAnonymous ? (
                        <>
                          <EyeOff className="h-3 w-3 text-purple-600" />
                          <span>Anonymous Review</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-3 w-3 text-slate-500" />
                          <span>Named Review</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      {round.title}
                    </h3>
                    {round.description && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {round.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      Questionnaire:
                    </span>
                    <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                      {round.questionnaireTitle || 'Configured Rubric'} ({round.questionCount}{' '}
                      questions)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Submission Deadline:
                    </span>
                    <span
                      className={`font-semibold ${
                        isDeadlinePassed ? 'text-red-600' : 'text-slate-800'
                      }`}
                    >
                      {new Date(round.deadline).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Target: {round.targetClass}</span>
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Clearance Verified
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
