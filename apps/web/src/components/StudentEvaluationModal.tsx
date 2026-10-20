import React, { useState, useEffect } from 'react';
import { X, Star, CheckCircle2, AlertCircle, Save, Send, Edit3, Clock } from 'lucide-react';
import {
  QuestionType,
  type Question,
  type PeerCandidate,
  type ResponseItem,
} from '@peerspace/shared';
import { useSubmissions, usePeerSubmission } from '../hooks/useSubmissions';
import { useQuestionnaireVersion } from '../hooks/useQuestionnaires';

interface StudentEvaluationModalProps {
  roundId: string;
  roundTitle: string;
  questionnaireId: string;
  questionnaireVersionId?: string;
  allowSubmissionEdit: boolean;
  peer: PeerCandidate;
  onClose: () => void;
}

export const StudentEvaluationModal: React.FC<StudentEvaluationModalProps> = ({
  roundId,
  roundTitle,
  questionnaireId,
  questionnaireVersionId,
  allowSubmissionEdit,
  peer,
  onClose,
}) => {
  const { draftMutation, submitMutation, updateMutation } = useSubmissions(roundId);
  const { data: existingSubmission, isLoading: isSubmissionLoading } = usePeerSubmission(
    roundId,
    peer.id
  );

  const { data: versionData, isLoading: isVersionLoading } = useQuestionnaireVersion(
    questionnaireId,
    questionnaireVersionId || ''
  );

  const [responses, setResponses] = useState<
    Record<string, { rating?: number; value?: any; comment?: string }>
  >({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Initialize responses from existing draft or submission
  useEffect(() => {
    if (existingSubmission?.responses) {
      const initialMap: Record<string, { rating?: number; value?: any; comment?: string }> = {};
      for (const r of existingSubmission.responses) {
        initialMap[r.questionId] = {
          rating: r.rating,
          value: r.value,
          comment: r.comment,
        };
      }
      setResponses(initialMap);
    }
  }, [existingSubmission]);

  const questions: Question[] = versionData?.questions || [];
  const isAlreadySubmitted = existingSubmission?.status === 'submitted';
  const canEdit = isAlreadySubmitted ? allowSubmissionEdit : true;

  const handleRatingChange = (qId: string, rating: number) => {
    if (!canEdit) return;
    setResponses((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], rating },
    }));
  };

  const handleValueChange = (qId: string, value: any) => {
    if (!canEdit) return;
    setResponses((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], value },
    }));
  };

  const handleCommentChange = (qId: string, comment: string) => {
    if (!canEdit) return;
    setResponses((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], comment },
    }));
  };

  const buildResponseList = (): ResponseItem[] => {
    return questions.map((q) => {
      const resp = responses[q.id] || {};
      return {
        questionId: q.id,
        questionType: q.type,
        rating: resp.rating,
        value: resp.value,
        comment: resp.comment,
      };
    });
  };

  const handleSaveDraft = async () => {
    setFeedback(null);
    try {
      await draftMutation.mutateAsync({
        targetStudentId: peer.id,
        responses: buildResponseList(),
      });
      setFeedback({
        type: 'success',
        message: 'Draft saved. You can complete it anytime before the deadline.',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save draft.',
      });
    }
  };

  const handleSubmitFinal = async () => {
    setFeedback(null);

    // Client-side quick check
    for (const q of questions) {
      if (q.required) {
        const resp = responses[q.id];
        const hasRating = resp?.rating !== undefined && resp?.rating !== null;
        const hasVal = resp?.value !== undefined && resp?.value !== null && resp?.value !== '';
        if (!hasRating && !hasVal) {
          setFeedback({
            type: 'error',
            message: `Please answer required question: "${q.title}".`,
          });
          return;
        }
      }
    }

    try {
      if (isAlreadySubmitted && existingSubmission) {
        await updateMutation.mutateAsync({
          submissionId: existingSubmission.id,
          payload: { responses: buildResponseList() },
        });
        setFeedback({ type: 'success', message: 'Evaluation updated successfully!' });
      } else {
        await submitMutation.mutateAsync({
          targetStudentId: peer.id,
          responses: buildResponseList(),
        });
        setFeedback({ type: 'success', message: 'Evaluation submitted successfully!' });
      }
      setTimeout(() => onClose(), 1200);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to submit evaluation.',
      });
    }
  };

  const isLoading = isSubmissionLoading || isVersionLoading;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="eval-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                Peer Evaluation
              </span>
              {isAlreadySubmitted && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Submitted
                </span>
              )}
            </div>
            <h2 id="eval-modal-title" className="text-base font-bold text-slate-900 mt-1">
              Evaluating: {peer.name}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span>Round: {roundTitle}</span>
              {peer.classSection && <span>• Cohort: {peer.classSection}</span>}
              {peer.studentId && <span>• ID: {peer.studentId}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close evaluation modal"
            className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            role="alert"
            className={`flex items-center gap-2 p-3 rounded-lg text-xs font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading rubric questionnaire...
          </div>
        ) : questions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No questions available for this evaluation rubric.
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((q, idx) => {
              const resp = responses[q.id] || {};

              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                        {q.category && (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/60 px-1.5 py-0.2 rounded">
                            {q.category}
                          </span>
                        )}
                        {q.required && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900 text-xs mt-1">{q.title}</h3>
                      {q.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{q.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Render Question Inputs based on Type */}
                  <div className="pt-2 border-t border-slate-200/60">
                    {/* 1. Star Rating */}
                    {q.type === QuestionType.STAR_RATING && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: q.scaleMax || 5 }).map((_, sIdx) => {
                            const starVal = sIdx + 1;
                            const isSelected = (resp.rating || 0) >= starVal;
                            return (
                              <button
                                key={starVal}
                                type="button"
                                disabled={!canEdit}
                                onClick={() => handleRatingChange(q.id, starVal)}
                                aria-label={`Rate ${starVal} out of ${q.scaleMax || 5} stars`}
                                className={`p-1 rounded transition-colors ${
                                  isSelected
                                    ? 'text-amber-500'
                                    : 'text-slate-300 hover:text-amber-300'
                                } disabled:cursor-not-allowed`}
                              >
                                <Star className={`h-6 w-6 ${isSelected ? 'fill-amber-400' : ''}`} />
                              </button>
                            );
                          })}
                          <span className="text-xs font-bold text-slate-700 ml-2">
                            {resp.rating
                              ? `${resp.rating} / ${q.scaleMax || 5} Stars`
                              : 'Not Rated'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 2. Numeric Rating */}
                    {q.type === QuestionType.NUMERIC_RATING && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                          <span>{q.scaleLabels?.min || `Min (${q.scaleMin ?? 1})`}</span>
                          <span className="font-bold text-blue-700 text-sm">
                            Score: {resp.rating ?? '--'}
                          </span>
                          <span>{q.scaleLabels?.max || `Max (${q.scaleMax ?? 10})`}</span>
                        </div>
                        <input
                          type="range"
                          disabled={!canEdit}
                          min={q.scaleMin ?? 1}
                          max={q.scaleMax ?? 10}
                          value={resp.rating ?? q.scaleMin ?? 1}
                          onChange={(e) => handleRatingChange(q.id, Number(e.target.value))}
                          className="w-full accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </div>
                    )}

                    {/* 3. Yes/No */}
                    {q.type === QuestionType.YES_NO && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleValueChange(q.id, true)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            resp.value === true
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleValueChange(q.id, false)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            resp.value === false
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    )}

                    {/* 4. Single Choice */}
                    {q.type === QuestionType.SINGLE_CHOICE && (
                      <div className="space-y-1.5">
                        {(q.options || []).map((opt) => (
                          <label
                            key={opt}
                            className="flex items-center gap-2 cursor-pointer text-xs text-slate-700"
                          >
                            <input
                              type="radio"
                              disabled={!canEdit}
                              name={`single_choice_${q.id}`}
                              checked={resp.value === opt}
                              onChange={() => handleValueChange(q.id, opt)}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* 5. Multiple Choice */}
                    {q.type === QuestionType.MULTIPLE_CHOICE && (
                      <div className="space-y-1.5">
                        {(q.options || []).map((opt) => {
                          const currentVals: string[] = Array.isArray(resp.value) ? resp.value : [];
                          const isChecked = currentVals.includes(opt);
                          return (
                            <label
                              key={opt}
                              className="flex items-center gap-2 cursor-pointer text-xs text-slate-700"
                            >
                              <input
                                type="checkbox"
                                disabled={!canEdit}
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleValueChange(q.id, [...currentVals, opt]);
                                  } else {
                                    handleValueChange(
                                      q.id,
                                      currentVals.filter((v) => v !== opt)
                                    );
                                  }
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* 6. Short Text */}
                    {q.type === QuestionType.SHORT_TEXT && (
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={resp.value || ''}
                        onChange={(e) => handleValueChange(q.id, e.target.value)}
                        placeholder="Your short answer..."
                        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-100"
                      />
                    )}

                    {/* 7. Long Text / Comment */}
                    {(q.type === QuestionType.LONG_TEXT ||
                      q.type === QuestionType.CATEGORY_BASED) && (
                      <div className="space-y-2">
                        {q.type === QuestionType.CATEGORY_BASED && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-slate-700">
                              Category Score:
                            </span>
                            {Array.from({ length: 5 }).map((_, sIdx) => {
                              const starVal = sIdx + 1;
                              const isSelected = (resp.rating || 0) >= starVal;
                              return (
                                <button
                                  key={starVal}
                                  type="button"
                                  disabled={!canEdit}
                                  onClick={() => handleRatingChange(q.id, starVal)}
                                  className={`p-0.5 rounded ${
                                    isSelected
                                      ? 'text-amber-500'
                                      : 'text-slate-300 hover:text-amber-300'
                                  }`}
                                >
                                  <Star
                                    className={`h-5 w-5 ${isSelected ? 'fill-amber-400' : ''}`}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <textarea
                          rows={3}
                          disabled={!canEdit}
                          value={resp.comment ?? (typeof resp.value === 'string' ? resp.value : '')}
                          onChange={(e) => {
                            handleCommentChange(q.id, e.target.value);
                            handleValueChange(q.id, e.target.value);
                          }}
                          placeholder="Provide constructive, actionable peer feedback..."
                          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-100"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Peer review responses are confidential and identity-protected.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Close
                </button>

                {!isAlreadySubmitted && (
                  <button
                    type="button"
                    disabled={draftMutation.isPending}
                    onClick={handleSaveDraft}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{draftMutation.isPending ? 'Saving...' : 'Save Draft'}</span>
                  </button>
                )}

                {canEdit && (
                  <button
                    type="button"
                    disabled={submitMutation.isPending || updateMutation.isPending}
                    onClick={handleSubmitFinal}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 shadow-xs"
                  >
                    {isAlreadySubmitted ? (
                      <>
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>
                          {updateMutation.isPending ? 'Updating...' : 'Update Evaluation'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>
                          {submitMutation.isPending ? 'Submitting...' : 'Submit Final Evaluation'}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
