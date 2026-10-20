import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  ShieldCheck,
  FileText,
  AlertCircle,
  RefreshCw,
  EyeOff,
  UserCheck,
  Users,
  ChevronRight,
  Edit3,
  CheckCircle2,
  X,
  Lock,
} from 'lucide-react';
import type { PeerCandidate } from '@peerspace/shared';
import { useStudentRounds } from '../hooks/useRounds';
import { useSubmissions } from '../hooks/useSubmissions';
import { StudentEvaluationModal } from './StudentEvaluationModal';

export interface StudentRoundItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  startDate: string;
  deadline: string;
  isAnonymous: boolean;
  allowSubmissionEdit: boolean;
  submissionsPerPeer: number;
  feedbackVisibility: string;
  targetClass: string;
  questionnaireId?: string;
  questionnaireVersionId?: string;
  questionnaireTitle?: string;
  questionCount: number;
}

export const StudentRoundsList: React.FC = () => {
  const { rounds, isLoading, isFetching, error, refetch } = useStudentRounds();

  // Selected round for viewing peer candidates
  const [selectedRound, setSelectedRound] = useState<StudentRoundItem | null>(null);
  // Selected peer for evaluation modal
  const [evaluatingPeer, setEvaluatingPeer] = useState<PeerCandidate | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-darkSurface-card p-5 rounded-2xl border border-lavender-200/80 dark:border-darkSurface-border shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-xl bg-lavender-100 dark:bg-lavender-950/60 text-lavender-600 dark:text-lavender-300 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-lavender-100">
                Assigned Feedback Rounds
              </h2>
              <p className="text-xs text-slate-500 dark:text-darkSurface-muted">
                Peer review cycles scheduled for your course cohort and section.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-lavender-200 dark:border-darkSurface-border bg-lavender-50/50 dark:bg-darkSurface-bg hover:bg-lavender-100 dark:hover:bg-darkSurface-cardHover text-xs font-semibold text-slate-700 dark:text-lavender-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-lavender-500' : ''}`}
          />
          <span>Sync Rounds</span>
        </button>
      </div>

      {/* Content Body */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 dark:text-darkSurface-muted text-xs bg-white dark:bg-darkSurface-card rounded-2xl border border-lavender-200/80 dark:border-darkSurface-border">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-lavender-500" />
          <p className="font-semibold text-slate-700 dark:text-lavender-200">
            Loading scheduled feedback rounds...
          </p>
        </div>
      ) : error ? (
        <div className="p-12 text-center bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-800 dark:text-rose-300">
          <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400 mx-auto mb-2" />
          <p className="font-bold text-sm">Failed to load feedback rounds</p>
          <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">{error.message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : rounds.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-darkSurface-card rounded-2xl border border-lavender-200/80 dark:border-darkSurface-border space-y-3">
          <Calendar className="h-10 w-10 text-lavender-300 dark:text-darkSurface-muted mx-auto" />
          <p className="text-sm font-semibold text-slate-800 dark:text-lavender-200">
            No Feedback Rounds Currently Active
          </p>
          <p className="text-xs text-slate-500 dark:text-darkSurface-muted max-w-sm mx-auto">
            Your instructor has not yet launched a feedback round for your cohort. Check back soon!
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
                className="bg-white dark:bg-darkSurface-card rounded-2xl border border-lavender-200/80 dark:border-darkSurface-border p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-lavender-300 dark:hover:border-lavender-600 hover:shadow-soft-purple transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                        isOpen
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-700/40'
                          : round.status === 'scheduled'
                            ? 'bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-300/40 dark:border-sky-700/40'
                            : 'bg-slate-100 dark:bg-darkSurface-bg text-slate-700 dark:text-darkSurface-muted border border-slate-300/40 dark:border-darkSurface-border'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {isOpen ? 'Open' : round.status}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        round.isAnonymous
                          ? 'bg-lavender-100 dark:bg-lavender-950/50 text-lavender-700 dark:text-lavender-300 border border-lavender-200 dark:border-lavender-800/40'
                          : 'bg-slate-100 dark:bg-darkSurface-bg text-slate-700 dark:text-darkSurface-muted'
                      }`}
                    >
                      {round.isAnonymous ? (
                        <>
                          <EyeOff className="h-3 w-3 text-lavender-500" />
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
                    <h3 className="text-base font-bold text-slate-900 dark:text-lavender-100 tracking-tight">
                      {round.title}
                    </h3>
                    {round.description && (
                      <p className="text-xs text-slate-600 dark:text-darkSurface-muted mt-1 line-clamp-2 leading-relaxed">
                        {round.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-lavender-100 dark:border-darkSurface-border space-y-2 text-xs text-slate-600 dark:text-lavender-200">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-darkSurface-muted">
                      <FileText className="h-3.5 w-3.5 text-lavender-400" />
                      Questionnaire:
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-lavender-100 truncate max-w-[200px]">
                      {round.questionnaireTitle || 'Configured Rubric'} ({round.questionCount}{' '}
                      questions)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-darkSurface-muted">
                      <Clock className="h-3.5 w-3.5 text-lavender-400" />
                      Submission Deadline:
                    </span>
                    <span
                      className={`font-semibold ${
                        isDeadlinePassed
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-800 dark:text-lavender-100'
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

                  <div className="pt-3 flex items-center justify-between gap-2 border-t border-lavender-50 dark:border-darkSurface-borderLight/30">
                    <div className="text-[11px] text-slate-400 dark:text-darkSurface-muted flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Cohort: {round.targetClass}</span>
                    </div>

                    {/* Explicit Action Button in Every State */}
                    {isOpen ? (
                      <button
                        type="button"
                        onClick={() => setSelectedRound(round)}
                        aria-label={`Evaluate peers for ${round.title}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-lavender-500 to-sky-500 hover:from-lavender-600 hover:to-sky-600 text-white font-semibold text-xs transition-all shadow-md shadow-lavender-500/25 active:scale-95"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>Give Feedback</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    ) : isDeadlinePassed ? (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-darkSurface-bg border border-slate-200 dark:border-darkSurface-border text-slate-400 dark:text-darkSurface-muted text-xs font-semibold cursor-not-allowed opacity-75"
                      >
                        <span>Round Closed</span>
                      </button>
                    ) : round.status === 'scheduled' ? (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-darkSurface-bg border border-slate-200 dark:border-darkSurface-border text-slate-400 dark:text-darkSurface-muted text-xs font-semibold cursor-not-allowed opacity-75"
                      >
                        <span>
                          Opens{' '}
                          {new Date(round.startDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-darkSurface-bg border border-slate-200 dark:border-darkSurface-border text-slate-400 dark:text-darkSurface-muted text-xs font-semibold cursor-not-allowed opacity-75"
                      >
                        <Lock className="h-3 w-3" />
                        <span>Locked</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Peer Candidates Modal for Selected Round */}
      {selectedRound && (
        <PeerCandidateSelectorModal
          round={selectedRound}
          onClose={() => setSelectedRound(null)}
          onSelectPeer={(peer) => {
            setEvaluatingPeer(peer);
          }}
        />
      )}

      {/* Evaluation Rubric Modal */}
      {selectedRound && evaluatingPeer && (
        <StudentEvaluationModal
          roundId={selectedRound.id}
          roundTitle={selectedRound.title}
          questionnaireId={selectedRound.questionnaireId || ''}
          questionnaireVersionId={selectedRound.questionnaireVersionId || undefined}
          allowSubmissionEdit={selectedRound.allowSubmissionEdit ?? true}
          peer={evaluatingPeer}
          onClose={() => setEvaluatingPeer(null)}
        />
      )}
    </div>
  );
};

interface PeerCandidateSelectorModalProps {
  round: StudentRoundItem;
  onClose: () => void;
  onSelectPeer: (peer: PeerCandidate) => void;
}

const PeerCandidateSelectorModal: React.FC<PeerCandidateSelectorModalProps> = ({
  round,
  onClose,
  onSelectPeer,
}) => {
  const { candidates, isLoading, candidatesResult } = useSubmissions(round.id);

  const maxSubmissions = candidatesResult?.submissionsPerPeer || 1;
  const currentSubmittedCount = candidatesResult?.submittedCount || 0;
  const isLimitReached = currentSubmittedCount >= maxSubmissions;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="peer-selector-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-darkSurface-card shadow-2xl border border-lavender-200 dark:border-darkSurface-border p-6 space-y-4">
        <div className="flex items-start justify-between border-b border-lavender-100 dark:border-darkSurface-border pb-3">
          <div>
            <h3
              id="peer-selector-title"
              className="text-base font-bold text-slate-900 dark:text-lavender-100"
            >
              Select a Peer to Evaluate
            </h3>
            <p className="text-xs text-slate-500 dark:text-darkSurface-muted mt-0.5">
              Round:{' '}
              <span className="font-semibold text-slate-800 dark:text-lavender-200">
                {round.title}
              </span>{' '}
              ({currentSubmittedCount}/{maxSubmissions} evaluations completed)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close peer selector"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-lavender-200 hover:bg-lavender-50 dark:hover:bg-darkSurface-cardHover"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLimitReached && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              You have completed the maximum allowed evaluations ({maxSubmissions}) for this cycle.
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-darkSurface-muted">
            Loading cohort classmates...
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-darkSurface-muted">
            No other students found in cohort "{round.targetClass}".
          </div>
        ) : (
          <div className="space-y-2">
            {candidates.map((peer) => {
              const isSubmitted = peer.submissionStatus === 'submitted';
              const isDraft = peer.submissionStatus === 'draft';
              const canClick = isSubmitted ? (round.allowSubmissionEdit ?? true) : !isLimitReached;

              return (
                <div
                  key={peer.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-lavender-200/70 dark:border-darkSurface-border hover:border-lavender-300 dark:hover:border-lavender-700 bg-lavender-50/40 dark:bg-darkSurface-bg/50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-slate-900 dark:text-lavender-100">
                      {peer.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-darkSurface-muted">
                      {peer.department || 'Student'} • {peer.classSection || round.targetClass}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSubmitted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                        Submitted
                      </span>
                    ) : isDraft ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full">
                        <Edit3 className="h-3 w-3" />
                        Draft Saved
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 dark:text-darkSurface-muted">
                        Not Started
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={!canClick}
                      onClick={() => onSelectPeer(peer)}
                      className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        isSubmitted
                          ? 'border border-lavender-200 dark:border-darkSurface-border text-slate-700 dark:text-lavender-200 hover:bg-white dark:hover:bg-darkSurface-card'
                          : 'bg-gradient-to-r from-lavender-500 to-sky-500 text-white hover:from-lavender-600 hover:to-sky-600 shadow-soft-purple active:scale-95'
                      }`}
                    >
                      {isSubmitted
                        ? round.allowSubmissionEdit
                          ? 'Edit Feedback'
                          : 'View Feedback'
                        : isDraft
                          ? 'Continue Draft'
                          : 'Give Feedback'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
