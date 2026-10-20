import React, { useState } from 'react';
import { X, Star, CheckSquare } from 'lucide-react';
import { QuestionType, type Question } from '@peerspace/shared';

interface QuestionnairePreviewModalProps {
  title: string;
  category: string;
  description?: string;
  versionNumber?: number;
  questions: Question[];
  onClose: () => void;
}

export const QuestionnairePreviewModal: React.FC<QuestionnairePreviewModalProps> = ({
  title,
  category,
  description,
  versionNumber,
  questions,
  onClose,
}) => {
  // Interactive preview state for demoing question inputs
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const handleStarClick = (questionId: string, starVal: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: starVal }));
  };

  const handleOptionSelect = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleMultiOptionToggle = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || [];
      const updated = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [questionId]: updated };
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="questionnaire-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex items-start justify-between gap-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 text-[11px] font-semibold text-blue-300">
                Questionnaire Preview
              </span>
              {versionNumber !== undefined && versionNumber > 0 && (
                <span className="rounded-full bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 text-[11px] font-bold text-amber-300 font-mono">
                  v{versionNumber}
                </span>
              )}
              <span className="text-xs text-slate-400">Category: {category}</span>
            </div>
            <h2
              id="questionnaire-preview-title"
              className="text-xl font-bold tracking-tight text-white mt-2"
            >
              {title}
            </h2>
            {description && (
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-xl">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close questionnaire preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Questions Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {questions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              This questionnaire draft has no questions yet.
            </div>
          ) : (
            questions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-blue-700 tracking-wider uppercase">
                      Question {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                      {q.title}
                      {q.required && (
                        <span className="text-red-500 text-xs font-semibold" title="Required">
                          *
                        </span>
                      )}
                    </h3>
                    {q.description && (
                      <p className="text-xs text-slate-500 mt-1">{q.description}</p>
                    )}
                  </div>

                  <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {q.type.replace('_', ' ')}
                  </span>
                </div>

                {/* Question Input Visuals */}
                <div className="pt-2">
                  {/* Star Rating */}
                  {q.type === QuestionType.STAR_RATING && (
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const selectedVal = (answers[q.id] as number) || 0;
                        const isFilled = starVal <= selectedVal;
                        return (
                          <button
                            key={starVal}
                            type="button"
                            onClick={() => handleStarClick(q.id, starVal)}
                            className="p-1 hover:scale-110 transition-transform focus:outline-none"
                            aria-label={`${starVal} Star`}
                          >
                            <Star
                              className={`h-6 w-6 ${
                                isFilled
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-slate-300 hover:text-amber-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                      {(answers[q.id] as number) > 0 && (
                        <span className="text-xs font-semibold text-slate-700 ml-2">
                          {answers[q.id] as number} / 5 Stars
                        </span>
                      )}
                    </div>
                  )}

                  {/* Numeric Rating */}
                  {q.type === QuestionType.NUMERIC_RATING && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Array.from(
                          { length: (q.scaleMax ?? 10) - (q.scaleMin ?? 1) + 1 },
                          (_, i) => (q.scaleMin ?? 1) + i
                        ).map((num) => {
                          const isSelected = answers[q.id] === num;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleOptionSelect(q.id, String(num))}
                              className={`h-9 w-9 rounded-lg text-xs font-bold transition-all ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>
                      {(q.scaleLabels?.min || q.scaleLabels?.max) && (
                        <div className="flex justify-between text-[11px] text-slate-500 italic">
                          <span>{q.scaleLabels.min}</span>
                          <span>{q.scaleLabels.max}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Single Choice */}
                  {q.type === QuestionType.SINGLE_CHOICE && (
                    <div className="space-y-1.5">
                      {(q.options || []).map((opt) => {
                        const isSelected = answers[q.id] === opt;
                        return (
                          <div
                            key={opt}
                            onClick={() => handleOptionSelect(q.id, opt)}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/60 text-blue-950 font-medium'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Multiple Choice */}
                  {q.type === QuestionType.MULTIPLE_CHOICE && (
                    <div className="space-y-1.5">
                      {(q.options || []).map((opt) => {
                        const currentArr = (answers[q.id] as string[]) || [];
                        const isSelected = currentArr.includes(opt);
                        return (
                          <div
                            key={opt}
                            onClick={() => handleMultiOptionToggle(q.id, opt)}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/60 text-blue-950 font-medium'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div
                              className={`h-4 w-4 rounded border flex items-center justify-center ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <CheckSquare className="h-3.5 w-3.5" />}
                            </div>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Yes / No */}
                  {q.type === QuestionType.YES_NO && (
                    <div className="flex items-center gap-3">
                      {['Yes', 'No'].map((opt) => {
                        const isSelected = answers[q.id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleOptionSelect(q.id, opt)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Text */}
                  {q.type === QuestionType.SHORT_TEXT && (
                    <input
                      type="text"
                      disabled
                      placeholder="Respondent short text answer..."
                      className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  )}

                  {/* Long Text */}
                  {q.type === QuestionType.LONG_TEXT && (
                    <textarea
                      rows={3}
                      disabled
                      placeholder="Respondent detailed feedback response..."
                      className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  )}

                  {/* Category Based */}
                  {q.type === QuestionType.CATEGORY_BASED && (
                    <div className="flex flex-wrap gap-2">
                      {(q.options || []).map((opt) => (
                        <span
                          key={opt}
                          className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700"
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>{questions.length} total evaluation rubric questions</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
