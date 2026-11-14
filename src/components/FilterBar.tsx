import type { User } from 'firebase/auth';
import { FileSpreadsheet, LogOut, RotateCcw } from 'lucide-react';
import type { DataSourceMeta, FilterState } from '../types/employee';
import { GoogleSignInButton } from './GoogleSignInButton';

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  options: {
    departments: string[];
    locations: string[];
    employmentTypes: string[];
    genders: string[];
  };
  filteredCount: number;
  totalCount: number;
  sourceMeta: DataSourceMeta | null;
  googleUser: User | null;
  hasGoogleToken: boolean;
  isSigningInGoogle: boolean;
  onGoogleSignIn: () => void;
  onGoogleLogout: () => void;
  onOpenSheetsWorkspace: () => void;
}

export function FilterBar({
  filters,
  onChange,
  onReset,
  options,
  filteredCount,
  totalCount,
  sourceMeta,
  googleUser,
  hasGoogleToken,
  isSigningInGoogle,
  onGoogleSignIn,
  onGoogleLogout,
  onOpenSheetsWorkspace,
}: FilterBarProps) {
  const hasActiveFilter =
    filters.department !== 'All' ||
    filters.location !== 'All' ||
    filters.employmentType !== 'All' ||
    filters.gender !== 'All' ||
    filters.attrition !== 'All';

  const selectClass =
    'h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-[#111214] transition-colors hover:border-neutral-300 focus:border-[#F58220] focus:outline-none dark:border-neutral-700 dark:bg-[#1E2126] dark:text-[#F4F4F2] dark:hover:border-neutral-600 dark:focus:border-[#FFC800]';

  const labelClass = 'mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400';

  return (
    <section
      aria-label="Workforce filters"
      className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#16181C] sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3.5 text-xs text-neutral-500 dark:border-neutral-800/80 dark:text-neutral-400">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[#111214] dark:text-[#F4F4F2]">
            Showing <span className="font-mono tabular-nums">{filteredCount}</span> of{' '}
            <span className="font-mono tabular-nums">{totalCount}</span> employees
          </span>
          {sourceMeta && (
            <>
              <span aria-hidden="true">·</span>
              <span>{sourceMeta.label}</span>
              <span aria-hidden="true">·</span>
              <span>Synced {sourceMeta.lastSynced}</span>
            </>
          )}
          {hasActiveFilter && (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1 font-medium text-[#D9680D] hover:underline dark:text-[#FFC800] whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Reset filters
              </button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {hasGoogleToken && googleUser ? (
            <>
              <span className="text-xs text-neutral-600 dark:text-neutral-300">
                {googleUser.email || googleUser.displayName || 'Google Connected'}
              </span>
              <button
                type="button"
                onClick={onOpenSheetsWorkspace}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs font-semibold text-[#111214] transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#1E2126] dark:text-[#F4F4F2] dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#15803D] dark:text-[#4ADE80]" aria-hidden="true" />
                Sheets Workspace
              </button>
              <button
                type="button"
                onClick={onGoogleLogout}
                title="Sign out of Google Workspace"
                className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-[#111214] dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white whitespace-nowrap shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Sign out
              </button>
            </>
          ) : (
            <GoogleSignInButton
              onClick={onGoogleSignIn}
              disabled={isSigningInGoogle}
              label={isSigningInGoogle ? 'Connecting...' : 'Sign in with Google'}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="filter-department" className={labelClass}>
            Department
          </label>
          <select
            id="filter-department"
            value={filters.department}
            onChange={(e) => onChange({ ...filters, department: e.target.value })}
            className={selectClass}
          >
            <option value="All">All Departments</option>
            {options.departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-location" className={labelClass}>
            Location
          </label>
          <select
            id="filter-location"
            value={filters.location}
            onChange={(e) => onChange({ ...filters, location: e.target.value })}
            className={selectClass}
          >
            <option value="All">All Locations</option>
            {options.locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-employment-type" className={labelClass}>
            Employment Type
          </label>
          <select
            id="filter-employment-type"
            value={filters.employmentType}
            onChange={(e) => onChange({ ...filters, employmentType: e.target.value })}
            className={selectClass}
          >
            <option value="All">All Types</option>
            {options.employmentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-gender" className={labelClass}>
            Gender
          </label>
          <select
            id="filter-gender"
            value={filters.gender}
            onChange={(e) => onChange({ ...filters, gender: e.target.value })}
            className={selectClass}
          >
            <option value="All">All Genders</option>
            {options.genders.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-attrition" className={labelClass}>
            Attrition Status
          </label>
          <select
            id="filter-attrition"
            value={filters.attrition}
            onChange={(e) =>
              onChange({
                ...filters,
                attrition: e.target.value as FilterState['attrition'],
              })
            }
            className={selectClass}
          >
            <option value="All">All Employees</option>
            <option value="No">Active Only (No)</option>
            <option value="Yes">Attrited Only (Yes)</option>
          </select>
        </div>
      </div>
    </section>
  );
}
