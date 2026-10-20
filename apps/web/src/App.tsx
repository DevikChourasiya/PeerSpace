import React from 'react';
import { ShieldCheck, Layers, Code2, Database, Cpu, CheckCircle } from 'lucide-react';
import { HealthMonitor } from './components/HealthMonitor';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Background Decorative Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">PeerSpace</span>
              <span className="text-xs text-slate-400 block -mt-1 font-medium">
                Student Feedback Management System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Stage 2: Auth & RBAC Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/80 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Production-Minded Monorepo Architecture
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            PeerSpace — Student Feedback Management System
          </h1>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Secure authentication, role-based access control, pending membership workflows, and
            Mongoose session persistence verified across workspaces.
          </p>
        </div>

        {/* Live Diagnostics Card */}
        <section aria-labelledby="diagnostics-heading">
          <HealthMonitor />
        </section>

        {/* Architectural Pillars */}
        <section className="space-y-6 pt-4">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-xl font-bold text-white tracking-tight">
              Verified Foundation Pillars
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Core components operational in this phase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Shared Package */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                <Code2 className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-white text-base">@peerspace/shared</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Shared Zod schemas, contract definitions, and TypeScript domain types consumed
                identically by web and API.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  HealthResponseSchema & Types
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  UserRole & Status Definitions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Standard API envelope schemas
                </li>
              </ul>
            </div>

            {/* API Service */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-white text-base">@peerspace/api</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Node.js Express backend with Zod environment validation, Mongoose lifecycle
                management, and graceful teardown.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  /api/health with DB ping
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Graceful SIGINT/SIGTERM shutdown
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Helmet, CORS, Morgan middleware
                </li>
              </ul>
            </div>

            {/* Web Application */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-white text-base">@peerspace/web</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                React 18, Vite, Tailwind CSS, TanStack Query, and React Hook Form configured with
                proxy support.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  TanStack Query caching & polling
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Tailwind CSS design system
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Vitest & React Testing Library
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 bg-slate-950/80">
        <p>PeerSpace — Student Feedback Management System · Stage 2 Auth & RBAC</p>
      </footer>
    </div>
  );
};

export default App;
