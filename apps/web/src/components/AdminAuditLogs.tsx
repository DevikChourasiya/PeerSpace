import React, { useState } from 'react';
import { ShieldAlert, Clock, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { useAuditLogs } from '../hooks/useAuditLogs';

export const AdminAuditLogs: React.FC = () => {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const { data, isLoading, isError, error } = useAuditLogs(
    page,
    20,
    actionFilter || undefined,
    entityFilter || undefined
  );

  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const getActionBadgeClass = (action: string) => {
    if (action.includes('APPROVED') || action.includes('RESTORED')) {
      return 'bg-emerald-100 text-emerald-800';
    }
    if (action.includes('REJECTED') || action.includes('SUSPENDED')) {
      return 'bg-red-100 text-red-800';
    }
    if (action.includes('ROUND') || action.includes('QUESTIONNAIRE')) {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Administrator Audit Logs
          </h2>
          <p className="text-xs text-slate-500">
            Immutable tracking of sensitive institutional actions, membership approvals, and
            evaluation configurations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by action"
            className="rounded-lg border border-slate-300 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="MEMBERSHIP_APPROVED">Membership Approved</option>
            <option value="MEMBERSHIP_REJECTED">Membership Rejected</option>
            <option value="MEMBERSHIP_SUSPENDED">Membership Suspended</option>
            <option value="MEMBERSHIP_RESTORED">Membership Restored</option>
            <option value="ROUND_CREATED">Round Created</option>
            <option value="ROUND_STATUS_TRANSITION">Round Status Transition</option>
            <option value="QUESTIONNAIRE_PUBLISHED">Questionnaire Published</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by entity type"
            className="rounded-lg border border-slate-300 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
          >
            <option value="">All Entities</option>
            <option value="User">User</option>
            <option value="FeedbackRound">FeedbackRound</option>
            <option value="Questionnaire">Questionnaire</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-500">
            Loading audit activity records...
          </div>
        ) : isError ? (
          <div className="p-16 text-center text-xs text-red-600">
            Error loading audit logs: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <ShieldAlert className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">No Audit Events Found</p>
            <p className="text-xs text-slate-400">
              Administrative approvals, suspensions, and round state changes will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Change Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.actorEmail}</div>
                      <span className="text-[10px] text-slate-500 font-mono uppercase">
                        {log.actorRole}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getActionBadgeClass(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{log.entityType}</span>
                      <span className="text-slate-400 ml-1">({log.entityId.slice(-6)})</span>
                    </td>

                    <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs truncate">
                      {Object.keys(log.details || {}).length === 0 ? (
                        <span className="text-slate-400 italic">No extra metadata</span>
                      ) : (
                        <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                          {JSON.stringify(log.details)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <span>
              Page {page} of {totalPages} ({data?.total || 0} total events)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
