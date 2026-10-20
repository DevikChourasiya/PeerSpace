import React from 'react';
import { Clock, ShieldAlert, LogOut, RefreshCw, CheckCircle, Mail, User } from 'lucide-react';
import type { UserResponse } from '@peerspace/shared';
import { useAuth } from '../hooks/useAuth';

interface PendingApprovalProps {
  user: UserResponse;
}

export const PendingApproval: React.FC<PendingApprovalProps> = ({ user }) => {
  const { logoutMutation, refetchUser, isFetching } = useAuth();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 lg:p-12">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/10">
        {/* Navy Header with Amber Status Accent */}
        <div className="bg-slate-900 p-6 sm:p-8 text-white relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                Membership Status: Pending Verification
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
                Awaiting Instructor or Admin Approval
              </h1>
            </div>
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 bg-white">
          {/* Informational Card */}
          <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-950">Enrollment Verification in Progress</p>
              <p className="text-xs leading-relaxed text-amber-900/90">
                Welcome to PeerSpace, <span className="font-semibold">{user.name}</span>. Your
                student account has been registered successfully. In accordance with university peer
                evaluation policies, an authorized instructor or system administrator must verify
                your course enrollment before evaluation rounds, rubrics, and feedback submissions
                become accessible.
              </p>
            </div>
          </div>

          {/* Account Details Summary */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Registered Profile Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2.5 text-slate-700">
                <User className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-900">{user.name}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-mono text-xs text-slate-900 truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="font-medium text-slate-500">Assigned Role:</span>
                <span className="rounded bg-blue-100 px-2 py-0.5 font-semibold text-blue-800 capitalize">
                  {user.role}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="font-medium text-slate-500">Account ID:</span>
                <span className="font-mono text-[11px] text-slate-500">{user.id}</span>
              </div>
            </div>
          </div>

          {/* Next Steps Checklist */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-900">What happens next?</h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                <span>
                  Your instructor will review your registration against the course roster.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                <span>
                  Once approved, you will immediately gain access to assigned evaluation groups and
                  rubrics.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                <span>
                  You can click “Check Approval Status” below anytime to refresh your status.
                </span>
              </li>
            </ul>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              Pending approval accounts cannot submit or view peer reviews.
            </p>
            <button
              type="button"
              onClick={() => refetchUser()}
              disabled={isFetching}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-60 transition-colors shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Checking Status...' : 'Check Approval Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
