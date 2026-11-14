import { useMemo } from 'react';
import type { ScoredEmployee } from '../types/employee';
import {
  formatGBP,
  generateInsights,
  HIGH_RISK_THRESHOLD,
  RISK_RUBRIC,
} from '../utils/analytics';

interface InsightsTabProps {
  filteredEmployees: ScoredEmployee[];
  allEmployees: ScoredEmployee[];
  onSelectEmployee: (emp: ScoredEmployee) => void;
}

export function InsightsTab({
  filteredEmployees,
  allEmployees,
  onSelectEmployee,
}: InsightsTabProps) {
  const { findings, watchlist, actions } = useMemo(
    () => generateInsights(filteredEmployees, allEmployees),
    [filteredEmployees, allEmployees]
  );

  if (filteredEmployees.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-[#16181C] dark:text-neutral-400">
        No employees match the current filter criteria. Reset one or more filters to generate workforce insights and the flight-risk watchlist.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-Generated Findings */}
      <section aria-labelledby="findings-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="findings-heading"
            className="text-lg font-semibold tracking-tight text-[#111214] dark:text-[#F4F4F2]"
          >
            Auto-Generated Workforce Findings
          </h2>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Computed dynamically for <span className="font-mono tabular-nums">{filteredEmployees.length}</span> filtered employees
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {findings.map((finding) => {
            const metricColor =
              finding.severity === 'critical'
                ? 'text-[#DC2626] dark:text-[#F87171]'
                : finding.severity === 'warning'
                  ? 'text-[#D9680D] dark:text-[#F58220]'
                  : finding.severity === 'positive'
                    ? 'text-[#15803D] dark:text-[#4ADE80]'
                    : 'text-[#111214] dark:text-[#FFC800]';

            return (
              <article
                key={finding.id}
                className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#16181C]"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {finding.category}
                    </span>
                    <span className={`font-mono text-sm font-semibold tabular-nums ${metricColor}`}>
                      {finding.metricValue}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold leading-snug text-[#111214] dark:text-[#F4F4F2]">
                    {finding.headline}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                    {finding.detail}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Transparent Flight-Risk Scoring Rule */}
      <section
        aria-labelledby="rubric-heading"
        className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#16181C]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 pb-3.5 dark:border-neutral-800">
          <div>
            <h2
              id="rubric-heading"
              className="text-base font-semibold tracking-tight text-[#111214] dark:text-[#F4F4F2]"
            >
              Transparent Flight-Risk Scoring Rule (0–100 Scale)
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Deterministic additive model applied to active staff · High Risk &ge; {HIGH_RISK_THRESHOLD} pts · Elevated 40–59 · Moderate 20–39 · Low &lt; 20
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">
          {RISK_RUBRIC.map((rule) => (
            <div key={rule.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-[#111214] dark:text-[#F4F4F2]">
                  {rule.criterion}
                </span>
                <span className="font-mono text-xs font-medium tabular-nums text-[#D9680D] dark:text-[#FFC800]">
                  +{rule.maxPoints} max
                </span>
              </div>
              <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                {rule.ruleSummary}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Top-10 Flight-Risk Watchlist */}
      <section
        aria-labelledby="watchlist-heading"
        className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#16181C]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 p-5 dark:border-neutral-800">
          <div>
            <h2
              id="watchlist-heading"
              className="text-base font-semibold tracking-tight text-[#111214] dark:text-[#F4F4F2]"
            >
              Top-10 Active Flight-Risk Watchlist
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Highest-scoring active employees in the current filter view (click a row for itemized score breakdown)
            </p>
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Showing top <span className="font-mono tabular-nums">{watchlist.length}</span> active staff
          </span>
        </div>

        {watchlist.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No active employees in the current filter selection. Clear the Attrition = &ldquo;Attrited Only&rdquo; filter to view active retention risk.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/80 text-xs font-medium text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
                  <th className="px-4 py-3 text-right whitespace-nowrap">Rank</th>
                  <th className="px-4 py-3 whitespace-nowrap">Employee</th>
                  <th className="px-4 py-3 whitespace-nowrap">Department & Site</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Tenure / Promo</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Pay vs. Level Median</th>
                  <th className="px-4 py-3 whitespace-nowrap">Primary Risk Drivers</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                {watchlist.map((emp, idx) => {
                  const scoreColor =
                    emp.riskTier === 'High'
                      ? 'text-[#DC2626] dark:text-[#F87171]'
                      : emp.riskTier === 'Elevated'
                        ? 'text-[#D9680D] dark:text-[#F58220]'
                        : 'text-neutral-700 dark:text-neutral-300';

                  return (
                    <tr
                      key={emp.EmployeeID}
                      onClick={() => onSelectEmployee(emp)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectEmployee(emp);
                        }
                      }}
                      tabIndex={0}
                      className="cursor-pointer transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none dark:hover:bg-neutral-800/50 dark:focus-visible:bg-neutral-800/50"
                    >
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">
                        #{idx + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-[#111214] dark:text-[#F4F4F2]">
                          {emp.FullName}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          <span className="font-mono">{emp.EmployeeID}</span> · {emp.JobTitle} (L{emp.JobLevel})
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-neutral-800 dark:text-neutral-200">{emp.Department}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{emp.Location}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        <div>{emp.YearsAtCompany} yrs tenure</div>
                        <div className="text-neutral-500 dark:text-neutral-400">
                          {emp.YearsSinceLastPromotion} yrs since promo
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                        <div className="font-medium text-[#111214] dark:text-[#F4F4F2]">
                          {formatGBP(emp.MonthlyIncome_GBP)}
                        </div>
                        <div
                          className={
                            emp.incomeVsMedianPct <= -10
                              ? 'text-[#DC2626] dark:text-[#F87171]'
                              : 'text-neutral-500 dark:text-neutral-400'
                          }
                        >
                          {emp.incomeVsMedianPct >= 0 ? '+' : ''}
                          {emp.incomeVsMedianPct.toFixed(1)}% vs L{emp.JobLevel}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                        {emp.topDrivers.length > 0 ? emp.topDrivers.join(' · ') : 'No elevated risk drivers'}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${scoreColor}`}>
                        <div>{emp.riskScore}/100</div>
                        <div className="font-sans text-[11px] font-medium">{emp.riskTier} Risk</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recommended HR Actions */}
      <section aria-labelledby="actions-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="actions-heading"
            className="text-lg font-semibold tracking-tight text-[#111214] dark:text-[#F4F4F2]"
          >
            Recommended Retention Actions
          </h2>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Prioritized interventions scoped to the active filter cohort
          </span>
        </div>

        {actions.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-[#16181C] dark:text-neutral-400">
            No urgent retention actions triggered for this cohort.
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-[#16181C]">
            {actions.map((action, index) => {
              const priorityColor =
                action.priority === 'Immediate'
                  ? 'text-[#DC2626] dark:text-[#F87171]'
                  : action.priority === 'Near-Term'
                    ? 'text-[#D9680D] dark:text-[#F58220]'
                    : 'text-neutral-600 dark:text-neutral-300';

              return (
                <div
                  key={action.id}
                  className="grid grid-cols-1 gap-3 p-5 lg:grid-cols-12 lg:items-start lg:gap-6"
                >
                  <div className="lg:col-span-5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-neutral-400">
                        0{index + 1}.
                      </span>
                      <span className={`font-semibold ${priorityColor}`}>
                        {action.priority} Priority
                      </span>
                      <span aria-hidden="true" className="text-neutral-400">·</span>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        {action.targetGroup}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold text-[#111214] dark:text-[#F4F4F2]">
                      {action.title}
                    </h3>
                  </div>

                  <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300 lg:col-span-4">
                    {action.rationale}
                  </p>

                  <div className="text-xs text-neutral-600 dark:text-neutral-300 lg:col-span-3">
                    <span className="font-medium text-[#111214] dark:text-[#F4F4F2]">
                      Expected outcome:{' '}
                    </span>
                    {action.expectedImpact}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
