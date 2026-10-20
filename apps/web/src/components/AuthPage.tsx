import React, { useState } from 'react';
import { Layers, ShieldCheck, Award, Users, CheckCircle2 } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export const AuthPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row items-center justify-center p-4 sm:p-6 lg:p-12">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/10 flex flex-col lg:flex-row">
        {/* Left Branding / Academic Value Column (Navy & Blue Palette with Gold Accents) */}
        <div className="relative flex flex-col justify-between bg-slate-900 p-8 sm:p-10 text-white lg:w-5/12">
          {/* Subtle Academic Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 opacity-95" />
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative z-10 space-y-6">
            {/* Academic Crest & Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white shadow-md shadow-blue-900/50">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white">PeerSpace</span>
                <span className="block text-xs font-medium text-blue-200/90">
                  Student Feedback Management System
                </span>
              </div>
            </div>

            {/* University Tagline & Mission */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                <Award className="h-3.5 w-3.5 text-amber-400" />
                Collaborative Academic Growth
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-snug">
                Empowering student progress through structured evaluation.
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                PeerSpace connects cohorts with transparent rubrics, anonymous qualitative peer
                feedback, and longitudinal competency analytics.
              </p>
            </div>

            {/* Platform Guarantees */}
            <div className="space-y-3 pt-2 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>Supervised by course instructors with strict membership verification.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  Encrypted session security with zero credentials saved to local storage.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>Protected peer anonymity during critique and rubric scoring cycles.</span>
              </div>
            </div>
          </div>

          {/* Academic Footer Tag */}
          <div className="relative z-10 pt-8 mt-8 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
              Official Institutional Portal
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-400">
              <Users className="h-3.5 w-3.5" />
              Academic Portal
            </span>
          </div>
        </div>

        {/* Right Form Card Column */}
        <div className="flex flex-col justify-center p-6 sm:p-10 lg:w-7/12 bg-white">
          {/* Tab Selector */}
          <div
            role="tablist"
            aria-label="Authentication views"
            className="mb-8 grid w-full grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-semibold"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'login'}
              aria-controls="auth-login-panel"
              id="auth-login-tab"
              onClick={() => setActiveTab('login')}
              className={`rounded-md py-2 text-center transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                activeTab === 'login'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'register'}
              aria-controls="auth-register-panel"
              id="auth-register-tab"
              onClick={() => setActiveTab('register')}
              className={`rounded-md py-2 text-center transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                activeTab === 'register'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Student Registration
            </button>
          </div>

          {/* Active Tab Panel */}
          <div
            role="tabpanel"
            id={`auth-${activeTab}-panel`}
            aria-labelledby={`auth-${activeTab}-tab`}
          >
            {activeTab === 'login' ? (
              <LoginForm onSwitchToRegister={() => setActiveTab('register')} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setActiveTab('login')} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
