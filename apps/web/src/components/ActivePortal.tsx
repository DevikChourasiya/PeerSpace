import React from 'react';
import {
  CheckCircle2,
  LogOut,
  User,
  Mail,
  Award,
  BookOpen,
  MessageSquare,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import type { UserResponse } from '@peerspace/shared';
import { useAuth } from '../hooks/useAuth';

interface ActivePortalProps {
  user: UserResponse;
}

export const ActivePortal: React.FC<ActivePortalProps> = ({ user }) => {
  const { logoutMutation } = useAuth();

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 py-8 px-4 sm:px-6">
      {/* Welcome Banner */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-900/10">
        <div className="bg-slate-900 p-6 sm:p-8 text-white relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Approved & Active Member
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-900/60 border border-blue-700/60 px-2.5 py-1 text-xs font-semibold text-blue-200 capitalize">
                  {user.role}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Welcome back, {user.name}!
              </h1>
              <p className="text-sm text-slate-300">
                You have approved institutional clearance for PeerSpace feedback rounds.
              </p>
            </div>

            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="inline-flex items-center gap-2 self-start sm:self-auto rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Member Profile Bar */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-800 font-medium">
              <User className="h-4 w-4 text-slate-400" />
              {user.name}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-slate-600">
              <Mail className="h-4 w-4 text-slate-400" />
              {user.email}
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Account Clearance ID: <span className="font-mono">{user.id}</span>
          </span>
        </div>
      </div>

      {/* Student Feedback Modules Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Evaluation & Growth Modules
            </h2>
            <p className="text-xs text-slate-500">
              Approved workspace access for peer evaluations and performance rubrics.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Feedback Rounds */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Course Feedback Cycles</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Assigned peer groups, rubric submission criteria, and evaluation schedules configured
              by your course instructor.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                Stage 4: Feedback Rounds
              </span>
            </div>
          </div>

          {/* Card 2: Anonymous Peer Reviews */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Anonymous Peer Reviews</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Constructive, anonymous qualitative feedback loops with identity protection and
              moderation filters.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                Stage 5: Anonymous Reviews
              </span>
            </div>
          </div>

          {/* Card 3: Longitudinal Growth */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Growth & Analytics</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Longitudinal tracking of competency benchmarks, scoring distributions, and
              constructive peer growth insights.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                Stage 6: Growth Analytics
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Security and Session Verification Notice */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Secure Server-Side Session Active</p>
            <p className="text-slate-500">
              Authenticated via HTTP-only session cookie backed by MongoDB. No secrets stored in
              local storage.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
          <Award className="h-3.5 w-3.5 text-amber-500" />
          Institutional Clearance
        </div>
      </div>
    </div>
  );
};
