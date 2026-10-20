import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldAlert,
  LogOut,
  RefreshCw,
  CheckCircle,
  Mail,
  User,
  ShieldCheck,
  Send,
} from 'lucide-react';
import type { UserResponse } from '@peerspace/shared';
import { useAuth } from '../hooks/useAuth';
import { resendVerificationEmail } from '../api/auth';

interface PendingApprovalProps {
  user: UserResponse;
}

export const PendingApproval: React.FC<PendingApprovalProps> = ({ user }) => {
  const { logoutMutation, refetchUser, isFetching } = useAuth();
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resendStatus === 'sending') return;
    setResendStatus('sending');
    setResendMessage('');

    try {
      const res = await resendVerificationEmail(user.email);
      setResendStatus('sent');
      setResendMessage(
        res.message || 'A fresh verification link has been sent to your university email address.'
      );
      setCooldown(60);
    } catch (err: any) {
      setResendStatus('error');
      if (err.status === 429 && err.details?.retryAfterSeconds) {
        setCooldown(err.details.retryAfterSeconds);
      }
      setResendMessage(err.message || 'Unable to send verification link. Please try again later.');
    }
  };

  const isEmailVerified = Boolean(user.isEmailVerified);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 lg:p-12">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-[#FCFBF9] dark:bg-[#211F1D] border border-[#E4E0D8] dark:border-[#33302B] shadow-sm">
        {/* Tactile macOS Spatial Header */}
        <div className="bg-[#EFECE6] dark:bg-[#1C1A17] p-6 sm:p-8 border-b border-[#E4E0D8] dark:border-[#33302B] relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 dark:border-amber-700/50 bg-[#FDF2EC] dark:bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                Membership Status: Pending Verification
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#1C1B18] dark:text-[#F5F2EB]">
                Awaiting Instructor or Admin Approval
              </h1>
            </div>
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E4E0D8] dark:border-[#33302B] bg-[#FCFBF9] dark:bg-[#211F1D] px-3.5 py-2 text-xs font-semibold text-[#1C1B18] dark:text-[#F5F2EB] hover:bg-white dark:hover:bg-[#2A2824] transition-colors shadow-xs"
            >
              <LogOut className="h-3.5 w-3.5 text-[#5C5952] dark:text-[#B5B0A4]" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Email Verification Step Banner */}
          {!isEmailVerified ? (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-[#FDF2EC] dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 shrink-0 text-[#F47B55] dark:text-amber-400 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <p className="font-semibold text-amber-950 dark:text-amber-100">
                    Step 1: Verify University Email Address
                  </p>
                  <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-300/90">
                    We sent a cryptographic verification link to your university email address.
                    Please click the link in your email to confirm your identity. After
                    verification, your registration will be reviewed by an administrator.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendStatus === 'sending' || cooldown > 0}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#5B9CF6] hover:bg-[#4689E2] text-white shadow-xs disabled:opacity-50 transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {resendStatus === 'sending'
                        ? 'Sending...'
                        : cooldown > 0
                          ? `Resend in ${cooldown}s`
                          : 'Resend Verification Email'}
                    </button>
                    {resendMessage && (
                      <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                        {resendMessage}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 rounded-xl border border-[#34A866]/30 dark:border-emerald-800/40 bg-[#EEF9F2] dark:bg-emerald-950/30 p-4 text-sm text-emerald-900 dark:text-emerald-200">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[#34A866] dark:text-emerald-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                  <span>Step 1 Completed: Email Verified</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-normal">
                    Verified
                  </span>
                </p>
                <p className="text-xs leading-relaxed text-emerald-900/90 dark:text-emerald-300/90">
                  Your university email has been verified. Your account is now in the administrative
                  approval queue. An instructor or administrator will approve your enrollment before
                  evaluation rounds unlock.
                </p>
              </div>
            </div>
          )}

          {/* Enrollment Verification Context */}
          <div className="flex items-start gap-4 rounded-xl border border-[#E4E0D8] dark:border-[#33302B] bg-[#F5F2EB] dark:bg-[#1C1A17] p-4 text-sm text-[#1C1B18] dark:text-[#F5F2EB]">
            <ShieldAlert className="h-5 w-5 shrink-0 text-[#5B9CF6] mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-[#1C1B18] dark:text-[#F5F2EB]">
                Enrollment Verification in Progress
              </p>
              <p className="text-xs leading-relaxed text-[#5C5952] dark:text-[#B5B0A4]">
                Welcome to PeerSpace, <span className="font-semibold">{user.name}</span>. Your
                student account has been registered successfully. In accordance with university peer
                evaluation policies, an authorized instructor or system administrator must verify
                your course enrollment before evaluation rounds, rubrics, and feedback submissions
                become accessible.
              </p>
            </div>
          </div>

          {/* Account Details Summary */}
          <div className="rounded-xl border border-[#E4E0D8] dark:border-[#33302B] bg-[#FCFBF9] dark:bg-[#1C1A17] p-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6E6A61] dark:text-[#8E8A80]">
              Registered Profile Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2.5 text-[#1C1B18] dark:text-[#F5F2EB]">
                <User className="h-4 w-4 text-[#6E6A61] dark:text-[#8E8A80] shrink-0" />
                <span className="font-medium text-[#1C1B18] dark:text-[#F5F2EB]">{user.name}</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#1C1B18] dark:text-[#F5F2EB]">
                <Mail className="h-4 w-4 text-[#6E6A61] dark:text-[#8E8A80] shrink-0" />
                <span className="font-mono text-xs text-[#1C1B18] dark:text-[#F5F2EB] truncate">
                  {user.email}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#5C5952] dark:text-[#B5B0A4]">
                <span className="font-medium text-[#6E6A61] dark:text-[#8E8A80]">
                  Assigned Role:
                </span>
                <span className="rounded-md bg-[#EDF5FD] dark:bg-sky-950/50 border border-[#5B9CF6]/30 px-2 py-0.5 font-semibold text-[#5B9CF6] capitalize">
                  {user.role}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#5C5952] dark:text-[#B5B0A4]">
                <span className="font-medium text-[#6E6A61] dark:text-[#8E8A80]">Account ID:</span>
                <span className="font-mono text-[11px] text-[#6E6A61] dark:text-[#8E8A80]">
                  {user.id}
                </span>
              </div>
            </div>
          </div>

          {/* Next Steps Checklist */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold text-[#1C1B18] dark:text-[#F5F2EB]">
              What happens next?
            </h3>
            <ul className="space-y-2 text-xs text-[#5C5952] dark:text-[#B5B0A4]">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-[#34A866] mt-0.5" />
                <span>
                  Confirm your email address using the verification link sent to your university
                  inbox.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-[#5B9CF6] mt-0.5" />
                <span>
                  Your instructor will review your registration against the course roster.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-[#5B9CF6] mt-0.5" />
                <span>
                  Once approved, you will immediately gain access to assigned evaluation groups and
                  rubrics.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-[#5B9CF6] mt-0.5" />
                <span>
                  You can click “Check Approval Status” below anytime to refresh your status.
                </span>
              </li>
            </ul>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-[#E4E0D8] dark:border-[#33302B] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[#6E6A61] dark:text-[#8E8A80] text-center sm:text-left">
              Pending approval accounts cannot submit or view peer reviews.
            </p>
            <button
              type="button"
              onClick={() => refetchUser()}
              disabled={isFetching}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-[#5B9CF6] hover:bg-[#4689E2] px-4 py-2 text-xs font-semibold text-white shadow-xs focus:outline-hidden disabled:opacity-60 transition-colors"
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
