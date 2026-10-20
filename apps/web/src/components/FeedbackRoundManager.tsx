import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Play,
  Square,
  Archive,
  Clock,
  EyeOff,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
} from 'lucide-react';
import { RoundStatus, FeedbackVisibility } from '@peerspace/shared';
import { useAdminRounds } from '../hooks/useRounds';
import { useQuestionnaires } from '../hooks/useQuestionnaires';

export const FeedbackRoundManager: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { rounds, roundsQuery, createMutation, transitionMutation } = useAdminRounds(
    statusFilter || undefined
  );
  const { questionnaires } = useQuestionnaires();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Creation form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questionnaireId, setQuestionnaireId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 16));
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 16)
  );
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [allowSubmissionEdit, setAllowSubmissionEdit] = useState(true);
  const [submissionsPerPeer, setSubmissionsPerPeer] = useState(1);
  const [feedbackVisibility, setFeedbackVisibility] = useState<FeedbackVisibility>(
    FeedbackVisibility.AFTER_DEADLINE
  );
  const [targetClass, setTargetClass] = useState('CS-401');

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!title.trim()) {
      setFeedback({ type: 'error', message: 'Round title is required.' });
      return;
    }

    if (new Date(deadline) <= new Date(startDate)) {
      setFeedback({ type: 'error', message: 'Deadline must be after start date.' });
      return;
    }

    try {
      const selectedQ = questionnaires.find((q) => q.id === questionnaireId);
      const qVersionId = selectedQ?.publishedVersionId || undefined;

      await createMutation.mutateAsync({
        title,
        description,
        questionnaireId: questionnaireId || undefined,
        questionnaireVersionId: qVersionId,
        startDate: new Date(startDate).toISOString(),
        deadline: new Date(deadline).toISOString(),
        isAnonymous,
        allowSubmissionEdit,
        submissionsPerPeer,
        feedbackVisibility,
        targetClass,
        eligibleStudentIds: [],
      });

      setFeedback({
        type: 'success',
        message: 'Feedback round created in draft status.',
      });
      setShowCreateModal(false);
      // Reset form
      setTitle('');
      setDescription('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create feedback round.';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleStatusTransition = async (roundId: string, targetStatus: RoundStatus) => {
    setFeedback(null);
    try {
      await transitionMutation.mutateAsync({
        id: roundId,
        payload: { status: targetStatus },
      });
      setFeedback({
        type: 'success',
        message: `Feedback round status updated to "${targetStatus}".`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status transition failed.';
      setFeedback({ type: 'error', message: msg });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Course Feedback Rounds & Cycles
              </h2>
              <p className="text-xs text-slate-500">
                Launch, monitor, and transition peer review cycles with published rubrics.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {['', 'draft', 'scheduled', 'open', 'closed', 'archived'].map((st) => (
              <button
                key={st || 'all'}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st || 'All'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Round</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="rounded p-1 hover:bg-black/5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Rounds Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {roundsQuery.isLoading ? (
          <div className="p-16 text-center text-slate-500 text-xs">Loading feedback rounds...</div>
        ) : rounds.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Calendar className="h-10 w-10 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">No Feedback Rounds Found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create a new feedback round and connect it to a published questionnaire rubric.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Round Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Rubric Questionnaire</th>
                  <th className="py-3 px-4">Cohort / Class</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4 text-right">Lifecycle Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rounds.map((round) => {
                  const isTransitioning = transitionMutation.isPending;

                  return (
                    <tr key={round.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{round.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {round.isAnonymous ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-medium">
                              <EyeOff className="h-2.5 w-2.5" />
                              Anonymous
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                              <UserCheck className="h-2.5 w-2.5" />
                              Named
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
                            round.status === RoundStatus.OPEN
                              ? 'bg-emerald-100 text-emerald-800'
                              : round.status === RoundStatus.SCHEDULED
                                ? 'bg-blue-100 text-blue-800'
                                : round.status === RoundStatus.CLOSED
                                  ? 'bg-amber-100 text-amber-800'
                                  : round.status === RoundStatus.ARCHIVED
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {round.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {round.questionnaireTitle ? (
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <FileText className="h-3.5 w-3.5 text-blue-600" />
                            <span>{round.questionnaireTitle}</span>
                            {round.questionnaireVersionNumber !== undefined && (
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1 rounded">
                                v{round.questionnaireVersionNumber}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-600 italic">No questionnaire linked</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">{round.targetClass}</td>

                      <td className="py-3 px-4 text-slate-600">
                        {new Date(round.deadline).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Launch Round */}
                          {(round.status === RoundStatus.DRAFT ||
                            round.status === RoundStatus.SCHEDULED) && (
                            <button
                              type="button"
                              onClick={() => handleStatusTransition(round.id, RoundStatus.OPEN)}
                              disabled={isTransitioning}
                              aria-label={`Open feedback round ${round.title}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors disabled:opacity-50"
                              title="Launch evaluation round"
                            >
                              <Play className="h-3 w-3" />
                              <span>Open</span>
                            </button>
                          )}

                          {/* Close Round */}
                          {round.status === RoundStatus.OPEN && (
                            <button
                              type="button"
                              onClick={() => handleStatusTransition(round.id, RoundStatus.CLOSED)}
                              disabled={isTransitioning}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 font-semibold text-xs hover:bg-amber-100 transition-colors disabled:opacity-50"
                              title="Close evaluation submissions"
                            >
                              <Square className="h-3 w-3" />
                              <span>Close</span>
                            </button>
                          )}

                          {/* Archive Round */}
                          {round.status === RoundStatus.CLOSED && (
                            <button
                              type="button"
                              onClick={() => handleStatusTransition(round.id, RoundStatus.ARCHIVED)}
                              disabled={isTransitioning}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors disabled:opacity-50"
                              title="Archive round"
                            >
                              <Archive className="h-3 w-3" />
                              <span>Archive</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Round Modal */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-round-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 id="create-round-modal-title" className="text-base font-bold text-slate-900">
                  Create New Feedback Round
                </h3>
                <p className="text-xs text-slate-500">
                  Configure evaluation dates, questionnaire rubric, and privacy settings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRound} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label
                  htmlFor="round-title-input"
                  className="block font-bold text-slate-700 uppercase"
                >
                  Round Title
                </label>
                <input
                  id="round-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Peer Evaluation 2026"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="round-desc-input"
                  className="block font-bold text-slate-700 uppercase"
                >
                  Description (Optional)
                </label>
                <textarea
                  id="round-desc-input"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide instructions for participating students..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="round-questionnaire-select"
                  className="block font-bold text-slate-700 uppercase"
                >
                  Associated Rubric Questionnaire
                </label>
                <select
                  id="round-questionnaire-select"
                  value={questionnaireId}
                  onChange={(e) => setQuestionnaireId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                >
                  <option value="">-- Select Published Questionnaire --</option>
                  {questionnaires.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title} (
                      {q.status === 'published' ? `v${q.currentVersion} published` : 'draft only'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Only questionnaires with a published version can be launched into an open round.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="round-start-input"
                    className="block font-bold text-slate-700 uppercase"
                  >
                    Start Date & Time
                  </label>
                  <input
                    id="round-start-input"
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="round-deadline-input"
                    className="block font-bold text-slate-700 uppercase"
                  >
                    Deadline Date & Time
                  </label>
                  <input
                    id="round-deadline-input"
                    type="datetime-local"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="round-target-class"
                    className="block font-bold text-slate-700 uppercase"
                  >
                    Target Class / Cohort
                  </label>
                  <input
                    id="round-target-class"
                    type="text"
                    value={targetClass}
                    onChange={(e) => setTargetClass(e.target.value)}
                    placeholder="e.g. CS-401"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="round-visibility-select"
                    className="block font-bold text-slate-700 uppercase"
                  >
                    Feedback Visibility
                  </label>
                  <select
                    id="round-visibility-select"
                    value={feedbackVisibility}
                    onChange={(e) => setFeedbackVisibility(e.target.value as FeedbackVisibility)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value={FeedbackVisibility.AFTER_DEADLINE}>
                      After Deadline Reached
                    </option>
                    <option value={FeedbackVisibility.IMMEDIATE}>Immediate Upon Submission</option>
                    <option value={FeedbackVisibility.INSTRUCTOR_RELEASED}>
                      Manual Instructor Release
                    </option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="round-submissions-per-peer"
                  className="block font-bold text-slate-700 uppercase"
                >
                  Submission Limit Per Peer Reviewer
                </label>
                <input
                  id="round-submissions-per-peer"
                  type="number"
                  min={1}
                  max={10}
                  value={submissionsPerPeer}
                  onChange={(e) =>
                    setSubmissionsPerPeer(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="font-semibold text-slate-800">
                    Anonymous Peer Review (Protect respondent identity)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowSubmissionEdit}
                    onChange={(e) => setAllowSubmissionEdit(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">
                    Allow students to edit submission before the deadline
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 shadow-xs"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Feedback Round'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
