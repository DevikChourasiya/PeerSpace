import React, { useState } from 'react';
import { Flag, X, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { ReportReason } from '@peerspace/shared';
import { useReportFeedback } from '../hooks/useModeration';

interface ReportFeedbackModalProps {
  submissionId: string;
  questionId: string;
  questionTitle: string;
  commentText: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReportFeedbackModal: React.FC<ReportFeedbackModalProps> = ({
  submissionId,
  questionId,
  questionTitle,
  commentText,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<ReportReason>(ReportReason.HARASSMENT);
  const [explanation, setExplanation] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reportMutation = useReportFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      await reportMutation.mutateAsync({
        submissionId,
        questionId,
        reason,
        explanation: explanation.trim() || undefined,
      });
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report.';
      setErrorMsg(msg);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
              <Flag className="h-4 w-4" />
            </div>
            <div>
              <h3 id="report-modal-title" className="text-base font-bold text-slate-900">
                Report Inappropriate Feedback
              </h3>
              <p className="text-xs text-slate-500">
                Flag content that violates community guidelines for administrator review.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={reportMutation.isPending}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quoted Comment Preview */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Reported Item: {questionTitle}
          </span>
          <p className="text-xs text-slate-700 italic border-l-2 border-red-400 pl-2">
            "{commentText}"
          </p>
        </div>

        {/* Confidentiality Notice */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-blue-50/70 border border-blue-200/60 rounded-lg p-2.5">
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
          <span>
            Reports are strictly confidential. The original reviewer will not be informed of your
            report.
          </span>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="report-reason" className="block text-xs font-semibold text-slate-700">
              Reason for Report <span className="text-red-500">*</span>
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value={ReportReason.HARASSMENT}>Harassment or Abusive Behavior</option>
              <option value={ReportReason.OFFENSIVE_LANGUAGE}>Offensive Language / Slurs</option>
              <option value={ReportReason.UNCONSTRUCTIVE}>
                Unconstructive / Non-Actionable Attack
              </option>
              <option value={ReportReason.SPAM}>Spam or Irrelevant Content</option>
              <option value={ReportReason.OTHER}>Other Policy Violation</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="report-explanation"
              className="block text-xs font-semibold text-slate-700"
            >
              Additional Explanation <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="report-explanation"
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Provide any additional context to assist the administrator in reviewing this feedback..."
              maxLength={1000}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <span className="text-[10px] text-slate-400 text-right block">
              {explanation.length}/1000 characters
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={reportMutation.isPending}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reportMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors shadow-xs disabled:opacity-60"
            >
              {reportMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Flag className="h-3.5 w-3.5" />
                  <span>Submit Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
