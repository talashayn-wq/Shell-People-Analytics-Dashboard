import { useRef } from 'react';
import { Moon, RefreshCw, Sun, Upload } from 'lucide-react';
import type { TabId } from '../types/employee';

interface HeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isSyncing: boolean;
  onSyncSheet: () => void;
  onUploadCSV: (file: File) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'deep-dive', label: 'Deep Dive' },
  { id: 'insights', label: 'Insights' },
];

export function Header({
  activeTab,
  onTabChange,
  isDark,
  onToggleTheme,
  isSyncing,
  onSyncSheet,
  onUploadCSV,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadCSV(file);
    }
    e.target.value = '';
  };

  return (
    <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#16181C]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:gap-8 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <svg
            viewBox="0 0 36 34"
            className="h-7 w-7 shrink-0"
            aria-hidden="true"
          >
            <path
              d="M18 2C9.4 2 2.5 8.8 2.5 17.3c0 4.5 1.9 8.7 5.2 11.6L11.5 32h13l3.8-3.1c3.3-2.9 5.2-7.1 5.2-11.6C33.5 8.8 26.6 2 18 2z"
              fill="#FFC800"
              stroke="#111214"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path
              d="M18 6v23M18 29L11.2 8.2M18 29L24.8 8.2M18 29L6.5 14.2M18 29L29.5 14.2"
              stroke="#F58220"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-base font-bold tracking-tight text-[#111214] dark:text-[#F4F4F2] sm:text-lg">
            Shell People Analytics
          </span>
        </div>

        {/* Zone 2: Desktop Tab Navigation */}
        <nav
          aria-label="Dashboard sections"
          className="hidden md:flex items-center gap-2"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220] ${
                  isActive
                    ? 'bg-[#111214] text-[#FFC800] dark:bg-[#FFC800] dark:text-[#111214]'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-[#111214] dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Utility & Primary Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#1E2126] dark:text-neutral-200 dark:hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220]"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload employee CSV file"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-[#111214] transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#1E2126] dark:text-neutral-100 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220] sm:px-3.5 sm:text-sm"
          >
            <Upload className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Upload CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>

          <button
            type="button"
            onClick={onSyncSheet}
            disabled={isSyncing}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#FFC800] px-3.5 text-xs font-semibold text-[#111214] transition-colors hover:bg-[#eab700] disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220] sm:px-4 sm:text-sm"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isSyncing ? 'Syncing...' : 'Sync Sheet'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Strip */}
      <nav
        aria-label="Mobile dashboard sections"
        className="flex border-t border-neutral-200 px-4 dark:border-neutral-800 md:hidden"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 py-2.5 text-center text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                isActive
                  ? 'border-[#F58220] text-[#111214] dark:border-[#FFC800] dark:text-[#FFC800]'
                  : 'border-transparent text-neutral-500 hover:text-[#111214] dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
