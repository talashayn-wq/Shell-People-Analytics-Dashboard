import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { AlertCircle, RefreshCw, Upload, X } from 'lucide-react';
import { DeepDiveTab } from './components/DeepDiveTab';
import { EmployeeDetailModal } from './components/EmployeeDetailModal';
import { FilterBar } from './components/FilterBar';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { Header } from './components/Header';
import { InsightsTab } from './components/InsightsTab';
import { OverviewTab } from './components/OverviewTab';
import type {
  DataSourceMeta,
  EmployeeRecord,
  FilterState,
  ScoredEmployee,
  TabId,
} from './types/employee';
import { computeLevelMedians, filterEmployees, scoreEmployees } from './utils/analytics';
import {
  fetchGoogleSheetCSV,
  parseEmployeeCSV,
  SHEET_GID,
  SHEET_ID,
} from './utils/csvParser';
import {
  clearAccessToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logoutGoogle,
} from './utils/googleAuth';
import {
  fetchSheetViaApiByGid,
  readSpreadsheetTabAsEmployees,
} from './utils/sheetsApi';

const DEFAULT_FILTERS: FilterState = {
  department: 'All',
  location: 'All',
  employmentType: 'All',
  gender: 'All',
  attrition: 'All',
};

function formatSyncTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return document.documentElement.classList.contains('dark');
    } catch {
      return false;
    }
  });

  const [rawRecords, setRawRecords] = useState<EmployeeRecord[]>([]);
  const [sourceMeta, setSourceMeta] = useState<DataSourceMeta | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedEmployee, setSelectedEmployee] = useState<ScoredEmployee | null>(null);
  const fallbackFileInputRef = useRef<HTMLInputElement | null>(null);

  // Google Workspace OAuth & Sheets state (token kept strictly in memory)
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [activeSheetId, setActiveSheetId] = useState<string>(SHEET_ID);
  const [activeTabTitle, setActiveTabTitle] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleAccessToken(token);
      },
      (user) => {
        setGoogleUser(user);
        setGoogleAccessToken(null);
      }
    );
    return unsubscribe;
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      try {
        localStorage.setItem('shell_pa_theme', next ? 'dark' : 'light');
      } catch {
        // Ignore storage restrictions
      }
      return next;
    });
  }, []);

  const syncFromGoogleSheet = useCallback(
    async (bustCache = false) => {
      setIsSyncing(true);
      setErrorMessage(null);
      try {
        const token = getAccessToken();

        if (token && activeTabTitle) {
          const records = await readSpreadsheetTabAsEmployees(
            activeSheetId,
            activeTabTitle,
            token
          );
          setRawRecords(records);
          setSourceMeta({
            sourceType: 'google-sheet',
            label: `Google Sheets API (${activeTabTitle})`,
            lastSynced: formatSyncTime(new Date()),
            totalRows: records.length,
          });
          return;
        }

        if (token && activeSheetId === SHEET_ID) {
          try {
            const apiResult = await fetchSheetViaApiByGid(
              SHEET_ID,
              Number(SHEET_GID),
              token
            );
            setRawRecords(apiResult.records);
            setActiveTabTitle(apiResult.tabTitle);
            setSourceMeta({
              sourceType: 'google-sheet',
              label: `Google Sheets API (${apiResult.tabTitle})`,
              lastSynced: formatSyncTime(new Date()),
              totalRows: apiResult.records.length,
            });
            return;
          } catch {
            // Fall back to public gviz CSV endpoint if Sheet is public-only
          }
        }

        const records = await fetchGoogleSheetCSV(bustCache);
        setRawRecords(records);
        setSourceMeta({
          sourceType: 'google-sheet',
          label: `Google Sheet (gid ${SHEET_GID})`,
          lastSynced: formatSyncTime(new Date()),
          totalRows: records.length,
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load dataset from Google Sheets.';
        setErrorMessage(message);
      } finally {
        setIsSyncing(false);
        setIsInitialLoading(false);
      }
    },
    [activeSheetId, activeTabTitle]
  );

  useEffect(() => {
    void syncFromGoogleSheet(false);
    // Initial mount load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setIsSigningInGoogle(true);
    setErrorMessage(null);
    try {
      const { user, accessToken } = await googleSignIn();
      setGoogleUser(user);
      setGoogleAccessToken(accessToken);
      setIsSheetsModalOpen(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Google Sign-In failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSigningInGoogle(false);
    }
  }, []);

  const handleGoogleLogout = useCallback(async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setGoogleAccessToken(null);
    setActiveSheetId(SHEET_ID);
    setActiveTabTitle(null);
  }, []);

  const handleSessionExpired = useCallback(() => {
    clearAccessToken();
    setGoogleAccessToken(null);
  }, []);

  const handleLoadFromSheetsModal = useCallback(
    (
      records: EmployeeRecord[],
      meta: { spreadsheetId: string; spreadsheetTitle: string; tabTitle: string }
    ) => {
      setRawRecords(records);
      setFilters(DEFAULT_FILTERS);
      setActiveSheetId(meta.spreadsheetId);
      setActiveTabTitle(meta.tabTitle);
      setSourceMeta({
        sourceType: 'google-sheet',
        label: `${meta.spreadsheetTitle} · ${meta.tabTitle}`,
        lastSynced: formatSyncTime(new Date()),
        totalRows: records.length,
      });
    },
    []
  );

  const handleUploadCSV = useCallback(async (file: File) => {
    setErrorMessage(null);
    try {
      const text = await file.text();
      const records = parseEmployeeCSV(text);
      setRawRecords(records);
      setFilters(DEFAULT_FILTERS);
      setActiveTabTitle(null);
      setSourceMeta({
        sourceType: 'csv-upload',
        label: `Uploaded CSV (${file.name})`,
        lastSynced: formatSyncTime(new Date()),
        totalRows: records.length,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? `CSV upload error (${file.name}): ${err.message}`
          : `Failed to parse uploaded CSV file "${file.name}".`;
      setErrorMessage(message);
    }
  }, []);

  const scoredEmployees = useMemo(() => {
    if (rawRecords.length === 0) return [];
    const medians = computeLevelMedians(rawRecords);
    return scoreEmployees(rawRecords, medians);
  }, [rawRecords]);

  const filterOptions = useMemo(() => {
    const uniqueSorted = (vals: string[]) =>
      Array.from(new Set(vals.filter(Boolean))).sort((a, b) => a.localeCompare(b));

    return {
      departments: uniqueSorted(scoredEmployees.map((e) => e.Department)),
      locations: uniqueSorted(scoredEmployees.map((e) => e.Location)),
      employmentTypes: uniqueSorted(scoredEmployees.map((e) => e.EmploymentType)),
      genders: uniqueSorted(scoredEmployees.map((e) => e.Gender)),
    };
  }, [scoredEmployees]);

  const filteredEmployees = useMemo(
    () => filterEmployees(scoredEmployees, filters),
    [scoredEmployees, filters]
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#111214] transition-colors duration-150 dark:bg-[#0D0E10] dark:text-[#F4F4F2]">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        isSyncing={isSyncing}
        onSyncSheet={() => void syncFromGoogleSheet(true)}
        onUploadCSV={(file) => void handleUploadCSV(file)}
      />

      <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <input
          ref={fallbackFileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUploadCSV(file);
            e.target.value = '';
          }}
          className="hidden"
          aria-label="Upload fallback CSV file"
        />

        {/* Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="flex flex-col justify-between gap-4 rounded-xl border border-[#DC2626]/30 bg-red-50/90 p-4 text-sm text-[#991B1B] dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200 sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626] dark:text-red-400" aria-hidden="true" />
              <div>
                <p className="font-semibold">Sheet data could not be loaded</p>
                <p className="mt-0.5 text-xs leading-relaxed opacity-90">{errorMessage}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => fallbackFileInputRef.current?.click()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 text-xs font-medium text-[#111214] hover:bg-neutral-50 dark:border-red-800 dark:bg-[#1E2126] dark:text-white dark:hover:bg-neutral-800 whitespace-nowrap"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                Upload CSV
              </button>
              <button
                type="button"
                onClick={() => void syncFromGoogleSheet(true)}
                disabled={isSyncing}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#FFC800] px-3 text-xs font-semibold text-[#111214] hover:bg-[#eab700] disabled:opacity-60 whitespace-nowrap"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                Retry Sync
              </button>
              {rawRecords.length > 0 && (
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  aria-label="Dismiss error banner"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isInitialLoading ? (
          <div className="space-y-6" aria-busy="true" aria-label="Loading workforce analytics">
            <div className="h-28 animate-pulse rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#16181C]" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-28 animate-pulse rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#16181C]"
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="h-80 animate-pulse rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#16181C]" />
              <div className="h-80 animate-pulse rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#16181C]" />
            </div>
          </div>
        ) : rawRecords.length === 0 ? (
          <section className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center dark:border-neutral-700 dark:bg-[#16181C]">
            <h2 className="text-lg font-semibold text-[#111214] dark:text-[#F4F4F2]">
              No workforce dataset loaded
            </h2>
            <p className="mx-auto mt-1.5 max-w-lg text-sm text-neutral-500 dark:text-neutral-400">
              Retry syncing from Google Sheets, sign in with Google to browse Drive spreadsheets, or upload a local Shell UK employee CSV export.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void syncFromGoogleSheet(true)}
                disabled={isSyncing}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#FFC800] px-4 text-sm font-semibold text-[#111214] hover:bg-[#eab700]"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                Sync Sheet
              </button>
              <GoogleSignInButton
                onClick={() => void handleGoogleSignIn()}
                disabled={isSigningInGoogle}
                label={isSigningInGoogle ? 'Connecting...' : 'Sign in with Google'}
              />
              <button
                type="button"
                onClick={() => fallbackFileInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-[#111214] hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#1E2126] dark:text-white dark:hover:bg-neutral-800"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Upload CSV
              </button>
            </div>
          </section>
        ) : (
          <>
            <FilterBar
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
              options={filterOptions}
              filteredCount={filteredEmployees.length}
              totalCount={scoredEmployees.length}
              sourceMeta={sourceMeta}
              googleUser={googleUser}
              hasGoogleToken={Boolean(googleAccessToken)}
              isSigningInGoogle={isSigningInGoogle}
              onGoogleSignIn={() => void handleGoogleSignIn()}
              onGoogleLogout={() => void handleGoogleLogout()}
              onOpenSheetsWorkspace={() => setIsSheetsModalOpen(true)}
            />

            {activeTab === 'overview' && (
              <OverviewTab employees={filteredEmployees} isDark={isDark} />
            )}

            {activeTab === 'deep-dive' && (
              <DeepDiveTab
                employees={filteredEmployees}
                isDark={isDark}
                onSelectEmployee={setSelectedEmployee}
              />
            )}

            {activeTab === 'insights' && (
              <InsightsTab
                filteredEmployees={filteredEmployees}
                allEmployees={scoredEmployees}
                onSelectEmployee={setSelectedEmployee}
              />
            )}
          </>
        )}
      </main>

      <EmployeeDetailModal
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
      />

      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        accessToken={googleAccessToken}
        activeSpreadsheetId={activeSheetId}
        activeTabTitle={activeTabTitle}
        filteredEmployees={filteredEmployees}
        onLoadRecords={handleLoadFromSheetsModal}
        onSessionExpired={handleSessionExpired}
      />
    </div>
  );
}
