import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  RefreshCw,
  Server,
  XCircle,
} from 'lucide-react';
import type { HealthResponse } from '@peerspace/shared';

const fetchHealth = async (): Promise<HealthResponse> => {
  const response = await fetch('/api/health');
  if (!response.ok && response.status !== 503) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

export const HealthMonitor: React.FC = () => {
  const { data, error, isLoading, isFetching, refetch } = useQuery<HealthResponse>({
    queryKey: ['system-health'],
    queryFn: fetchHealth,
    refetchInterval: 15000, // poll every 15s
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ok':
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Connected / Healthy
          </span>
        );
      case 'degraded':
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Degraded / Connecting
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            Disconnected / Error
          </span>
        );
    }
  };

  const formatUptime = (seconds?: number) => {
    if (seconds === undefined) return '--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl bg-slate-900/80 border border-slate-800 p-6 md:p-8 backdrop-blur-md shadow-2xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-sky-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">
              System Diagnostics & Health
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time validation of backend connectivity, database status, and operational metrics.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors disabled:opacity-50"
          aria-label="Refresh health metrics"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-sky-400' : ''}`} />
          {isFetching ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mb-3" />
          <p className="text-sm">Connecting to backend health endpoint...</p>
        </div>
      ) : error ? (
        <div className="mt-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-sm flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to connect to API service</p>
            <p className="text-rose-300/80 mt-1">
              {error instanceof Error ? error.message : 'Unknown communication error'}
            </p>
            <p className="text-xs text-rose-400 mt-2">
              Ensure the backend is running on port 5001 (`npm run dev:api`).
            </p>
          </div>
        </div>
      ) : data ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Database Card */}
          <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 font-medium text-sm">
                <Database className="w-4 h-4 text-emerald-400" />
                MongoDB Community Server
              </div>
              {getStatusBadge(data.database.status)}
            </div>
            <div className="text-xs text-slate-400 space-y-1.5 pt-1">
              <div className="flex justify-between">
                <span>Database Name:</span>
                <span className="font-mono text-slate-200">
                  {data.database.name || 'peerspace_feedback'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Host:</span>
                <span className="font-mono text-slate-200">
                  {data.database.host || '127.0.0.1:27017'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Latency:</span>
                <span className="font-mono text-emerald-300">
                  {data.database.latencyMs !== null ? `${data.database.latencyMs} ms` : 'N/A'}
                </span>
              </div>
              {data.database.error && (
                <div className="mt-2 text-rose-400 text-xs bg-rose-950/30 p-2 rounded border border-rose-900/50">
                  {data.database.error}
                </div>
              )}
            </div>
          </div>

          {/* Backend API Card */}
          <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 font-medium text-sm">
                <Server className="w-4 h-4 text-sky-400" />
                Express API Server
              </div>
              {getStatusBadge(data.status)}
            </div>
            <div className="text-xs text-slate-400 space-y-1.5 pt-1">
              <div className="flex justify-between">
                <span>Service Version:</span>
                <span className="font-mono text-slate-200">{data.version}</span>
              </div>
              <div className="flex justify-between">
                <span>Environment:</span>
                <span className="font-mono text-slate-200 capitalize">{data.environment}</span>
              </div>
              <div className="flex justify-between">
                <span>Timestamp:</span>
                <span className="font-mono text-slate-300 text-[11px]">
                  {new Date(data.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Uptime Card */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-950/50 border border-sky-800/30 text-sky-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Server Uptime</p>
                <p className="text-sm font-semibold text-slate-200">{formatUptime(data.uptime)}</p>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-500">{data.uptime}s total</span>
          </div>

          {/* Memory Card */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-950/50 border border-indigo-800/30 text-indigo-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Memory Allocation</p>
                <p className="text-sm font-semibold text-slate-200">
                  {data.memory.heapUsedMb} MB used / {data.memory.heapTotalMb} MB total
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-500">RSS {data.memory.rssMb}MB</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
