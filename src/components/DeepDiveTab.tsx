import { useMemo, useState } from 'react';
import type { ChartConfiguration } from 'chart.js/auto';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { ScoredEmployee } from '../types/employee';
import {
  AGE_BANDS,
  computeDeepDiveMetrics,
  EDUCATION_ORDER,
  formatGBP,
  formatTravelLabel,
  getAgeBand,
  getTenureBand,
  groupStats,
  HIGH_RISK_THRESHOLD,
  TENURE_BANDS,
  TRAVEL_ORDER,
} from '../utils/analytics';
import { BaseChart, getChartThemeTokens } from './BaseChart';
import { ChartCard } from './ChartCard';
import { KpiCard } from './KpiCard';

interface DeepDiveTabProps {
  employees: ScoredEmployee[];
  isDark: boolean;
  onSelectEmployee: (emp: ScoredEmployee) => void;
}

type SortKey =
  | 'EmployeeID'
  | 'FullName'
  | 'Department'
  | 'Location'
  | 'JobTitle'
  | 'JobLevel'
  | 'YearsAtCompany'
  | 'MonthlyIncome_GBP'
  | 'riskScore'
  | 'Attrition';

const PAGE_SIZE = 15;

function buildMixedAttritionConfig(
  labels: string[],
  stats: ReturnType<typeof groupStats>,
  tokens: ReturnType<typeof getChartThemeTokens>,
  barColor: string
): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'line',
          label: 'Attrition %',
          data: stats.map((s) => Number(s.attritionRate.toFixed(1))),
          borderColor: tokens.orange,
          backgroundColor: tokens.orange,
          borderWidth: 2.2,
          pointRadius: 4,
          tension: 0.25,
          yAxisID: 'yRate',
          order: 0,
        },
        {
          type: 'bar',
          label: 'Headcount',
          data: stats.map((s) => s.total),
          backgroundColor: barColor,
          borderRadius: 4,
          yAxisID: 'yCount',
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false } },
        yCount: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          grid: { color: tokens.gridLine },
          ticks: { precision: 0 },
          title: { display: true, text: 'Employees', font: { size: 11 } },
        },
        yRate: {
          type: 'linear',
          position: 'right',
          beginAtZero: true,
          suggestedMax: 45,
          grid: { drawOnChartArea: false },
          ticks: { callback: (v) => `${v}%` },
          title: { display: true, text: 'Attrition %', font: { size: 11 } },
        },
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: { boxWidth: 12, usePointStyle: true },
        },
        tooltip: {
          backgroundColor: tokens.surfaceTooltip,
          borderColor: tokens.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            afterBody: (items) => {
              const idx = items[0]?.dataIndex ?? 0;
              const s = stats[idx];
              if (!s) return '';
              return `Active: ${s.active} · Attrited: ${s.attrited}`;
            },
          },
        },
      },
    },
  };
}

