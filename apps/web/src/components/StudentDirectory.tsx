import React, { useState, useMemo } from 'react';
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
  Filter,
  X,
  UserCheck,
  Calendar,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { useDirectory } from '../hooks/useDirectory';
import { useAuth } from '../hooks/useAuth';
import type { StudentDirectoryItem } from '@peerspace/shared';

export const StudentDirectory: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [activeFilterPill, setActiveFilterPill] = useState<'all' | 'my-section'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingStudent, setViewingStudent] = useState<StudentDirectoryItem | null>(null);

  const pageSize = 8;

  // Determine effective section filter
  const effectiveSection = useMemo(() => {
    if (activeFilterPill === 'my-section' && currentUser?.classSection) {
      return currentUser.classSection;
    }
    return selectedSection === 'all' ? undefined : selectedSection;
  }, [activeFilterPill, selectedSection, currentUser?.classSection]);

  const { students, total, page, totalPages, isLoading, isFetching, error, refetch } = useDirectory(
    {
      search: searchTerm,
      classSection: effectiveSection,
      page: currentPage,
      limit: pageSize,
    }
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePillSelect = (pill: 'all' | 'my-section') => {
    setActiveFilterPill(pill);
    if (pill === 'all') {
      setSelectedSection('all');
    } else if (currentUser?.classSection) {
      setSelectedSection(currentUser.classSection);
    }
    setCurrentPage(1);
  };

  const handleSectionSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedSection(val);
    if (val === 'all') {
      setActiveFilterPill('all');
    } else if (currentUser?.classSection && val === currentUser.classSection) {
      setActiveFilterPill('my-section');
    } else {
      setActiveFilterPill('all');
    }
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedSection('all');
    setActiveFilterPill('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm || selectedSection !== 'all' || activeFilterPill !== 'all'
  );

  // Discover sections from loaded students or provide fallback options
  const knownSections = useMemo(() => {
    const set = new Set<string>();
    if (currentUser?.classSection) set.add(currentUser.classSection);
    students.forEach((s) => {
      if (s.classSection) set.add(s.classSection);
    });
    return Array.from(set).sort();
  }, [students, currentUser?.classSection]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white dark:bg-darkSurface-card p-5 sm:p-6 rounded-2xl border border-lavender-200/80 dark:border-darkSurface-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-lavender-500 to-sky-400 text-white flex items-center justify-center shadow-md shadow-lavender-500/20">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-lavender-100">
                  Classmate Directory
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-lavender-100 dark:bg-lavender-950/60 text-lavender-700 dark:text-lavender-300 border border-lavender-200 dark:border-lavender-800/40">
                  {total} {total === 1 ? 'Student' : 'Students'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-darkSurface-muted mt-0.5">
                Browse classmates in your course cohort and section for peer reviews.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-lavender-200 dark:border-darkSurface-border bg-lavender-50/50 dark:bg-darkSurface-bg hover:bg-lavender-100 dark:hover:bg-darkSurface-cardHover text-xs font-semibold text-slate-700 dark:text-lavender-200 transition-colors disabled:opacity-50"
            title="Refresh directory"
            aria-label="Refresh directory"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-lavender-500' : ''}`}
            />
            <span>Sync</span>
          </button>
        </div>

        {/* Search Bar & Section Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400 dark:text-darkSurface-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by name, email, department..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-lavender-200 dark:border-darkSurface-border focus:outline-none focus:ring-2 focus:ring-lavender-500 bg-lavender-50/40 dark:bg-darkSurface-bg text-slate-900 dark:text-lavender-100 placeholder:text-slate-400 dark:placeholder:text-darkSurface-muted transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-lavender-200"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Section Selector */}
          <div className="relative sm:w-48">
            <select
              value={selectedSection}
              onChange={handleSectionSelect}
              className="w-full py-2.5 px-3 text-xs rounded-xl border border-lavender-200 dark:border-darkSurface-border focus:outline-none focus:ring-2 focus:ring-lavender-500 bg-lavender-50/40 dark:bg-darkSurface-bg text-slate-900 dark:text-lavender-100 transition-colors font-medium"
              aria-label="Filter by section"
            >
              <option value="all">All Sections</option>
              {knownSections.map((sec) => (
                <option key={sec} value={sec}>
                  Section: {sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Pills & Clear Action */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-lavender-100 dark:border-darkSurface-border">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-darkSurface-muted flex items-center gap-1">
              <Filter className="h-3 w-3" /> Filters:
            </span>

            <button
              type="button"
              onClick={() => handlePillSelect('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilterPill === 'all' && selectedSection === 'all'
                  ? 'bg-lavender-500 text-white shadow-xs shadow-lavender-500/30'
                  : 'bg-lavender-100/70 dark:bg-darkSurface-bg text-slate-700 dark:text-lavender-300 hover:bg-lavender-200/80'
              }`}
            >
              All Classmates
            </button>

            {currentUser?.classSection && (
              <button
                type="button"
                onClick={() => handlePillSelect('my-section')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeFilterPill === 'my-section'
                    ? 'bg-lavender-500 text-white shadow-xs shadow-lavender-500/30'
                    : 'bg-lavender-100/70 dark:bg-darkSurface-bg text-slate-700 dark:text-lavender-300 hover:bg-lavender-200/80'
                }`}
              >
                My Section ({currentUser.classSection})
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-lavender-600 dark:text-lavender-300 hover:underline"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Directory Grid / Body */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 dark:text-darkSurface-muted text-xs bg-white dark:bg-darkSurface-card rounded-2xl border border-lavender-200/80 dark:border-darkSurface-border">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-lavender-500" />
          <p className="font-semibold text-slate-700 dark:text-lavender-200">
            Loading classmate directory...
          </p>
          <p className="text-slate-400 dark:text-darkSurface-muted mt-1">
            Verifying active institutional memberships
          </p>
        </div>
      ) : error ? (
        <div className="p-12 text-center bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-800 dark:text-rose-300">
          <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400 mx-auto mb-2" />
          <p className="font-bold text-sm">Failed to load classmate directory</p>
          <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">{error.message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : students.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-darkSurface-card rounded-2xl border border-lavender-200/80 dark:border-darkSurface-border space-y-3">
          <GraduationCap className="h-10 w-10 text-lavender-300 dark:text-darkSurface-muted mx-auto" />
          <p className="text-sm font-semibold text-slate-800 dark:text-lavender-200">
            No Classmates Found
          </p>
          <p className="text-xs text-slate-500 dark:text-darkSurface-muted max-w-sm mx-auto">
            {searchTerm
              ? `No active students match "${searchTerm}". Try a different keyword.`
              : 'There are currently no active classmates in this section.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-lavender-500 text-white text-xs font-semibold hover:bg-lavender-600 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white dark:bg-darkSurface-card rounded-2xl border border-lavender-200/80 dark:border-darkSurface-border p-5 shadow-xs hover:border-lavender-300 dark:hover:border-lavender-600 hover:shadow-soft-purple transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-lavender-500 to-sky-400 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-lavender-500/20">
                    {getInitials(student.name)}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300/40 dark:border-emerald-700/40 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                    <UserCheck className="h-2.5 w-2.5" />
                    Active
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 dark:text-lavender-100 text-sm tracking-tight truncate">
                    {student.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 dark:text-darkSurface-muted truncate flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3 shrink-0 text-lavender-400" />
                    <span>{student.email}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-lavender-100 dark:border-darkSurface-border text-[11px] text-slate-600 dark:text-lavender-200">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-400 dark:text-darkSurface-muted">
                    <Building2 className="h-3 w-3 text-lavender-400" />
                    Dept:
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-lavender-100 truncate max-w-[130px]">
                    {student.department}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-400 dark:text-darkSurface-muted">
                    <BookOpen className="h-3 w-3 text-lavender-400" />
                    Section:
                  </span>
                  <span className="font-bold text-lavender-600 dark:text-sky-300">
                    {student.classSection}
                  </span>
                </div>

                {/* View Profile Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setViewingStudent(student)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-lavender-200 dark:border-darkSurface-border bg-lavender-50/50 dark:bg-darkSurface-bg hover:bg-lavender-100 dark:hover:bg-darkSurface-cardHover text-xs font-semibold text-slate-700 dark:text-lavender-200 transition-colors shadow-2xs"
                  >
                    <Eye className="h-3.5 w-3.5 text-lavender-500" />
                    <span>View Profile</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-darkSurface-card px-5 py-3.5 rounded-2xl border border-lavender-200/80 dark:border-darkSurface-border text-xs">
          <span className="text-slate-500 dark:text-darkSurface-muted">
            Page <span className="font-bold text-slate-900 dark:text-lavender-100">{page}</span> of{' '}
            <span className="font-bold text-slate-900 dark:text-lavender-100">{totalPages}</span> (
            {total} students)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-lavender-200 dark:border-darkSurface-border font-semibold text-slate-700 dark:text-lavender-200 hover:bg-lavender-50 dark:hover:bg-darkSurface-cardHover transition-colors disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-lavender-200 dark:border-darkSurface-border font-semibold text-slate-700 dark:text-lavender-200 hover:bg-lavender-50 dark:hover:bg-darkSurface-cardHover transition-colors disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Student Profile Dialog */}
      {viewingStudent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-profile-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-darkSurface-card shadow-2xl border border-lavender-200 dark:border-darkSurface-border p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-lavender-100 dark:border-darkSurface-border pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-lavender-500 to-sky-400 text-white font-bold flex items-center justify-center text-base shadow-md shadow-lavender-500/20">
                  {getInitials(viewingStudent.name)}
                </div>
                <div>
                  <h3
                    id="student-profile-title"
                    className="text-base font-bold text-slate-900 dark:text-lavender-100"
                  >
                    {viewingStudent.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold uppercase mt-1">
                    <UserCheck className="h-3 w-3" />
                    Approved Student
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                aria-label="Close profile modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-lavender-200 hover:bg-lavender-50 dark:hover:bg-darkSurface-cardHover"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-lavender-50/50 dark:bg-darkSurface-bg">
                <span className="text-slate-500 dark:text-darkSurface-muted flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-lavender-400" /> Email:
                </span>
                <span className="font-mono font-semibold text-slate-800 dark:text-lavender-100">
                  {viewingStudent.email}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-lavender-50/50 dark:bg-darkSurface-bg">
                <span className="text-slate-500 dark:text-darkSurface-muted flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-lavender-400" /> Department:
                </span>
                <span className="font-semibold text-slate-800 dark:text-lavender-100">
                  {viewingStudent.department}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-lavender-50/50 dark:bg-darkSurface-bg">
                <span className="text-slate-500 dark:text-darkSurface-muted flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-lavender-400" /> Section:
                </span>
                <span className="font-bold text-lavender-600 dark:text-sky-300">
                  {viewingStudent.classSection}
                </span>
              </div>

              {viewingStudent.createdAt && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-lavender-50/50 dark:bg-darkSurface-bg">
                  <span className="text-slate-500 dark:text-darkSurface-muted flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-lavender-400" /> Enrolled:
                  </span>
                  <span className="text-slate-700 dark:text-lavender-200">
                    {new Date(viewingStudent.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="w-full py-2 px-4 rounded-xl bg-lavender-500 hover:bg-lavender-600 text-white font-semibold text-xs transition-colors shadow-soft-purple"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
