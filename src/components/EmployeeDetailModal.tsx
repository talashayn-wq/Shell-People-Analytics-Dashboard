import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ScoredEmployee } from '../types/employee';
import { formatGBP, formatTravelLabel } from '../utils/analytics';

interface EmployeeDetailModalProps {
  employee: ScoredEmployee | null;
  onClose: () => void;
}

export function EmployeeDetailModal({
  employee,
  onClose,
}: EmployeeDetailModalProps) {
  useEffect(() => {
    if (!employee) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [employee, onClose]);

  if (!employee) return null;

  const tierTextClass =
    employee.riskTier === 'High'
      ? 'text-[#DC2626] dark:text-[#F87171]'
      : employee.riskTier === 'Elevated'
        ? 'text-[#D9680D] dark:text-[#F58220]'
        : 'text-neutral-600 dark:text-neutral-300';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-[#16181C]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="font-mono font-medium">{employee.EmployeeID}</span>
              <span aria-hidden="true">·</span>
              <span>{employee.Department}</span>
              <span aria-hidden="true">·</span>
              <span>{employee.Location}</span>
            </div>
            <h2
              id="employee-detail-title"
              className="mt-1 text-xl font-bold text-[#111214] dark:text-[#F4F4F2]"
            >
              {employee.FullName}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {employee.JobTitle} · Level {employee.JobLevel} · {employee.EmploymentType}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close employee details"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Key Profile Metrics */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Monthly Income</div>
            <div className="mt-1 font-mono text-base font-semibold tabular-nums">
              {formatGBP(employee.MonthlyIncome_GBP)}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {employee.incomeVsMedianPct >= 0 ? '+' : ''}
              {employee.incomeVsMedianPct.toFixed(1)}% vs L{employee.JobLevel} median
            </div>
          </div>

          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Company Tenure</div>
            <div className="mt-1 font-mono text-base font-semibold tabular-nums">
              {employee.YearsAtCompany} yrs
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Hired {employee.HireDate || 'N/A'}
            </div>
          </div>

          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Attrition Status</div>
            <div className="mt-1 text-base font-semibold">
              {employee.Attrition === 'Yes' ? 'Attrited (Left)' : 'Active'}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {formatTravelLabel(employee.BusinessTravel)}
            </div>
          </div>

          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Flight-Risk Score</div>
            <div className={`mt-1 font-mono text-base font-semibold tabular-nums ${tierTextClass}`}>
              {employee.riskScore}/100 ({employee.riskTier})
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {employee.DistanceFromHome_km} km commute
            </div>
          </div>
        </div>

        {/* Secondary Demographics */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-neutral-200 pt-4 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-300 sm:grid-cols-3">
          <div>
            <span className="text-neutral-400">Age / Gender: </span>
            <span className="font-medium">{employee.Age} · {employee.Gender}</span>
          </div>
          <div>
            <span className="text-neutral-400">Education: </span>
            <span className="font-medium">{employee.Education}</span>
          </div>
          <div>
            <span className="text-neutral-400">Years in Role: </span>
            <span className="font-mono font-medium tabular-nums">{employee.YearsInCurrentRole} yrs</span>
          </div>
          <div>
            <span className="text-neutral-400">Since Promotion: </span>
            <span className="font-mono font-medium tabular-nums">{employee.YearsSinceLastPromotion} yrs</span>
          </div>
          <div>
            <span className="text-neutral-400">With Manager: </span>
            <span className="font-mono font-medium tabular-nums">{employee.YearsWithCurrManager} yrs</span>
          </div>
          <div>
            <span className="text-neutral-400">Marital Status: </span>
            <span className="font-medium">{employee.MaritalStatus}</span>
          </div>
        </div>

        {/* Transparent Risk Breakdown */}
        <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-[#111214] dark:text-[#F4F4F2]">
            Flight-Risk Score Breakdown
          </h3>
          <div className="mt-3 space-y-2.5">
            {employee.riskBreakdown.map((item) => {
              const pct = item.maxPoints > 0 ? (item.points / item.maxPoints) * 100 : 0;
              return (
                <div key={item.criterion}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#111214] dark:text-[#F4F4F2]">
                      {item.criterion}
                    </span>
                    <span className="font-mono tabular-nums text-neutral-600 dark:text-neutral-300">
                      +{item.points} / {item.maxPoints} pts
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className={`h-full rounded-full ${
                        item.points >= item.maxPoints * 0.75
                          ? 'bg-[#DC2626]'
                          : item.points > 0
                            ? 'bg-[#F58220]'
                            : 'bg-neutral-300 dark:bg-neutral-700'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                    {item.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