export function DeepDiveTab({
  employees,
  isDark,
  onSelectEmployee,
}: DeepDiveTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('riskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const metrics = useMemo(() => computeDeepDiveMetrics(employees), [employees]);
  const tokens = useMemo(() => getChartThemeTokens(isDark), [isDark]);

  // 1. Age Bands
  const ageStats = useMemo(
    () => groupStats(employees, (e) => getAgeBand(e.Age), AGE_BANDS),
    [employees]
  );

  // 2. Tenure Bands
  const tenureStats = useMemo(
    () => groupStats(employees, (e) => getTenureBand(e.YearsAtCompany), TENURE_BANDS),
    [employees]
  );

  // 3. Income by Level (Active vs Attrited)
  const levelIncomeStats = useMemo(() => {
    const levels = [1, 2, 3, 4, 5];
    return levels.map((lvl) => {
      const inLevel = employees.filter((e) => e.JobLevel === lvl);
      const active = inLevel.filter((e) => e.Attrition === 'No');
      const attrited = inLevel.filter((e) => e.Attrition === 'Yes');
      const avgAll =
        inLevel.length > 0
          ? inLevel.reduce((s, e) => s + e.MonthlyIncome_GBP, 0) / inLevel.length
          : 0;
      const avgActive =
        active.length > 0
          ? active.reduce((s, e) => s + e.MonthlyIncome_GBP, 0) / active.length
          : 0;
      const avgAttrited =
        attrited.length > 0
          ? attrited.reduce((s, e) => s + e.MonthlyIncome_GBP, 0) / attrited.length
          : 0;
      return {
        label: `Level ${lvl}`,
        count: inLevel.length,
        avgAll,
        avgActive,
        avgAttrited,
      };
    });
  }, [employees]);

  // 4. Income by Department
  const deptIncomeStats = useMemo(
    () =>
      groupStats(employees, (e) => e.Department)
        .filter((d) => d.total > 0)
        .sort((a, b) => b.avgIncome - a.avgIncome),
    [employees]
  );

  // 5. Education & Attrition
  const educationStats = useMemo(() => {
    const presentExtra = Array.from(new Set(employees.map((e) => e.Education))).filter(
      (ed) => !EDUCATION_ORDER.includes(ed)
    );
    return groupStats(employees, (e) => e.Education, [...EDUCATION_ORDER, ...presentExtra]);
  }, [employees]);

  // 6. Travel & Attrition
  const travelStats = useMemo(
    () => groupStats(employees, (e) => e.BusinessTravel, TRAVEL_ORDER),
    [employees]
  );

  const ageChartConfig = useMemo(
    () =>
      buildMixedAttritionConfig(
        ageStats.map((a) => a.label),
        ageStats,
        tokens,
        tokens.yellow
      ),
    [ageStats, tokens]
  );

  const tenureChartConfig = useMemo(
    () =>
      buildMixedAttritionConfig(
        tenureStats.map((t) => t.label),
        tenureStats,
        tokens,
        tokens.charcoal
      ),
    [tenureStats, tokens]
  );

  const levelIncomeChartConfig = useMemo<ChartConfiguration<'bar'>>(
    () => ({
      type: 'bar',
      data: {
        labels: levelIncomeStats.map((l) => l.label),
        datasets: [
          {
            label: 'Active Avg Income',
            data: levelIncomeStats.map((l) => Math.round(l.avgActive)),
            backgroundColor: tokens.yellow,
            borderRadius: 4,
          },
          {
            label: 'Attrited Avg Income',
            data: levelIncomeStats.map((l) => Math.round(l.avgAttrited)),
            backgroundColor: tokens.orange,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: tokens.gridLine },
            ticks: { callback: (v) => `£${Number(v).toLocaleString()}` },
          },
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'rectRounded' },
          },
          tooltip: {
            backgroundColor: tokens.surfaceTooltip,
            borderColor: tokens.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatGBP(Number(ctx.raw))}`,
              afterBody: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const row = levelIncomeStats[idx];
                return row ? `Headcount in band: ${row.count}` : '';
              },
            },
          },
        },
      },
    }),
    [levelIncomeStats, tokens]
  );

  const deptIncomeChartConfig = useMemo<ChartConfiguration<'bar'>>(
    () => ({
      type: 'bar',
      data: {
        labels: deptIncomeStats.map((d) => d.label),
        datasets: [
          {
            label: 'Avg Monthly Income (GBP)',
            data: deptIncomeStats.map((d) => Math.round(d.avgIncome)),
            backgroundColor: tokens.charcoal,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: tokens.gridLine },
            ticks: { callback: (v) => `£${Number(v).toLocaleString()}` },
          },
          y: { grid: { display: false } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tokens.surfaceTooltip,
            borderColor: tokens.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` Avg Pay: ${formatGBP(Number(ctx.raw))}/mo`,
              afterLabel: (ctx) => {
                const row = deptIncomeStats[ctx.dataIndex];
                return row ? `Staff: ${row.total} · Attrition: ${row.attritionRate.toFixed(1)}%` : '';
              },
            },
          },
        },
      },
    }),
    [deptIncomeStats, tokens]
  );

  const educationChartConfig = useMemo(
    () =>
      buildMixedAttritionConfig(
        educationStats.map((e) => e.label),
        educationStats,
        tokens,
        tokens.yellow
      ),
    [educationStats, tokens]
  );

  const travelChartConfig = useMemo(
    () =>
      buildMixedAttritionConfig(
        travelStats.map((t) => formatTravelLabel(t.label)),
        travelStats,
        tokens,
        tokens.charcoal
      ),
    [travelStats, tokens]
  );

  // 7. Income vs Tenure Scatter
  const scatterConfig = useMemo<ChartConfiguration<'scatter'>>(() => {
    const activePts = employees
      .filter((e) => e.Attrition === 'No')
      .map((e) => ({ x: e.YearsAtCompany, y: e.MonthlyIncome_GBP, emp: e }));
    const attritedPts = employees
      .filter((e) => e.Attrition === 'Yes')
      .map((e) => ({ x: e.YearsAtCompany, y: e.MonthlyIncome_GBP, emp: e }));

    return {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Active',
            data: activePts,
            backgroundColor: isDark ? 'rgba(255, 200, 0, 0.72)' : 'rgba(24, 24, 27, 0.65)',
            borderColor: isDark ? '#FFC800' : '#111214',
            borderWidth: 1,
            pointRadius: 4.5,
            pointHoverRadius: 6.5,
          },
          {
            label: 'Attrited',
            data: attritedPts,
            backgroundColor: 'rgba(245, 130, 32, 0.85)',
            borderColor: '#DC2626',
            borderWidth: 1.2,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: tokens.gridLine },
            title: { display: true, text: 'Years at Company', font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: tokens.gridLine },
            ticks: { callback: (v) => `£${Number(v).toLocaleString()}` },
            title: { display: true, text: 'Monthly Income (GBP)', font: { size: 11 } },
          },
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle' },
          },
          tooltip: {
            backgroundColor: tokens.surfaceTooltip,
            borderColor: tokens.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (ctx) => {
                const raw = ctx.raw as { emp?: ScoredEmployee };
                const emp = raw?.emp;
                if (!emp) return '';
                return [
                  `${emp.FullName} (${emp.EmployeeID})`,
                  `${emp.JobTitle} · L${emp.JobLevel} · ${emp.Department}`,
                  `Income: ${formatGBP(emp.MonthlyIncome_GBP)}/mo · Tenure: ${emp.YearsAtCompany} yrs`,
                  `Attrition: ${emp.Attrition} · Risk Score: ${emp.riskScore}/100`,
                ];
              },
            },
          },
        },
      },
    };
  }, [employees, isDark, tokens]);

  // Searchable & Sortable Employee Table
  const searchedAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matched = q
      ? employees.filter(
          (e) =>
            e.EmployeeID.toLowerCase().includes(q) ||
            e.FullName.toLowerCase().includes(q) ||
            e.Department.toLowerCase().includes(q) ||
            e.JobTitle.toLowerCase().includes(q) ||
            e.Location.toLowerCase().includes(q)
        )
      : employees;

    const sorted = [...matched].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [employees, searchQuery, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(searchedAndSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return searchedAndSorted.slice(start, start + PAGE_SIZE);
  }, [searchedAndSorted, safePage]);

  const handleSort = (key: SortKey) => {
    setPage(1);
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(
        key === 'MonthlyIncome_GBP' ||
          key === 'YearsAtCompany' ||
          key === 'JobLevel' ||
          key === 'riskScore'
          ? 'desc'
          : 'asc'
      );
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#F58220]" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#F58220]" aria-hidden="true" />
    );
  };

  const isEmpty = employees.length === 0;

  return (
    <div className="space-y-6">
      {/* 5 Deep Dive KPIs */}
      <section aria-label="Deep dive workforce indicators">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Average Tenure"
            value={`${metrics.avgTenure.toFixed(1)} yrs`}
            detail="Mean company tenure in selection"
          />
          <KpiCard
            label="Female Share"
            value={`${metrics.femaleShare.toFixed(1)}%`}
            detail={`${metrics.femaleCount} of ${employees.length} employees`}
            accent="yellow"
          />
          <KpiCard
            label="Non-Full-Time Share"
            value={`${metrics.nonFullTimeShare.toFixed(1)}%`}
            detail={`${metrics.nonFullTimeCount} part-time & contract staff`}
          />
          <KpiCard
            label="Years Since Promotion"
            value={`${metrics.avgYearsSincePromo.toFixed(1)} yrs`}
            detail="Average time since last grade advance"
            accent="orange"
          />
          <KpiCard
            label="High Flight-Risk"
            value={metrics.highRiskCount.toLocaleString()}
            detail={`${metrics.highRiskShareOfActive.toFixed(1)}% of ${metrics.activeTotal} active staff (>=${HIGH_RISK_THRESHOLD} pts)`}
            accent={metrics.highRiskCount > 0 ? 'danger' : 'positive'}
          />
        </div>
      </section>

      {/* Age & Tenure Bands with Attrition */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Age Bands & Attrition Rate"
          subtitle="Headcount volume paired with band attrition percentage"
          heightClass="h-72"
          isEmpty={isEmpty}
        >
          <BaseChart
            config={ageChartConfig}
            isDark={isDark}
            ariaLabel="Age bands headcount and attrition chart"
          />
        </ChartCard>

        <ChartCard
          title="Tenure Bands & Attrition Rate"
          subtitle="Retention profile across years of Shell service"
          heightClass="h-72"
          isEmpty={isEmpty}
        >
          <BaseChart
            config={tenureChartConfig}
            isDark={isDark}
            ariaLabel="Tenure bands headcount and attrition chart"
          />
        </ChartCard>
      </div>

      {/* Income by Level & Income by Department */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Monthly Income by Job Level"
          subtitle="Active vs. attrited average pay across Job Levels 1–5"
          heightClass="h-76"
          isEmpty={isEmpty}
        >
          <BaseChart
            config={levelIncomeChartConfig}
            isDark={isDark}
            ariaLabel="Monthly income by job level bar chart"
          />
        </ChartCard>

        <ChartCard
          title="Average Monthly Income by Department"
          subtitle="Mean GBP monthly salary ranked by function"
          heightClass="h-76"
          isEmpty={isEmpty}
        >
          <BaseChart
            config={deptIncomeChartConfig}
            isDark={isDark}
            ariaLabel="Average monthly income by department bar chart"
          />
        </ChartCard>
      </div>

      {/* Education, Travel & Scatter */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ChartCard
          title="Education & Attrition"
          subtitle="Headcount and attrition rate by degree level"
          heightClass="h-72"
          className="lg:col-span-4"
          isEmpty={isEmpty}
        >
          <BaseChart
            config={educationChartConfig}
            isDark={isDark}
            ariaLabel="Education breakdown and attrition chart"
          />
        </ChartCard>

        <ChartCard
          title="Business Travel & Attrition"
          subtitle="Impact of travel cadence on turnover"
          heightClass="h-72"
          className="lg:col-span-4"
          isEmpty={isEmpty}
        >
          <BaseChart
            config={travelChartConfig}
            isDark={isDark}
            ariaLabel="Business travel and attrition chart"
          />
        </ChartCard>

        <ChartCard
          title="Income vs. Tenure Scatter"
          subtitle="Each point represents an employee (hover for details)"
          heightClass="h-72"
          className="lg:col-span-4"
          isEmpty={isEmpty}
        >
          <BaseChart
            config={scatterConfig}
            isDark={isDark}
            ariaLabel="Monthly income versus company tenure scatter plot"
          />
        </ChartCard>
      </div>

      {/* Searchable, Sortable Employee Table */}
      <section className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#16181C]">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-5 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[#111214] dark:text-[#F4F4F2]">
              Employee Directory & Risk Register
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Click any row to inspect full compensation and flight-risk score breakdown ·{' '}
              <span className="font-mono tabular-nums">{searchedAndSorted.length}</span> matching records
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, ID, role, site..."
              aria-label="Search employee table"
              className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm text-[#111214] placeholder:text-neutral-400 focus:border-[#F58220] focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-[#1E2126] dark:text-[#F4F4F2] dark:focus:border-[#FFC800]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 text-xs font-medium text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
                <th className="px-4 py-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('FullName')}
                    className="inline-flex items-center gap-1 font-medium hover:text-[#111214] dark:hover:text-white"
                  >
                    Employee {renderSortIcon('FullName')}
                  </button>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('Department')}
                    className="inline-flex items-center gap-1 font-medium hover:text-[#111214] dark:hover:text-white"
                  >
                    Department {renderSortIcon('Department')}
                  </button>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('Location')}
                    className="inline-flex items-center gap-1 font-medium hover:text-[#111214] dark:hover:text-white"
                  >
                    Location {renderSortIcon('Location')}
                  </button>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('JobTitle')}
                    className="inline-flex items-center gap-1 font-medium hover:text-[#111214] dark:hover:text-white"
                  >
                    Job Title {renderSortIcon('JobTitle')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('JobLevel')}
                    className="inline-flex items-center justify-end gap-1 font-medium hover:text-[#111214] dark:hover:text-white"
                  >
                    Level {renderSortIcon('JobLevel')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('YearsAtCompany')}
                    className="inline-flex items-center justify-end gap-1 font-medium hover:text-[#111214] dark:hover:text-white"
                  >
                    Tenure {renderSortIcon('YearsAtCompany')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('MonthlyIncome_GBP')}
                    className="inline-flex items-center justify-end gap-1 font-medium hover:text-[#111214] dark:hover:text-white"
                  >
                    Income {renderSortIcon('MonthlyIncome_GBP')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('riskScore')}
                    className="inline-flex items-center justify-end gap-1 font-medium hover:text-[#111214] dark:hover:text-white"
                  >
                    Flight Risk {renderSortIcon('riskScore')}
                  </button>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('Attrition')}
                    className="inline-flex items-center gap-1 font-medium hover:text-[#111214] dark:hover:text-white"
                  >
                    Status {renderSortIcon('Attrition')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400"
                  >
                    No employee records match your current filters or search query.
                  </td>
                </tr>
              ) : (
                pageRows.map((emp) => {
                  const riskColor =
                    emp.riskTier === 'High'
                      ? 'text-[#DC2626] dark:text-[#F87171]'
                      : emp.riskTier === 'Elevated'
                        ? 'text-[#D9680D] dark:text-[#F58220]'
                        : 'text-neutral-600 dark:text-neutral-300';

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
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-[#111214] dark:text-[#F4F4F2]">
                          {emp.FullName}
                        </div>
                        <div className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                          {emp.EmployeeID} · {emp.EmploymentType}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        {emp.Department}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {emp.Location}
                      </td>
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        {emp.JobTitle}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                        L{emp.JobLevel}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        {emp.YearsAtCompany} yrs
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium tabular-nums text-[#111214] dark:text-[#F4F4F2] whitespace-nowrap">
                        {formatGBP(emp.MonthlyIncome_GBP)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${riskColor}`}>
                        {emp.riskScore} · {emp.riskTier}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-xs font-medium ${
                            emp.Attrition === 'Yes'
                              ? 'text-[#DC2626] dark:text-[#F87171]'
                              : 'text-[#15803D] dark:text-[#4ADE80]'
                          }`}
                        >
                          {emp.Attrition === 'Yes' ? 'Attrited' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {searchedAndSorted.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-5 py-3.5 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <div>
              Page <span className="font-mono font-medium tabular-nums">{safePage}</span> of{' '}
              <span className="font-mono font-medium tabular-nums">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-neutral-200 px-3 font-medium text-[#111214] transition-colors hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-neutral-200 px-3 font-medium text-[#111214] transition-colors hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
