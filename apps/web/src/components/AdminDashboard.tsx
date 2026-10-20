import React, { useState } from 'react';
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Users,
  Search,
  Check,
  X,
  Ban,
  RotateCcw,
  UserCheck,
  Calendar,
  FileText,
  Activity,
} from 'lucide-react';
import { UserRole, UserStatus, type UserResponse } from '@peerspace/shared';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import { FeedbackRoundManager } from './FeedbackRoundManager';
import { QuestionnaireBuilder } from './QuestionnaireBuilder';
import { AdminAuditLogs } from './AdminAuditLogs';

interface AdminDashboardProps {
  user: UserResponse;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const { logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'pending' | 'rounds' | 'questionnaires' | 'roster' | 'audit'
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

  const {
    pendingQuery,
    allMembersQuery,
    approveMutation,
    rejectMutation,
    suspendMutation,
    reactivateMutation,
    invalidateAdminQueries,
  } = useAdmin(rosterStatusFilter || undefined);

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

  const isRefreshing = pendingQuery.isFetching || allMembersQuery.isFetching;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 py-6 px-4 sm:px-6">
      {/* Top Admin Banner */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-900/10">
        <div className="bg-slate-900 p-6 sm:p-8 text-white relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                  <Shield className="h-3.5 w-3.5 text-amber-400" />
                  Administrator Portal
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300">
                  Stage 4 Management
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Institutional Membership & Access Control
              </h1>
              <p className="text-sm text-slate-300">
                Review pending student applicants, authorize workspace memberships, and manage user
                states.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => invalidateAdminQueries()}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
                aria-label="Refresh roster data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Sync Roster'}</span>
              </button>

              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Current Admin Identity Strip */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-800">
              Authenticated Admin: <span className="font-normal">{user.name}</span>
            </span>
            <span className="font-mono text-slate-500">{user.email}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
            <UserCheck className="h-4 w-4" />
            Full Institutional Governance Authorization
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pending Card */}
        <div
          onClick={() => setActiveTab('pending')}
          className={`cursor-pointer rounded-xl border p-5 transition-all shadow-xs ${
            activeTab === 'pending'
              ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Pending Approvals
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {pendingStudents.length}
            </span>
            <span className="text-xs text-slate-500">awaiting review</span>
          </div>
        </div>

        {/* Total Members Card */}
        <div
          onClick={() => {
            setActiveTab('roster');
            setRosterStatusFilter('');
          }}
          className={`cursor-pointer rounded-xl border p-5 transition-all shadow-xs ${
            activeTab === 'roster' && !rosterStatusFilter
              ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-400/20'
              : 'bg-white border-slate-200 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Total Roster Accounts
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {allMembers.length}
            </span>
            <span className="text-xs text-slate-500">registered users</span>
          </div>
        </div>

        {/* Active Members Card */}
        <div
          onClick={() => {
            setActiveTab('roster');
            setRosterStatusFilter('active');
          }}
          className={`cursor-pointer rounded-xl border p-5 transition-all shadow-xs ${
            activeTab === 'roster' && rosterStatusFilter === 'active'
              ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Active Members
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {allMembers.filter((m) => m.status === UserStatus.ACTIVE).length}
            </span>
            <span className="text-xs text-slate-500">cleared for evaluation</span>
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
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-amber-500 text-amber-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Pending Approvals</span>
            {pendingStudents.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 font-bold">
                {pendingStudents.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rounds')}
            className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'rounds'
                ? 'border-blue-600 text-blue-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Feedback Rounds</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('questionnaires')}
            className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'questionnaires'
                ? 'border-blue-600 text-blue-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Questionnaires & Rubrics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'roster'
                ? 'border-blue-600 text-blue-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Institutional Account Roster</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {allMembers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Audit Logs</span>
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
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">University Email</th>
                    <th className="py-3 px-4">Registration Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Verification Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {pendingStudents.map((student) => {
                    const isProcessing = approveMutation.isPending || rejectMutation.isPending;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{student.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{student.email}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(student.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 capitalize">
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
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
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
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
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
                              <button
                                type="button"
                                onClick={() => handleReactivate(member.id, member.name)}
                                aria-label={`Reactivate ${member.name}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Reactivate</span>
                              </button>
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
    </div>
  );
};
