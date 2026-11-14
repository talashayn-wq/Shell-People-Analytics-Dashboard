interface KpiCardProps {
  label: string;
  value: string;
  detail: string;
  accent?: 'default' | 'yellow' | 'orange' | 'danger' | 'positive';
}

export function KpiCard({
  label,
  value,
  detail,
  accent = 'default',
}: KpiCardProps) {
  const valueColorClass =
    accent === 'danger'
      ? 'text-[#DC2626] dark:text-[#F87171]'
      : accent === 'orange'
        ? 'text-[#D9680D] dark:text-[#F58220]'
        : accent === 'positive'
          ? 'text-[#15803D] dark:text-[#4ADE80]'
          : accent === 'yellow'
            ? 'text-[#111214] dark:text-[#FFC800]'
            : 'text-[#111214] dark:text-[#F4F4F2]';

  return (
    <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#16181C]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {label}
        </span>
        {accent === 'yellow' && (
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-xs bg-[#FFC800]"
          />
        )}
        {accent === 'orange' && (
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-xs bg-[#F58220]"
          />
        )}
      </div>

      <div
        className={`mt-2.5 font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-[1.75rem] ${valueColorClass}`}
      >
        {value}
      </div>

      <p className="mt-2 truncate text-xs text-neutral-500 dark:text-neutral-400" title={detail}>
        {detail}
      </p>
    </div>
  );
}
