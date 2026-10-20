import React from 'react';
import { ShieldX, LogOut } from 'lucide-react';
import type { UserResponse } from '@peerspace/shared';
import { useAuth } from '../hooks/useAuth';

interface SuspendedNoticeProps {
  user: UserResponse;
}

export const SuspendedNotice: React.FC<SuspendedNoticeProps> = ({ user }) => {
  const { logoutMutation } = useAuth();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 lg:p-12">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/10">
        <div className="bg-red-950 p-6 sm:p-8 text-white">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-900/50 px-3 py-1 text-xs font-semibold text-red-200">
              <ShieldX className="h-3.5 w-3.5 text-red-400" />
              Account Suspended
            </span>
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-800 bg-red-900/40 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-800/80 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Access to PeerSpace Suspended
          </h1>
        </div>

        <div className="p-6 sm:p-8 space-y-4 bg-white">
          <p className="text-sm text-slate-700 leading-relaxed">
            The account for <span className="font-semibold text-slate-900">{user.name}</span> (
            <span className="font-mono text-xs">{user.email}</span>) has been suspended by an
            administrator or course instructor.
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            If you believe this status was applied in error, please contact your university course
            instructor or department administrator.
          </div>
        </div>
      </div>
    </div>
  );
};
