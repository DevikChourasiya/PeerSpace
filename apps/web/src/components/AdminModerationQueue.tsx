import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  EyeOff,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Calendar,
  User,
} from 'lucide-react';
import {
  ReportStatus,
  ModerationResolutionAction,
  type FeedbackReportResponse,
} from '@peerspace/shared';
import { useModerationReports, useResolveModerationReport } from '../hooks/useModeration';

export const AdminModerationQueue: React.FC = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedReport, setSelectedReport] = useState<{
    report: FeedbackReportResponse;
    action: ModerationResolutionAction;
  } | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const { data, isLoading, isError, error } = useModerationReports(
    page,
    20,
    statusFilter || undefined
  );
  const resolveMutation = useResolveModerationReport();

  const reports = data?.items || [];
  const totalPages = data?.totalPages || 1;
  const pendingCount = data?.pendingCount || 0;

  const handleOpenActionModal = (
    report: FeedbackReportResponse,
    action: ModerationResolutionAction
  ) => {
    setSelectedReport({ report, action });
    setResolutionNote('');
    setActionFeedback(null);
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !resolutionNote.trim()) return;

    setActionFeedback(null);
    try {
      await resolveMutation.mutateAsync({
        reportId: selectedReport.report.id,
        input: {
          action: selectedReport.action,
          note: resolutionNote.trim(),
        },
      });

      const actionLabel =
        selectedReport.action === ModerationResolutionAction.HIDE_COMMENT
          ? 'Comment hidden from student evaluations'
          : selectedReport.action === ModerationResolutionAction.RESTORE_COMMENT
            ? 'Comment restored to student evaluations'
            : 'Report dismissed';

      setActionFeedback({
        type: 'success',
        message: `Successfully resolved report: ${actionLabel}.`,
      });
      setSelectedReport(null);
      setResolutionNote('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to execute moderation action.';
      setActionFeedback({ type: 'error', message: msg });
    }
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'harassment':
        return (
          <span className="rounded bg-red-100 text-red-800 px-2 py-0.5 text-[10px] font-bold">
            Harassment
          </span>
        );
      case 'offensive_language':
        return (
          <span className="rounded bg-orange-100 text-orange-800 px-2 py-0.5 text-[10px] font-bold">
            Offensive Language
          </span>
        );
      case 'unconstructive':
        return (
          <span className="rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
            Unconstructive
          </span>
        );
      case 'spam':
        return (
          <span className="rounded bg-slate-100 text-slate-800 px-2 py-0.5 text-[10px] font-bold">
            Spam
          </span>
        );
      default:
        return (
          <span className="rounded bg-purple-100 text-purple-800 px-2 py-0.5 text-[10px] font-bold">
            Other Violation
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-semibold">
            Pending Review
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-semibold">
            Resolved
          </span>
        );
      case 'dismissed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-semibold">
            Dismissed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            Feedback Moderation Queue
          </h2>
          <p className="text-xs text-slate-500">
            Review and investigate reported peer comments to maintain academic safety and privacy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by report status"
            className="rounded-lg border border-slate-300 bg-white p-2 text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
          >
            <option value="">All Reports</option>
            <option value="pending">Pending ({pendingCount})</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Action Toast Feedback */}
      {actionFeedback && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-xl p-3 text-xs font-medium border ${
            actionFeedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-slate-500 hover:text-slate-800 p-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Reports List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            <span>Loading moderation reports...</span>
          </div>
        ) : isError ? (
          <div className="p-16 text-center text-xs text-red-600">
            Error loading moderation queue:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : reports.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <ShieldAlert className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">No Reports in this Queue</p>
            <p className="text-xs text-slate-400">
              {statusFilter === 'pending'
                ? 'All reported comments have been reviewed. No pending reports require action.'
                : 'No reports match the selected status filter.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((report) => (
              <div key={report.id} className="p-5 space-y-3 hover:bg-slate-50/50 transition-colors">
                {/* Meta Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getStatusBadge(report.status)}
                    {getReasonBadge(report.reason)}
                    <span className="text-xs font-bold text-slate-800">
                      Round: {report.roundTitle}
                    </span>
                    <span className="text-xs text-slate-400">&bull;</span>
                    <span className="text-xs text-slate-600 font-medium">
                      Question: {report.questionTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Quoted Reported Comment */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-500">Reported Comment Content:</span>
                    {report.isCommentHidden && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100/80 px-2 py-0.5 rounded">
                        <EyeOff className="h-3 w-3" />
                        Comment Hidden from Student
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-800 italic border-l-2 border-red-500 pl-2.5">
                    "{report.reportedComment}"
                  </p>
                </div>

                {/* Reporter and Explanation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold">Reported by:</span>
                      <span>{report.reporterName}</span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        ({report.reporterEmail})
                      </span>
                    </div>
                    {report.explanation && (
                      <p className="text-slate-600 text-[11px]">
                        <span className="font-semibold text-slate-700">Student Explanation:</span> "
                        {report.explanation}"
                      </p>
                    )}
                    {report.moderationNotes && (
                      <p className="text-purple-700 text-[11px] font-medium pt-1">
                        <span className="font-semibold">Moderator Note:</span> "
                        {report.moderationNotes}" (by {report.moderatedBy || 'Admin'})
                      </p>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {report.isCommentHidden ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenActionModal(report, ModerationResolutionAction.RESTORE_COMMENT)
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                        <span>Restore Comment</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenActionModal(report, ModerationResolutionAction.HIDE_COMMENT)
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors shadow-xs"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        <span>Hide Comment</span>
                      </button>
                    )}

                    {report.status === ReportStatus.PENDING && (
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenActionModal(report, ModerationResolutionAction.DISMISS)
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors shadow-xs"
                      >
                        <XCircle className="h-3.5 w-3.5 text-slate-400" />
                        <span>Dismiss</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between text-xs text-slate-500">
            <div>
              Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalPages}</span> ({data?.total}{' '}
              total reports)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Moderation Resolution Modal */}
      {selectedReport && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    selectedReport.action === ModerationResolutionAction.HIDE_COMMENT
                      ? 'bg-red-100 text-red-700'
                      : selectedReport.action === ModerationResolutionAction.RESTORE_COMMENT
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {selectedReport.action === ModerationResolutionAction.HIDE_COMMENT ? (
                    <EyeOff className="h-4 w-4" />
                  ) : selectedReport.action === ModerationResolutionAction.RESTORE_COMMENT ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedReport.action === ModerationResolutionAction.HIDE_COMMENT
                      ? 'Hide Inappropriate Comment'
                      : selectedReport.action === ModerationResolutionAction.RESTORE_COMMENT
                        ? 'Restore Feedback Comment'
                        : 'Dismiss Moderation Report'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Action requires an institutional resolution note for the audit log.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded p-1 text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Target Content</span>
              <p className="italic border-l-2 border-slate-400 pl-2">
                "{selectedReport.report.reportedComment}"
              </p>
            </div>

            <form onSubmit={handleConfirmAction} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="resolution-note"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Resolution Note <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="resolution-note"
                  rows={3}
                  required
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="State the administrative finding and rationale for this action..."
                  maxLength={1000}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  disabled={resolveMutation.isPending}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveMutation.isPending || resolutionNote.trim().length < 2}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs disabled:opacity-50 ${
                    selectedReport.action === ModerationResolutionAction.HIDE_COMMENT
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {resolveMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Confirm Action</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
