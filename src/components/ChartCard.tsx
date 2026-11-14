import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  heightClass?: string;
  className?: string;
  action?: ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  heightClass = 'h-72',
  className = '',
  action,
  isEmpty = false,
  emptyMessage = 'No employee records match the current filters.',
  children,
}: ChartCardProps) {
  return (
    <section
      className={`rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#16181C] ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-[#111214] dark:text-[#F4F4F2]">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {isEmpty ? (
        <div
          className={`flex ${heightClass} items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50/70 px-4 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-400`}
        >
          {emptyMessage}
        </div>
      ) : (
        <div className={heightClass}>{children}</div>
      )}
    </section>
  );
}
