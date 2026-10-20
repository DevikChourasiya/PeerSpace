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

                  <div className="pt-2 flex items-center justify-between">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Cohort: {round.targetClass}</span>
                    </div>

                    {isOpen ? (
                      <button
                        type="button"
                        onClick={() => setSelectedRound(round)}
                        aria-label={`Evaluate peers for ${round.title}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-xs"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>Evaluate Peers</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        {isDeadlinePassed ? 'Submissions Closed' : 'Scheduled to Open'}
                      </span>
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
      <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 id="peer-selector-title" className="text-base font-bold text-slate-900">
              Select a Peer to Evaluate
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Round: <span className="font-semibold text-slate-800">{round.title}</span> (
              {currentSubmittedCount}/{maxSubmissions} evaluations completed)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close peer selector"
            className="p-1 rounded text-slate-400 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLimitReached && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              You have completed the maximum allowed evaluations ({maxSubmissions}) for this cycle.
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading cohort classmates...</div>
        ) : candidates.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
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
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-slate-900">{peer.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {peer.department || 'Student'} • {peer.classSection || round.targetClass}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSubmitted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        <CheckCircle2 className="h-3 w-3" />
                        Submitted
                      </span>
                    ) : isDraft ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        <Edit3 className="h-3 w-3" />
                        Draft Saved
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400">Not Started</span>
                    )}

                    <button
                      type="button"
                      disabled={!canClick}
                      onClick={() => onSelectPeer(peer)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        isSubmitted
                          ? 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                      }`}
                    >
                      {isSubmitted
                        ? round.allowSubmissionEdit
                          ? 'Edit'
                          : 'View'
                        : isDraft
                          ? 'Continue'
                          : 'Evaluate'}
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
