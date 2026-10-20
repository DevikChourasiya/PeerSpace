import React from 'react';
import { UserX, LogOut, Mail, User, ShieldAlert } from 'lucide-react';
import type { UserResponse } from '@peerspace/shared';
import { useAuth } from '../hooks/useAuth';

interface RejectedNoticeProps {
  user: UserResponse;
}

export const RejectedNotice: React.FC<RejectedNoticeProps> = ({ user }) => {
  const { logoutMutation } = useAuth();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 lg:p-12">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/10">
        {/* Navy Header with Rose / Red Rejection Accent */}
        <div className="bg-slate-900 p-6 sm:p-8 text-white relative">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-900/50 px-3 py-1 text-xs font-semibold text-rose-200">
              <UserX className="h-3.5 w-3.5 text-rose-400" />
              Registration Declined
            </span>
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Membership Application Declined
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Institutional verification could not be completed for this account.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-5 bg-white">
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-900 leading-relaxed">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-950">Enrollment Decision Notice</p>
              <p className="mt-1">
                Your registration application was reviewed and declined by the department
                administrator or course instructor.
              </p>
            </div>
          </div>

          {/* Account Profile Summary */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-800 font-medium">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {user.name}
              </span>
              <span className="rounded bg-rose-100 px-2 py-0.5 font-semibold text-rose-800 uppercase text-[10px]">
                {user.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-slate-600">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              {user.email}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
            <p className="font-medium text-slate-800">Need clarification or made a typo?</p>
            <p className="leading-relaxed">
              If your academic enrollment status is valid or you believe this application was
              declined by mistake, please consult your department academic coordinator or course
              instructor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
