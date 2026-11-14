import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js/auto';
import type { ScoredEmployee } from '../types/employee';
import {
  computeOverviewMetrics,
  formatCompactGBP,
  formatGBP,
  groupStats,
} from '../utils/analytics';
import { BaseChart, getChartThemeTokens } from './BaseChart';
import { ChartCard } from './ChartCard';
import { KpiCard } from './KpiCard';

interface OverviewTabProps {
  employees: ScoredEmployee[];
  isDark: boolean;
}

export function OverviewTab({ employees, isDark }: OverviewTabProps) {
  const metrics = useMemo(() => computeOverviewMetrics(employees), [employees]);
  const tokens = useMemo(() => getChartThemeTokens(isDark), [isDark]);

  const deptStats = useMemo(
    () => groupStats(employees, (e) => e.Department).sort((a, b) => b.total - a.total),
    [employees]
  );

  const locationStats = useMemo(
    () => groupStats(employees, (e) => e.Location).sort((a, b) => b.total - a.total),
    [employees]
  );

  const genderStats = useMemo(
    () => groupStats(employees, (e) => e.Gender).sort((a, b) => b.total - a.total),
    [employees]
  );

  const empTypeStats = useMemo(
    () => groupStats(employees, (e) => e.EmploymentType).sort((a, b) => b.total - a.total),
    [employees]
  );

  const hiringTrendStats = useMemo(() => {
    const valid = employees.filter((e) => e.HireYear > 0);
    return groupStats(valid, (e) => String(e.HireYear)).sort(
      (a, b) => Number(a.label) - Number(b.label)
    );
  }, [employees]);

  const deptChartConfig = useMemo<ChartConfiguration<'bar'>>(
    () => ({
      type: 'bar',
      data: {
        labels: deptStats.map((d) => d.label),
        datasets: [
          {
            label: 'Active',
            data: deptStats.map((d) => d.active),
            backgroundColor: tokens.yellow,
            borderRadius: 4,
          },
          {
            label: 'Attrited',
            data: deptStats.map((d) => d.attrited),
            backgroundColor: tokens.orange,
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
            stacked: true,
            grid: { color: tokens.gridLine },
            ticks: { precision: 0 },
          },
          y: {
            stacked: true,
            grid: { display: false },
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
              afterBody: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const row = deptStats[idx];
                if (!row) return '';
                return `Total: ${row.total} · Attrition: ${row.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
      },
    }),
    [deptStats, tokens]
  );

  const locationChartConfig = useMemo<ChartConfiguration<'bar'>>(
    () => ({
      type: 'bar',
      data: {
        labels: locationStats.map((l) => l.label),
        datasets: [
          {
            label: 'Active',
            data: locationStats.map((l) => l.active),
            backgroundColor: tokens.charcoal,
            borderRadius: 4,
          },
          {
            label: 'Attrited',
            data: locationStats.map((l) => l.attrited),
            backgroundColor: tokens.orange,
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
            stacked: true,
            grid: { color: tokens.gridLine },
            ticks: { precision: 0 },
          },
          y: {
            stacked: true,
            grid: { display: false },
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
              afterBody: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const row = locationStats[idx];
                if (!row) return '';
                return `Total: ${row.total} · Attrition: ${row.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
      },
    }),
    [locationStats, tokens]
  );

  const genderChartConfig = useMemo<ChartConfiguration<'doughnut'>>(
    () => ({
      type: 'doughnut',
      data: {
        labels: genderStats.map((g) => g.label),
        datasets: [
          {
            data: genderStats.map((g) => g.total),
            backgroundColor: genderStats.map((g, idx) =>
              g.label === 'Female'
                ? tokens.yellow
                : g.label === 'Male'
                  ? tokens.charcoal
                  : idx % 2 === 0
                    ? tokens.orange
                    : tokens.slateBar
            ),
            borderColor: isDark ? '#16181C' : '#FFFFFF',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 14, usePointStyle: true, pointStyle: 'circle' },
          },
          tooltip: {
            backgroundColor: tokens.surfaceTooltip,
            borderColor: tokens.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (ctx) => {
                const row = genderStats[ctx.dataIndex];
                if (!row) return '';
                const pct = employees.length > 0 ? ((row.total / employees.length) * 100).toFixed(1) : '0.0';
                return ` ${row.label}: ${row.total} (${pct}%) · Attrition ${row.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
      },
    }),
    [genderStats, employees.length, isDark, tokens]
  );

  const empTypeChartConfig = useMemo<ChartConfiguration<'bar'>>(
    () => ({
      type: 'bar',
      data: {
        labels: empTypeStats.map((t) => t.label),
        datasets: [
          {
            label: 'Active',
            data: empTypeStats.map((t) => t.active),
            backgroundColor: tokens.yellow,
            borderRadius: 4,
          },
          {
            label: 'Attrited',
            data: empTypeStats.map((t) => t.attrited),
            backgroundColor: tokens.orange,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
          },
          y: {
            stacked: true,
            grid: { color: tokens.gridLine },
            ticks: { precision: 0 },
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
              afterBody: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const row = empTypeStats[idx];
                if (!row) return '';
                const pct = employees.length > 0 ? ((row.total / employees.length) * 100).toFixed(1) : '0.0';
                return `Share: ${pct}% · Attrition: ${row.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
      },
    }),
    [empTypeStats, employees.length, tokens]
  );

  const hiringChartConfig = useMemo<ChartConfiguration<'line'>>(
    () => ({
      type: 'line',
      data: {
        labels: hiringTrendStats.map((y) => y.label),
        datasets: [
          {
            label: 'Total Hired',
            data: hiringTrendStats.map((y) => y.total),
            borderColor: isDark ? tokens.yellow : '#111214',
            backgroundColor: isDark ? 'rgba(255, 200, 0, 0.14)' : 'rgba(255, 200, 0, 0.28)',
            fill: true,
            tension: 0.25,
            pointRadius: 3.5,
            pointBackgroundColor: tokens.yellow,
            pointBorderColor: '#111214',
            borderWidth: 2.2,
          },
          {
            label: 'Attrited from Cohort',
            data: hiringTrendStats.map((y) => y.attrited),
            borderColor: tokens.orange,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.25,
            pointRadius: 3,
            pointBackgroundColor: tokens.orange,
            borderWidth: 2,
            borderDash: [4, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            grid: { color: tokens.gridLine },
            ticks: { precision: 0 },
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
          },
        },
      },
    }),
    [hiringTrendStats, isDark, tokens]
  );

  const isEmpty = employees.length === 0;

  return (
    <div className="space-y-6">
      {/* 5 Overview KPIs */}
      <section aria-label="Overview key performance indicators">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Headcount"
            value={metrics.headcount.toLocaleString()}
            detail={`${metrics.activeCount} active · ${metrics.attritedCount} attrited`}
            accent="yellow"
          />
          <KpiCard
            label="Attrition Rate"
            value={`${metrics.attritionRate.toFixed(1)}%`}
            detail={`${metrics.attritedCount} departed employees`}
            accent={metrics.attritionRate >= 20 ? 'danger' : 'orange'}
          />
          <KpiCard
            label="Active Employees"
            value={metrics.activeCount.toLocaleString()}
            detail={
              metrics.headcount > 0
                ? `${((metrics.activeCount / metrics.headcount) * 100).toFixed(1)}% retained in cohort`
                : 'No records'
            }
            accent="positive"
          />
          <KpiCard
            label="Average Income"
            value={formatGBP(metrics.avgIncome)}
            detail={`${formatGBP(metrics.avgIncome * 12)} annualized avg`}
          />
          <KpiCard
            label="Monthly Payroll"
            value={formatCompactGBP(metrics.totalPayroll)}
            detail={`${formatGBP(metrics.activePayroll)} active monthly payroll`}
          />
        </div>
      </section>

      {/* Primary Distribution Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Headcount & Attrition by Department"
          subtitle="Active vs. attrited staff across Shell UK functions"
          heightClass="h-80"
          isEmpty={isEmpty}
        >
          <BaseChart
            config={deptChartConfig}
            isDark={isDark}
            ariaLabel="Headcount and attrition by department horizontal bar chart"
          />
        </ChartCard>

        <ChartCard
          title="Workforce by UK Location"
          subtitle="Site headcount split by active and attrited status"
          heightClass="h-80"
          isEmpty={isEmpty}
        >
          <BaseChart
            config={locationChartConfig}
            isDark={isDark}
            ariaLabel="Workforce by location horizontal bar chart"
          />
        </ChartCard>
      </div>

      {/* Secondary Breakdown + Hiring Trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ChartCard
          title="Gender Distribution"
          subtitle="Filtered workforce gender balance"
          heightClass="h-68"
          className="lg:col-span-3"
          isEmpty={isEmpty}
        >
          <BaseChart
            config={genderChartConfig}
            isDark={isDark}
            ariaLabel="Gender distribution doughnut chart"
          />
        </ChartCard>

        <ChartCard
          title="Employment Type"
          subtitle="Full-time, part-time, and contract mix"
          heightClass="h-68"
          className="lg:col-span-4"
          isEmpty={isEmpty}
        >
          <BaseChart
            config={empTypeChartConfig}
            isDark={isDark}
            ariaLabel="Employment type breakdown bar chart"
          />
        </ChartCard>

        <ChartCard
          title="Hiring Trend by Year"
          subtitle="Annual intake volume and cohort attrition"
          heightClass="h-68"
          className="lg:col-span-5"
          isEmpty={isEmpty || hiringTrendStats.length === 0}
        >
          <BaseChart
            config={hiringChartConfig}
            isDark={isDark}
            ariaLabel="Hiring trend by year line chart"
          />
        </ChartCard>
      </div>
    </div>
  );
}
