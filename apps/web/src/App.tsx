import React, { useState } from 'react';
import { Layers, Activity, X } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { AuthPage } from './components/AuthPage';
import { PendingApproval } from './components/PendingApproval';
import { ActivePortal } from './components/ActivePortal';
import { SuspendedNotice } from './components/SuspendedNotice';
import { RejectedNotice } from './components/RejectedNotice';
import { AdminDashboard } from './components/AdminDashboard';
import { HealthMonitor } from './components/HealthMonitor';
import { UserRole, UserStatus } from '@peerspace/shared';

export const App: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [showHealthModal, setShowHealthModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Academic Navigation Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 block leading-tight">
                PeerSpace
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                Student Feedback Management System
              </span>
            </div>
          </div>

          {/* Right Header Navigation & Diagnostic Trigger */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user && (
              <div className="hidden sm:flex items-center gap-2 pr-3 border-r border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">{user.name}</span>
                {user.role === UserRole.ADMIN ? (
                  <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[11px] font-semibold text-amber-900 uppercase tracking-wider">
                    Admin
                  </span>
                ) : (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                      user.status === UserStatus.ACTIVE
                        ? 'bg-emerald-100 text-emerald-800'
                        : user.status === UserStatus.PENDING
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.status}
                  </span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowHealthModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600"
              aria-label="View system health diagnostics"
            >
              <Activity className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden md:inline">System Health</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content View Controller */}
      <main className="flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500">
            <div className="h-9 w-9 rounded-xl bg-blue-700 text-white flex items-center justify-center animate-pulse mb-3 shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-700">Verifying session...</p>
            <p className="text-xs text-slate-400 mt-1">Connecting to institutional auth server</p>
          </div>
        ) : !isAuthenticated || !user ? (
          <AuthPage />
        ) : user.status === UserStatus.PENDING ? (
          <PendingApproval user={user} />
        ) : user.status === UserStatus.SUSPENDED ? (
          <SuspendedNotice user={user} />
        ) : user.status === UserStatus.REJECTED ? (
          <RejectedNotice user={user} />
        ) : user.role === UserRole.ADMIN ? (
          <AdminDashboard user={user} />
        ) : (
          <ActivePortal user={user} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            PeerSpace — Student Feedback Management System · Stage 4 Admin & Membership Management
          </span>
          <span className="text-[11px] text-slate-400">Institutional Server Session Protected</span>
        </div>
      </footer>

      {/* System Health Diagnostics Modal */}
      {showHealthModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="system-health-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-950 shadow-2xl border border-slate-800 p-2">
            <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-slate-800">
              <h2
                id="system-health-modal-title"
                className="text-sm font-bold text-slate-200 uppercase tracking-wider"
              >
                PeerSpace Diagnostics Monitor
              </h2>
              <button
                type="button"
                onClick={() => setShowHealthModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                aria-label="Close diagnostics dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <HealthMonitor />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
