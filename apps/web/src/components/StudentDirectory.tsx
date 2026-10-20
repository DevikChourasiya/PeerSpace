import React, { useState } from 'react';
import {
  Search,
  Users,
  GraduationCap,
  Mail,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Building2,
  BookOpen,
} from 'lucide-react';
import { useDirectory } from '../hooks/useDirectory';

export const StudentDirectory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const { students, total, page, totalPages, isLoading, isFetching, error, refetch } = useDirectory(
    {
      search: searchTerm,
      page: currentPage,
      limit: pageSize,
    }
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Institutional Classmate Directory
              </h2>
              <p className="text-xs text-slate-500">
                Active students enrolled and cleared for peer evaluation rounds.
              </p>
            </div>
          </div>
        </div>

        {/* Search input and Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by name, email, department..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
            />
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50"
            title="Refresh directory"
            aria-label="Refresh directory"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 text-xs bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="h-7 w-7 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="font-semibold text-slate-700">Loading classmate directory...</p>
          <p className="text-slate-400 mt-1">Verifying active institutional memberships</p>
        </div>
      ) : error ? (
        <div className="p-12 text-center bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
          <AlertCircle className="h-8 w-8 text-rose-600 mx-auto mb-2" />
          <p className="font-bold text-sm">Failed to load classmate directory</p>
          <p className="text-xs text-rose-700 mt-1">{error.message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : students.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <GraduationCap className="h-10 w-10 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">No Classmates Found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? `No active students match "${searchTerm}". Try a different keyword.`
              : 'There are currently no active classmates in this section.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-100">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 uppercase">
                    Active
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-slate-900 text-sm tracking-tight truncate">
                    {student.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 truncate flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                    <span>{student.email}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Building2 className="h-3 w-3 text-slate-400" />
                    Dept:
                  </span>
                  <span className="font-medium text-slate-800">{student.department}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <BookOpen className="h-3 w-3 text-slate-400" />
                    Section:
                  </span>
                  <span className="font-semibold text-blue-700">{student.classSection}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200 text-xs">
          <span className="text-slate-500">
            Showing Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalPages}</span> ({total} students)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
