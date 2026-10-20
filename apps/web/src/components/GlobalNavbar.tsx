import React, { useState, useRef, useEffect } from 'react';
import { Layers, Activity, Sun, Moon, ChevronDown, LogOut, Copy, Check } from 'lucide-react';
import { UserRole, UserStatus } from '@peerspace/shared';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';

interface GlobalNavbarProps {
  onOpenHealth: () => void;
}

export const GlobalNavbar: React.FC<GlobalNavbarProps> = ({ onOpenHealth }) => {
  const { user, isAuthenticated, logoutMutation } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll system health for truthful operational indicator
  const { data: healthData } = useQuery({
    queryKey: ['navbar-system-health'],
    queryFn: async () => {
      const res = await fetch('/api/health');
      if (!res.ok) return { status: 'degraded' };
      return res.json();
    },
    refetchInterval: 30000,
  });

  const isHealthy = healthData?.status === 'ok' || healthData?.database?.status === 'connected';

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const formatShortId = (id?: string) => {
    if (!id || id.length <= 8) return id || '';
    return `${id.slice(0, 4)}…${id.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-darkSurface-border bg-white/95 dark:bg-darkSurface-bg/95 backdrop-blur-md transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-lavender-500 to-sky-400 text-white flex items-center justify-center shadow-md shadow-lavender-500/25">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-lavender-100 block leading-tight">
              PeerSpace
            </span>
            <span className="text-[11px] text-slate-500 dark:text-darkSurface-muted font-medium block">
              Student Feedback Management System
            </span>
          </div>
        </div>

        {/* Center / Right Header Navigation Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Truthful System Health Indicator */}
          <button
            type="button"
            onClick={onOpenHealth}
            className="inline-flex items-center gap-1.5 rounded-xl border border-lavender-200 dark:border-darkSurface-border bg-lavender-50/60 dark:bg-darkSurface-card px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-lavender-200 hover:bg-lavender-100/70 dark:hover:bg-darkSurface-cardHover transition-colors focus:outline-none focus:ring-2 focus:ring-lavender-500"
            aria-label="View system health diagnostics"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isHealthy ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-amber-500'
              }`}
            />
            <Activity className="h-3.5 w-3.5 text-lavender-600 dark:text-sky-400" />
            <span className="hidden md:inline">{isHealthy ? 'Operational' : 'System Status'}</span>
          </button>

          {/* Theme Toggle (Light / Dark) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-lavender-200 dark:border-darkSurface-border bg-lavender-50/60 dark:bg-darkSurface-card text-slate-700 dark:text-lavender-200 hover:bg-lavender-100/70 dark:hover:bg-darkSurface-cardHover transition-colors focus:outline-none focus:ring-2 focus:ring-lavender-500"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-300" />
            ) : (
              <Moon className="h-4 w-4 text-lavender-600" />
            )}
          </button>

          {/* Consolidated Profile Dropdown */}
          {isAuthenticated && user && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border border-lavender-200 dark:border-darkSurface-border bg-white dark:bg-darkSurface-card hover:bg-lavender-50/70 dark:hover:bg-darkSurface-cardHover transition-all focus:outline-none focus:ring-2 focus:ring-lavender-500"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label="Open user profile menu"
              >
                <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-lavender-500 to-sky-400 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {getInitials(user.name)}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-none">
                  <span className="text-xs font-bold text-slate-900 dark:text-lavender-100 max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-lavender-600 dark:text-sky-300 font-semibold capitalize mt-0.5">
                    {user.role}
                  </span>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu Modal */}
              {dropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-darkSurface-card border border-lavender-200 dark:border-darkSurface-border shadow-xl dark:shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  {/* User Identity Details */}
                  <div className="px-4 py-3 border-b border-lavender-100 dark:border-darkSurface-border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-lavender-500 to-sky-400 text-white font-bold text-sm flex items-center justify-center shadow-sm shrink-0">
                        {getInitials(user.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-slate-900 dark:text-lavender-100 truncate">
                            {user.name}
                          </p>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              user.role === UserRole.ADMIN
                                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                                : 'bg-lavender-100 dark:bg-lavender-900/40 text-lavender-700 dark:text-lavender-300'
                            }`}
                          >
                            {user.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-darkSurface-muted truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Account Status and Shortened ID */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-darkSurface-borderLight/40 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 dark:text-darkSurface-muted">
                          Status:
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold capitalize ${
                            user.status === UserStatus.ACTIVE
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : user.status === UserStatus.PENDING
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.status === UserStatus.ACTIVE
                                ? 'bg-emerald-500'
                                : user.status === UserStatus.PENDING
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                            }`}
                          />
                          {user.status}
                        </span>
                      </div>

                      {/* Shortened ID with Copy Button */}
                      <button
                        type="button"
                        onClick={handleCopyId}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-darkSurface-muted hover:text-lavender-600 dark:hover:text-lavender-300 bg-lavender-50 dark:bg-darkSurface-bg px-2 py-0.5 rounded-md border border-lavender-200/60 dark:border-darkSurface-border transition-colors"
                        title="Click to copy account ID for technical support"
                        aria-label="Copy account identifier"
                      >
                        <span>ID: {formatShortId(user.id)}</span>
                        {copied ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3 text-slate-400" />
                        )}
                      </button>
                    </div>
                    {copied && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium text-right mt-1">
                        Account ID copied to clipboard!
                      </p>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="p-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setDropdownOpen(false);
                        logoutMutation.mutate();
                      }}
                      disabled={logoutMutation.isPending}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
