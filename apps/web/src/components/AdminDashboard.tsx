import React, { useState } from 'react';
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Users,
  Search,
  Check,
  X,
  Ban,
  RotateCcw,
  Calendar,
  FileText,
  Activity,
  Flag,
  Trash2,
} from 'lucide-react';
import { UserRole, UserStatus, ReportStatus, type UserResponse } from '@peerspace/shared';
import { useAdmin } from '../hooks/useAdmin';
import { useModerationReports } from '../hooks/useModeration';
import { FeedbackRoundManager } from './FeedbackRoundManager';
import { QuestionnaireBuilder } from './QuestionnaireBuilder';
import { AdminAuditLogs } from './AdminAuditLogs';
import { AdminModerationQueue } from './AdminModerationQueue';

interface AdminDashboardProps {
  user: UserResponse;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<
    'pending' | 'rounds' | 'questionnaires' | 'roster' | 'audit' | 'moderation'
  >('pending');
  const [rosterStatusFilter, setRosterStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Modals state
  const [rejectingStudent, setRejectingStudent] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const [suspendingUser, setSuspendingUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [suspendReason, setSuspendReason] = useState<string>('');

  const [deletingUser, setDeletingUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  const {
    pendingQuery,
    allMembersQuery,
    approveMutation,
    rejectMutation,
    suspendMutation,
    reactivateMutation,
    permanentlyDeleteMutation,
    invalidateAdminQueries,
  } = useAdmin(rosterStatusFilter || undefined);

  const { data: pendingReportsData } = useModerationReports(1, 1, ReportStatus.PENDING, {
    enabled: user.role === UserRole.ADMIN,
  });
  const pendingReportsCount = pendingReportsData?.total ?? 0;

  // Security guard: verify role
  if (user.role !== UserRole.ADMIN) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-red-200 text-center shadow-lg">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-600 mt-2">
            The administrator membership management console requires verified system administrator
            privileges.
          </p>
        </div>
      </div>
    );
  }

  const pendingStudents = pendingQuery.data?.students ?? [];
  const allMembers = allMembersQuery.data?.members ?? [];

  const filteredMembers = allMembers.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const handleApprove = async (id: string, name: string) => {
    setFeedback(null);
    try {
      await approveMutation.mutateAsync(id);
      setFeedback({
        type: 'success',
        message: `Successfully approved student membership for "${name}".`,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to approve student membership.';
      setFeedback({ type: 'error', message: errorMsg });
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingStudent) return;
    setFeedback(null);
    try {
      await rejectMutation.mutateAsync({
        id: rejectingStudent.id,
        reason: rejectReason.trim() || undefined,
      });
      setFeedback({
        type: 'success',
        message: `Student registration for "${rejectingStudent.name}" declined.`,
      });
      setRejectingStudent(null);
      setRejectReason('');
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to decline student registration.';
      setFeedback({ type: 'error', message: errorMsg });
    }
  };

  const handleConfirmSuspend = async () => {
    if (!suspendingUser) return;
    setFeedback(null);
    try {
      await suspendMutation.mutateAsync({
        id: suspendingUser.id,
        reason: suspendReason.trim() || undefined,
      });
      setFeedback({
        type: 'success',
        message: `Account for "${suspendingUser.name}" suspended.`,
      });
      setSuspendingUser(null);
      setSuspendReason('');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to suspend account.';
      setFeedback({ type: 'error', message: errorMsg });
    }
  };

  const handleReactivate = async (id: string, name: string) => {
    setFeedback(null);
    try {
      await reactivateMutation.mutateAsync(id);
      setFeedback({
        type: 'success',
        message: `Account for "${name}" reactivated successfully.`,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to reactivate account.';
      setFeedback({ type: 'error', message: errorMsg });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setFeedback(null);
    try {
      await permanentlyDeleteMutation.mutateAsync(deletingUser.id);
      setFeedback({
        type: 'success',
        message: `Account for "${deletingUser.name}" permanently deleted.`,
      });
      setDeletingUser(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to permanently delete account.';
      setFeedback({ type: 'error', message: errorMsg });
    }
  };

  const isRefreshing = pendingQuery.isFetching || allMembersQuery.isFetching;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 py-6 px-4 sm:px-6">
      {/* Top Admin Heading */}
      <div className="bg-white dark:bg-darkSurface-card rounded-2xl border border-lavender-200/80 dark:border-darkSurface-border p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/40 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <Shield className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              Administrator Console
            </span>
            <span className="text-xs text-slate-500 dark:text-darkSurface-muted font-medium">
              <span>{user.name}</span> ({user.email})
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-lavender-100 tracking-tight">
            Institutional Membership & Access Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-darkSurface-muted">
            Review pending student applicants, authorize workspace memberships, and manage user
            states.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => invalidateAdminQueries()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-lavender-200 dark:border-darkSurface-border bg-lavender-50/50 dark:bg-darkSurface-bg hover:bg-lavender-100 dark:hover:bg-darkSurface-cardHover text-xs font-semibold text-slate-700 dark:text-lavender-200 transition-colors disabled:opacity-50"
            aria-label="Refresh roster data"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-lavender-500' : ''}`}
            />
            <span>Sync Roster</span>
          </button>
        </div>
      </div>

      {/* Metric Cards - Tactile macOS Spatial Pastel Surfaces */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Card (Peach) */}
        <div
          onClick={() => setActiveTab('pending')}
          className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-xs ${
            activeTab === 'pending'
              ? 'bg-[#FDF2EC] dark:bg-amber-950/40 border-[#F47B55] ring-2 ring-[#F47B55]/20'
              : 'bg-[#FDF2EC]/70 dark:bg-amber-950/20 border-[#F47B55]/25 hover:border-[#F47B55]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F47B55]">
              Pending Approvals
            </span>
            <div className="h-8 w-8 rounded-lg bg-white/80 dark:bg-amber-900/40 border border-[#F47B55]/20 flex items-center justify-center text-[#F47B55]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#1C1B18] dark:text-[#F5F2EB] tracking-tight">
              {pendingStudents.length}
            </span>
            <span className="text-xs text-[#5C5952] dark:text-[#B5B0A4]">awaiting review</span>
          </div>
        </div>

        {/* Total Members Card (Sky) */}
        <div
          onClick={() => {
            setActiveTab('roster');
            setRosterStatusFilter('');
          }}
          className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-xs ${
            activeTab === 'roster' && !rosterStatusFilter
              ? 'bg-[#EDF5FD] dark:bg-sky-950/40 border-[#5B9CF6] ring-2 ring-[#5B9CF6]/20'
              : 'bg-[#EDF5FD]/70 dark:bg-sky-950/20 border-[#5B9CF6]/25 hover:border-[#5B9CF6]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5B9CF6]">
              Total Roster Accounts
            </span>
            <div className="h-8 w-8 rounded-lg bg-white/80 dark:bg-sky-900/40 border border-[#5B9CF6]/20 flex items-center justify-center text-[#5B9CF6]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#1C1B18] dark:text-[#F5F2EB] tracking-tight">
              {allMembers.length}
            </span>
            <span className="text-xs text-[#5C5952] dark:text-[#B5B0A4]">registered users</span>
          </div>
        </div>

        {/* Active Members Card (Mint) */}
        <div
          onClick={() => {
            setActiveTab('roster');
            setRosterStatusFilter('active');
          }}
          className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-xs ${
            activeTab === 'roster' && rosterStatusFilter === 'active'
              ? 'bg-[#EEF9F2] dark:bg-emerald-950/40 border-[#34A866] ring-2 ring-[#34A866]/20'
              : 'bg-[#EEF9F2]/70 dark:bg-emerald-950/20 border-[#34A866]/25 hover:border-[#34A866]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#34A866]">
              Active Members
            </span>
            <div className="h-8 w-8 rounded-lg bg-white/80 dark:bg-emerald-900/40 border border-[#34A866]/20 flex items-center justify-center text-[#34A866]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#1C1B18] dark:text-[#F5F2EB] tracking-tight">
              {allMembers.filter((m) => m.status === UserStatus.ACTIVE).length}
            </span>
            <span className="text-xs text-[#5C5952] dark:text-[#B5B0A4]">
              cleared for evaluation
            </span>
          </div>
        </div>

        {/* Moderation Queue Card (Lavender) */}
        <div
          onClick={() => setActiveTab('moderation')}
          className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-xs ${
            activeTab === 'moderation'
              ? 'bg-[#F2F0FC] dark:bg-purple-950/40 border-[#6C5CE7] ring-2 ring-[#6C5CE7]/20'
              : 'bg-[#F2F0FC]/70 dark:bg-purple-950/20 border-[#6C5CE7]/25 hover:border-[#6C5CE7]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6C5CE7]">
              Moderation Queue
            </span>
            <div className="h-8 w-8 rounded-lg bg-white/80 dark:bg-purple-900/40 border border-[#6C5CE7]/20 flex items-center justify-center text-[#6C5CE7]">
              <Flag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#1C1B18] dark:text-[#F5F2EB] tracking-tight">
              {pendingReportsCount}
            </span>
            <span className="text-xs text-[#5C5952] dark:text-[#B5B0A4]">flagged comments</span>
          </div>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          role="alert"
          className={`flex items-center justify-between rounded-xl p-4 text-xs font-medium border ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="rounded p-1 hover:bg-black/5"
            aria-label="Dismiss feedback"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="bg-white dark:bg-darkSurface-card rounded-xl border border-slate-200/80 dark:border-darkSurface-border px-4 pt-1 shadow-sm overflow-x-auto">
        <nav className="flex space-x-6 text-sm font-semibold min-w-max border-b border-slate-100 dark:border-darkSurface-border/60">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`pb-3 px-1 border-b-2 -mb-[1px] flex items-center gap-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-400 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <span>Pending Approvals</span>
            {pendingStudents.length > 0 && (
              <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 text-xs font-bold">
                {pendingStudents.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rounds')}
            className={`pb-3 px-1 border-b-2 -mb-[1px] flex items-center gap-2 transition-colors ${
              activeTab === 'rounds'
                ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-400 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Feedback Rounds</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('questionnaires')}
            className={`pb-3 px-1 border-b-2 -mb-[1px] flex items-center gap-2 transition-colors ${
              activeTab === 'questionnaires'
                ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-400 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Questionnaires & Rubrics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`pb-3 px-1 border-b-2 -mb-[1px] flex items-center gap-2 transition-colors ${
              activeTab === 'roster'
                ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-400 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <span>Institutional Account Roster</span>
            <span className="rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 text-xs">
              {allMembers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`pb-3 px-1 border-b-2 -mb-[1px] flex items-center gap-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-400 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Audit Logs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('moderation')}
            className={`pb-3 px-1 border-b-2 -mb-[1px] flex items-center gap-2 transition-colors ${
              activeTab === 'moderation'
                ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-400 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <Flag className="h-4 w-4" />
            <span>Moderation Queue</span>
            {pendingReportsCount > 0 && (
              <span className="rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 text-xs font-bold">
                {pendingReportsCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab 1: Pending Approvals Content */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pending Student Registrations ({pendingStudents.length})
              </h2>
              <p className="text-xs text-slate-500">
                Students who registered and are awaiting institutional course verification.
              </p>
            </div>
          </div>

          {pendingQuery.isLoading ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
              Loading pending student registrations...
            </div>
          ) : pendingStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">
                Zero Pending Student Registrations
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All registered student accounts have been processed. New registrations will appear
                here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E4E0D8] dark:border-[#33302B] bg-[#F5F2EB]/75 dark:bg-[#1C1A17]/75 text-[11px] font-bold uppercase tracking-wider text-[#6E6A61] dark:text-[#8E8A80]">
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">University Email</th>
                    <th className="py-3 px-4">Email Status</th>
                    <th className="py-3 px-4">Registration Date</th>
                    <th className="py-3 px-4">Membership</th>
                    <th className="py-3 px-4 text-right">Verification Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E0D8]/60 dark:divide-[#33302B]/60 text-xs">
                  {pendingStudents.map((student) => {
                    const isProcessing = approveMutation.isPending || rejectMutation.isPending;
                    const isEmailVerified = student.isEmailVerified !== false;

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-[#F5F2EB]/50 dark:hover:bg-[#1C1A17]/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-[#1C1B18] dark:text-[#F5F2EB]">
                          {student.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#5C5952] dark:text-[#B5B0A4]">
                          {student.email}
                        </td>
                        <td className="py-3 px-4">
                          {isEmailVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF9F2] dark:bg-emerald-950/40 border border-[#34A866]/30 px-2.5 py-0.5 text-[11px] font-semibold text-[#34A866] dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Email Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF2EC] dark:bg-amber-950/40 border border-[#F47B55]/30 px-2.5 py-0.5 text-[11px] font-semibold text-[#F47B55] dark:text-amber-400">
                              <Clock className="h-3 w-3" />
                              Unverified
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#6E6A61] dark:text-[#8E8A80]">
                          {new Date(student.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF2EC] dark:bg-amber-950/40 border border-[#F47B55]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#F47B55] capitalize">
                            <Clock className="h-3 w-3" />
                            {student.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Approve Action */}
                            <button
                              type="button"
                              onClick={() => handleApprove(student.id, student.name)}
                              disabled={isProcessing || !isEmailVerified}
                              title={
                                !isEmailVerified
                                  ? 'Cannot approve student account because their email address has not been verified.'
                                  : `Approve ${student.name}`
                              }
                              className="inline-flex items-center gap-1 rounded-xl bg-[#34A866] hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                              aria-label={`Approve ${student.name}`}
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </button>

                            {/* Reject Action */}
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingStudent(student);
                                setRejectReason('');
                              }}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors disabled:opacity-50"
                              aria-label={`Decline ${student.name}`}
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Decline</span>
                            </button>
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
      )}

      {/* Tab 2: Feedback Rounds Content */}
      {activeTab === 'rounds' && <FeedbackRoundManager />}

      {/* Tab 3: Questionnaire Builder Content */}
      {activeTab === 'questionnaires' && <QuestionnaireBuilder />}

      {/* Tab 4: Institutional Account Roster Content */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Institutional Account Directory
              </h2>
              <p className="text-xs text-slate-500">
                Comprehensive roster of all registered members across roles and clearance states.
              </p>
            </div>

            {/* Filter and Search Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or email..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 w-44 sm:w-56"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                {['', 'active', 'pending', 'suspended', 'rejected'].map((st) => (
                  <button
                    key={st || 'all'}
                    type="button"
                    onClick={() => setRosterStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                      rosterStatusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st || 'All'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {allMembersQuery.isLoading ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
              Loading roster directory...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No accounts match the current filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">University Email</th>
                    <th className="py-3 px-4">Institutional Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Enrolled Date</th>
                    <th className="py-3 px-4 text-right">Account Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredMembers.map((member) => {
                    const isSelf = member.id === user.id;

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {member.name}
                            {isSelf && (
                              <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[10px] text-slate-700 font-normal">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{member.email}</td>
                        <td className="py-3 px-4">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 capitalize">
                            {member.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
                              member.status === UserStatus.ACTIVE
                                ? 'bg-emerald-100 text-emerald-800'
                                : member.status === UserStatus.PENDING
                                  ? 'bg-amber-100 text-amber-800'
                                  : member.status === UserStatus.SUSPENDED
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(member.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {member.status === UserStatus.ACTIVE && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSuspendingUser(member);
                                  setSuspendReason('');
                                }}
                                disabled={isSelf}
                                title={isSelf ? 'Cannot suspend your own account' : undefined}
                                aria-label={`Suspend ${member.name}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Ban className="h-3 w-3" />
                                <span>Suspend</span>
                              </button>
                            )}

                            {member.status === UserStatus.SUSPENDED && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleReactivate(member.id, member.name)}
                                  aria-label={`Reactivate ${member.name}`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Reactivate</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingUser(member)}
                                  disabled={isSelf}
                                  aria-label={`Permanently delete ${member.name}`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-40"
                                  title="Permanently delete suspended member"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}

                            {member.status === UserStatus.PENDING && (
                              <button
                                type="button"
                                onClick={() => handleApprove(member.id, member.name)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                              >
                                <Check className="h-3 w-3" />
                                <span>Approve</span>
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
      )}

      {/* Tab 5: Administrator Audit Logs */}
      {activeTab === 'audit' && <AdminAuditLogs />}

      {/* Tab 6: Feedback Moderation Queue */}
      {activeTab === 'moderation' && <AdminModerationQueue />}

      {/* Reject Confirmation Modal */}
      {rejectingStudent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 id="reject-dialog-title" className="text-base font-bold text-slate-900">
                  Decline Registration
                </h3>
                <p className="text-xs text-slate-500">
                  Target applicant: <span className="font-semibold">{rejectingStudent.name}</span>
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reject-reason" className="block text-xs font-semibold text-slate-700">
                Reason for declining (Optional):
              </label>
              <textarea
                id="reject-reason"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Not enrolled on official course roster for the current semester."
                className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingStudent(null)}
                className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejectMutation.isPending}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Declining...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendingUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="suspend-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <h3 id="suspend-dialog-title" className="text-base font-bold text-slate-900">
                  Suspend User Account
                </h3>
                <p className="text-xs text-slate-500">
                  Target user: <span className="font-semibold">{suspendingUser.name}</span> (
                  {suspendingUser.email})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Suspending this account immediately revokes all access to peer reviews, feedback
              modules, and platform capabilities.
            </p>

            <div className="space-y-1.5">
              <label
                htmlFor="suspend-reason"
                className="block text-xs font-semibold text-slate-700"
              >
                Suspension Reason (Optional):
              </label>
              <textarea
                id="suspend-reason"
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Academic integrity violation or course withdrawal."
                className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSuspendingUser(null)}
                className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={suspendMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {suspendMutation.isPending ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Deletion Confirmation Modal */}
      {deletingUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-darkSurface-card p-6 shadow-2xl border border-rose-200 dark:border-rose-900/40 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3
                  id="delete-dialog-title"
                  className="text-base font-bold text-slate-900 dark:text-lavender-100"
                >
                  Permanently Delete Account
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  Warning: Consequential & Irreversible Action
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-darkSurface-muted leading-relaxed">
              Are you sure you want to permanently delete the suspended account for{' '}
              <strong className="text-slate-900 dark:text-lavender-100">{deletingUser.name}</strong>{' '}
              (<span className="font-mono">{deletingUser.email}</span>)?
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-900 dark:text-amber-300 space-y-1">
              <p className="font-semibold">Security & Data Retention Safeguards:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800 dark:text-amber-400">
                <li>Active sessions will be immediately revoked.</li>
                <li>Submitted evaluations and peer feedback ratings are preserved.</li>
                <li>An immutable audit log event (USER_DELETED) will be recorded.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-darkSurface-border">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-darkSurface-border text-xs font-semibold text-slate-600 dark:text-lavender-200 hover:bg-slate-50 dark:hover:bg-darkSurface-cardHover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={permanentlyDeleteMutation.isPending}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {permanentlyDeleteMutation.isPending ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
