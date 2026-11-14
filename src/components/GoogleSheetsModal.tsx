import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  FolderSearch,
  RefreshCw,
  UploadCloud,
  X,
} from 'lucide-react';
import type { EmployeeRecord, ScoredEmployee } from '../types/employee';
import { SHEET_GID, SHEET_ID } from '../utils/csvParser';
import {
  type DriveSpreadsheetFile,
  exportReportToNewGoogleSheet,
  extractGidFromUrl,
  extractSpreadsheetId,
  getSpreadsheetMetadata,
  listUserSpreadsheets,
  readSpreadsheetTabAsEmployees,
  type SpreadsheetMetadata,
} from '../utils/sheetsApi';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  activeSpreadsheetId: string;
  activeTabTitle: string | null;
  filteredEmployees: ScoredEmployee[];
  onLoadRecords: (
    records: EmployeeRecord[],
    meta: { spreadsheetId: string; spreadsheetTitle: string; tabTitle: string }
  ) => void;
  onSessionExpired: () => void;
}

export function GoogleSheetsModal({
  isOpen,
  onClose,
  accessToken,
  activeSpreadsheetId,
  activeTabTitle,
  filteredEmployees,
  onLoadRecords,
  onSessionExpired,
}: GoogleSheetsModalProps) {
  const [mode, setMode] = useState<'import' | 'export'>('import');

  // Import state
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [sheetInput, setSheetInput] = useState(activeSpreadsheetId || SHEET_ID);
  const [selectedMeta, setSelectedMeta] = useState<SpreadsheetMetadata | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>(activeTabTitle ?? '');
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [isImportingTab, setIsImportingTab] = useState(false);

  // Export state
  const [exportScope, setExportScope] = useState<'watchlist' | 'filtered'>('watchlist');
  const [exportTitle, setExportTitle] = useState(
    `Shell People Analytics — Export (${new Date().toISOString().slice(0, 10)})`
  );
  const [pendingExportConfirm, setPendingExportConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    spreadsheetUrl: string;
    rowCount: number;
    title: string;
  } | null>(null);

  const [modalError, setModalError] = useState<string | null>(null);

  const exportRows = useMemo(() => {
    if (exportScope === 'watchlist') {
      return [...filteredEmployees]
        .filter((e) => e.Attrition === 'No')
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 10);
    }
    return filteredEmployees;
  }, [exportScope, filteredEmployees]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !accessToken) return;
    let cancelled = false;

    const loadFiles = async () => {
      setIsLoadingFiles(true);
      setModalError(null);
      try {
        const files = await listUserSpreadsheets(accessToken);
        if (!cancelled) setDriveFiles(files);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unable to list Google Drive spreadsheets.';
          setModalError(msg);
          if (msg.toLowerCase().includes('expired')) onSessionExpired();
        }
      } finally {
        if (!cancelled) setIsLoadingFiles(false);
      }
    };

    void loadFiles();
    return () => {
      cancelled = true;
    };
  }, [isOpen, accessToken, onSessionExpired]);

  const inspectSpreadsheet = async (rawInput: string) => {
    if (!accessToken) return;
    const id = extractSpreadsheetId(rawInput);
    if (!id) {
      setModalError('Enter a valid Google Spreadsheet URL or ID.');
      return;
    }

    setIsLoadingMeta(true);
    setModalError(null);
    try {
      const meta = await getSpreadsheetMetadata(id, accessToken);
      setSelectedMeta(meta);
      const urlGid = extractGidFromUrl(rawInput) ?? (id === SHEET_ID ? Number(SHEET_GID) : null);
      const matched = urlGid !== null ? meta.sheets.find((s) => s.sheetId === urlGid) : undefined;
      setSelectedTab(matched?.title ?? meta.sheets[0]?.title ?? '');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to read spreadsheet metadata.';
      setModalError(msg);
      if (msg.toLowerCase().includes('expired')) onSessionExpired();
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleLoadSelectedTab = async () => {
    if (!accessToken || !selectedMeta || !selectedTab) return;
    setIsImportingTab(true);
    setModalError(null);
    try {
      const records = await readSpreadsheetTabAsEmployees(
        selectedMeta.spreadsheetId,
        selectedTab,
        accessToken
      );
      onLoadRecords(records, {
        spreadsheetId: selectedMeta.spreadsheetId,
        spreadsheetTitle: selectedMeta.title,
        tabTitle: selectedTab,
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to read employee rows from tab.';
      setModalError(msg);
      if (msg.toLowerCase().includes('expired')) onSessionExpired();
    } finally {
      setIsImportingTab(false);
    }
  };

  const handleConfirmExport = async () => {
    if (!accessToken || exportRows.length === 0) return;
    setIsExporting(true);
    setModalError(null);
    try {
      const safeTitle = exportTitle.trim() || 'Shell People Analytics Export';
      const result = await exportReportToNewGoogleSheet(
        safeTitle,
        exportRows,
        exportScope,
        accessToken
      );
      setExportResult({
        spreadsheetUrl: result.spreadsheetUrl,
        rowCount: result.rowCount,
        title: safeTitle,
      });
      setPendingExportConfirm(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create Google Sheet.';
      setModalError(msg);
      if (msg.toLowerCase().includes('expired')) onSessionExpired();
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheets-workspace-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-[#16181C]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <div>
            <h2
              id="sheets-workspace-title"
              className="text-lg font-bold text-[#111214] dark:text-[#F4F4F2]"
            >
              Google Sheets Workspace
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Load any spreadsheet tab from Google Drive or export filtered analytics to a new Google Sheet
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Google Sheets Workspace"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="mt-4 flex gap-2 border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => {
              setMode('import');
              setPendingExportConfirm(false);
              setModalError(null);
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              mode === 'import'
                ? 'bg-[#111214] text-[#FFC800] dark:bg-[#FFC800] dark:text-[#111214]'
                : 'border border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            <FolderSearch className="h-3.5 w-3.5" aria-hidden="true" />
            Connect Spreadsheet
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('export');
              setModalError(null);
              setExportResult(null);
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              mode === 'export'
                ? 'bg-[#111214] text-[#FFC800] dark:bg-[#FFC800] dark:text-[#111214]'
                : 'border border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
            Export Report to Sheets
          </button>
        </div>

        {modalError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-700/50 dark:bg-red-950/40 dark:text-red-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{modalError}</span>
          </div>
        )}

        {mode === 'import' ? (
          <div className="mt-4 space-y-5">
            {/* URL / ID Lookup */}
            <div>
              <label
                htmlFor="sheet-url-input"
                className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Google Sheet URL or Spreadsheet ID
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="sheet-url-input"
                  type="text"
                  value={sheetInput}
                  onChange={(e) => setSheetInput(e.target.value)}
                  placeholder="Paste Google Sheets URL or spreadsheet ID..."
                  className="h-10 flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm text-[#111214] focus:border-[#F58220] focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-[#1E2126] dark:text-[#F4F4F2] dark:focus:border-[#FFC800]"
                />
                <button
                  type="button"
                  onClick={() => void inspectSpreadsheet(sheetInput)}
                  disabled={isLoadingMeta || !accessToken}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#FFC800] px-4 text-xs font-semibold text-[#111214] hover:bg-[#eab700] disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingMeta ? 'animate-spin' : ''}`} aria-hidden="true" />
                  Fetch Tabs
                </button>
              </div>
            </div>

            {/* Recent Google Drive Spreadsheets */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-600 dark:text-neutral-300">
                  Your Google Drive Spreadsheets
                </span>
                {isLoadingFiles && (
                  <span className="text-neutral-400">Loading Drive files...</span>
                )}
              </div>
              {driveFiles.length === 0 && !isLoadingFiles ? (
                <p className="rounded-lg border border-dashed border-neutral-200 p-4 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  No spreadsheets returned by Drive, or paste any accessible Google Sheet URL above.
                </p>
              ) : (
                <div className="max-h-44 divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                  {driveFiles.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => {
                        setSheetInput(file.id);
                        void inspectSpreadsheet(file.id);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                    >
                      <span className="flex min-w-0 items-center gap-2 font-medium text-[#111214] dark:text-[#F4F4F2]">
                        <FileSpreadsheet className="h-4 w-4 shrink-0 text-[#15803D] dark:text-[#4ADE80]" aria-hidden="true" />
                        <span className="truncate">{file.name}</span>
                      </span>
                      <span className="font-mono text-[11px] text-neutral-400 shrink-0">
                        {file.modifiedTime ? file.modifiedTime.slice(0, 10) : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tab Selector */}
            {selectedMeta && (
              <div className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-[#111214] dark:text-[#F4F4F2]">
                    {selectedMeta.title}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {selectedMeta.sheets.length} tab(s) available
                  </span>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label
                      htmlFor="sheet-tab-select"
                      className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300"
                    >
                      Worksheet Tab
                    </label>
                    <select
                      id="sheet-tab-select"
                      value={selectedTab}
                      onChange={(e) => setSelectedTab(e.target.value)}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-[#111214] dark:border-neutral-700 dark:bg-[#1E2126] dark:text-[#F4F4F2]"
                    >
                      {selectedMeta.sheets.map((tab) => (
                        <option key={tab.sheetId} value={tab.title}>
                          {tab.title} ({tab.rowCount} rows)
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleLoadSelectedTab()}
                    disabled={isImportingTab || !selectedTab}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[#111214] px-4 text-xs font-semibold text-[#FFC800] hover:bg-neutral-800 disabled:opacity-50 dark:bg-[#FFC800] dark:text-[#111214] dark:hover:bg-[#eab700] whitespace-nowrap shrink-0"
                  >
                    {isImportingTab ? 'Loading Tab...' : 'Load Selected Tab'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="export-scope-select"
                className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Data to Export
              </label>
              <select
                id="export-scope-select"
                value={exportScope}
                onChange={(e) => {
                  setExportScope(e.target.value as 'watchlist' | 'filtered');
                  setPendingExportConfirm(false);
                }}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-[#111214] dark:border-neutral-700 dark:bg-[#1E2126] dark:text-[#F4F4F2]"
              >
                <option value="watchlist">
                  Top-10 Active Flight-Risk Watchlist ({Math.min(10, filteredEmployees.filter((e) => e.Attrition === 'No').length)} rows)
                </option>
                <option value="filtered">
                  All Filtered Employees ({filteredEmployees.length} rows)
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="export-title-input"
                className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                New Google Sheet Title
              </label>
              <input
                id="export-title-input"
                type="text"
                value={exportTitle}
                onChange={(e) => setExportTitle(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm text-[#111214] focus:border-[#F58220] focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-[#1E2126] dark:text-[#F4F4F2]"
              />
            </div>

            {exportResult && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" aria-hidden="true" />
                  <span>
                    Created <strong>{exportResult.title}</strong> with {exportResult.rowCount} employee rows.
                  </span>
                </div>
                <a
                  href={exportResult.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold underline hover:opacity-80"
                >
                  Open in Google Sheets
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            )}

            {/* Explicit Confirmation Dialog Step */}
            {pendingExportConfirm ? (
              <div className="rounded-lg border border-[#F58220]/50 bg-amber-50/70 p-4 text-xs dark:border-[#FFC800]/40 dark:bg-amber-950/30">
                <p className="font-semibold text-[#111214] dark:text-[#F4F4F2]">
                  Confirm Google Drive Creation
                </p>
                <p className="mt-1 leading-relaxed text-neutral-700 dark:text-neutral-300">
                  Create a new Google Sheet named <strong>&ldquo;{exportTitle.trim() || 'Shell People Analytics Export'}&rdquo;</strong> in your Google Drive and write{' '}
                  <strong className="font-mono">{exportRows.length}</strong> employee record(s)?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleConfirmExport()}
                    disabled={isExporting}
                    className="inline-flex h-9 items-center rounded-lg bg-[#FFC800] px-4 font-semibold text-[#111214] hover:bg-[#eab700] disabled:opacity-50"
                  >
                    {isExporting ? 'Creating Sheet...' : 'Confirm & Create Sheet'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingExportConfirm(false)}
                    disabled={isExporting}
                    className="inline-flex h-9 items-center rounded-lg border border-neutral-300 bg-white px-3.5 font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#1E2126] dark:text-neutral-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setPendingExportConfirm(true)}
                  disabled={exportRows.length === 0 || !accessToken}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#FFC800] px-4 text-xs font-semibold text-[#111214] hover:bg-[#eab700] disabled:opacity-50"
                >
                  <UploadCloud className="h-4 w-4" aria-hidden="true" />
                  Export to New Google Sheet ({exportRows.length} rows)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
