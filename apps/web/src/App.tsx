import React, { useState } from 'react';
import { Layers, X } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { AuthPage } from './components/AuthPage';
import { VerifyEmailPage } from './components/VerifyEmailPage';
import { PendingApproval } from './components/PendingApproval';
import { ActivePortal } from './components/ActivePortal';
import { SuspendedNotice } from './components/SuspendedNotice';
import { RejectedNotice } from './components/RejectedNotice';
import { AdminDashboard } from './components/AdminDashboard';
import { HealthMonitor } from './components/HealthMonitor';
import { GlobalNavbar } from './components/GlobalNavbar';
import { ThemeProvider } from './context/ThemeContext';
import { UserRole, UserStatus } from '@peerspace/shared';

const AppContent: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(() => {
    if (typeof window === 'undefined') return false;
    const url = new URL(window.location.href);
    return url.searchParams.has('token') || window.location.pathname.includes('/verify-email');
  });

  return (
    <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181715] text-[#1C1B18] dark:text-[#F5F2EB] flex flex-col font-sans transition-colors selection:bg-[#5B9CF6] selection:text-white">
      {/* Consolidated Global Navbar */}
      <GlobalNavbar onOpenHealth={() => setShowHealthModal(true)} />

      {/* Main Content View Controller */}
      <main className="flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-[#5C5952] dark:text-[#B5B0A4]">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#5B9CF6] to-[#6C5CE7] text-white flex items-center justify-center animate-pulse mb-3 shadow-md shadow-[#5B9CF6]/20">
              <Layers className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-[#1C1B18] dark:text-[#F5F2EB]">
              Verifying session...
            </p>
            <p className="text-xs text-[#6E6A61] dark:text-[#8E8A80] mt-1">
              Connecting to institutional auth server
            </p>
          </div>
        ) : isVerifyingEmail ? (
          <VerifyEmailPage
            onBackToLogin={() => {
              if (typeof window !== 'undefined') {
                window.history.replaceState({}, '', '/');
              }
              setIsVerifyingEmail(false);
            }}
          />
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

      {/* Modern, De-cluttered Tactile Footer */}
      <footer className="border-t border-[#E4E0D8] dark:border-[#33302B] bg-[#FCFBF9]/80 dark:bg-[#1C1A17]/80 py-4 text-center text-xs text-[#6E6A61] dark:text-[#8E8A80] backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-[#1C1B18] dark:text-[#F5F2EB]">
            PeerSpace — Student Feedback Management System
          </span>
          <span className="text-[11px] text-[#6E6A61] dark:text-[#8E8A80]">
            Empowering peer evaluations and collaborative growth
          </span>
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
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-darkSurface-card shadow-2xl border border-lavender-200 dark:border-darkSurface-border p-2">
            <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-lavender-100 dark:border-darkSurface-border">
              <h2
                id="system-health-modal-title"
                className="text-sm font-bold text-slate-900 dark:text-lavender-100 uppercase tracking-wider"
              >
                PeerSpace Diagnostics Monitor
              </h2>
              <button
                type="button"
                onClick={() => setShowHealthModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-lavender-100 dark:hover:bg-darkSurface-cardHover hover:text-slate-900 dark:hover:text-white transition-colors"
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

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
