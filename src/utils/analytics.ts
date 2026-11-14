import type {
  EmployeeRecord,
  FilterState,
  FindingItem,
  RecommendedAction,
  RiskFactorBreakdown,
  RiskTier,
  ScoredEmployee,
} from '../types/employee';

export interface RubricRuleDefinition {
  id: string;
  criterion: string;
  maxPoints: number;
  ruleSummary: string;
}

export const HIGH_RISK_THRESHOLD = 60;

export const RISK_RUBRIC: RubricRuleDefinition[] = [
  {
    id: 'promotion',
    criterion: 'Promotion Stagnation',
    maxPoints: 25,
    ruleSummary: '5+ yrs since promotion = +25 pts; 3–4 yrs = +15 pts; 2 yrs = +8 pts',
  },
  {
    id: 'travel',
    criterion: 'Business Travel Strain',
    maxPoints: 20,
    ruleSummary: 'Travel Frequently = +20 pts; Travel Rarely = +8 pts; Non-Travel = 0 pts',
  },
  {
    id: 'pay',
    criterion: 'Pay vs. Job Level Median',
    maxPoints: 20,
    ruleSummary: '>=15% below level median = +20 pts; 5%–14.9% below = +10 pts',
  },
  {
    id: 'commute',
    criterion: 'Commute Distance',
    maxPoints: 15,
    ruleSummary: '>=30 km from site = +15 pts; 15–29 km = +8 pts',
  },
  {
    id: 'tenure',
    criterion: 'Tenure & Manager Stability',
    maxPoints: 20,
    ruleSummary: '<=2 yrs tenure OR (5+ yrs in role & 3+ yrs unpromoted) = +12 pts; <=1 yr w/ manager = +8 pts',
  },
];

export function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatCompactGBP(amount: number): string {
  if (amount >= 1_000_000) {
    return `£${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 100_000) {
    return `£${(amount / 1_000).toFixed(0)}k`;
  }
  return formatGBP(amount);
}

export function formatTravelLabel(travel: string): string {
  if (travel === 'Travel_Frequently') return 'Frequent Travel';
  if (travel === 'Travel_Rarely') return 'Rare Travel';
  if (travel === 'Non-Travel') return 'Non-Travel';
  return travel.replace(/_/g, ' ');
}

export function computeLevelMedians(records: EmployeeRecord[]): Record<number, number> {
  const byLevel = new Map<number, number[]>();
  for (const r of records) {
    const arr = byLevel.get(r.JobLevel) ?? [];
    arr.push(r.MonthlyIncome_GBP);
    byLevel.set(r.JobLevel, arr);
  }

  const medians: Record<number, number> = {};
  for (const [level, values] of byLevel.entries()) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medians[level] =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }
  return medians;
}

export function getRiskTier(score: number): RiskTier {
  if (score >= 60) return 'High';
  if (score >= 40) return 'Elevated';
  if (score >= 20) return 'Moderate';
  return 'Low';
}

export function scoreEmployees(
  records: EmployeeRecord[],
  levelMedians: Record<number, number>
): ScoredEmployee[] {
  return records.map((emp) => {
    const breakdown: RiskFactorBreakdown[] = [];

    // 1. Promotion Stagnation (max 25)
    let promoPts = 0;
    let promoDetail = `${emp.YearsSinceLastPromotion} yr(s) since last promotion`;
    if (emp.YearsSinceLastPromotion >= 5) {
      promoPts = 25;
      promoDetail = `${emp.YearsSinceLastPromotion} yrs since promotion (5+ yr stall)`;
    } else if (emp.YearsSinceLastPromotion >= 3) {
      promoPts = 15;
      promoDetail = `${emp.YearsSinceLastPromotion} yrs since promotion (3–4 yr band)`;
    } else if (emp.YearsSinceLastPromotion >= 2) {
      promoPts = 8;
      promoDetail = `2 yrs since promotion`;
    }
    breakdown.push({
      criterion: 'Promotion Stagnation',
      points: promoPts,
      maxPoints: 25,
      detail: promoDetail,
    });

    // 2. Business Travel (max 20)
    let travelPts = 0;
    if (emp.BusinessTravel === 'Travel_Frequently') travelPts = 20;
    else if (emp.BusinessTravel === 'Travel_Rarely') travelPts = 8;
    breakdown.push({
      criterion: 'Business Travel Strain',
      points: travelPts,
      maxPoints: 20,
      detail: formatTravelLabel(emp.BusinessTravel),
    });

    // 3. Pay vs Job Level Median (max 20)
    const levelMedian = levelMedians[emp.JobLevel] || emp.MonthlyIncome_GBP || 1;
    const incomeVsMedianPct = ((emp.MonthlyIncome_GBP - levelMedian) / levelMedian) * 100;
    const gapBelowPct = -incomeVsMedianPct;
    let payPts = 0;
    let payDetail = `${incomeVsMedianPct >= 0 ? '+' : ''}${incomeVsMedianPct.toFixed(1)}% vs L${emp.JobLevel} median (${formatGBP(levelMedian)})`;
    if (gapBelowPct >= 15) {
      payPts = 20;
    } else if (gapBelowPct >= 5) {
      payPts = 10;
    }
    breakdown.push({
      criterion: 'Pay vs. Level Median',
      points: payPts,
      maxPoints: 20,
      detail: payDetail,
    });

    // 4. Commute Distance (max 15)
    let commutePts = 0;
    if (emp.DistanceFromHome_km >= 30) commutePts = 15;
    else if (emp.DistanceFromHome_km >= 15) commutePts = 8;
    breakdown.push({
      criterion: 'Commute Distance',
      points: commutePts,
      maxPoints: 15,
      detail: `${emp.DistanceFromHome_km} km commute`,
    });

    // 5. Tenure & Manager Stability (max 20)
    let tenurePts = 0;
    const tenureNotes: string[] = [];
    if (emp.YearsAtCompany <= 2) {
      tenurePts += 12;
      tenureNotes.push(`early tenure (${emp.YearsAtCompany} yr)`);
    } else if (emp.YearsInCurrentRole >= 5 && emp.YearsSinceLastPromotion >= 3) {
      tenurePts += 12;
      tenureNotes.push(`${emp.YearsInCurrentRole} yrs in role without progression`);
    }
    if (emp.YearsWithCurrManager <= 1) {
      tenurePts += 8;
      tenureNotes.push(`new manager (${emp.YearsWithCurrManager} yr)`);
    }
    breakdown.push({
      criterion: 'Tenure & Manager Stability',
      points: tenurePts,
      maxPoints: 20,
      detail: tenureNotes.length > 0 ? tenureNotes.join('; ') : `${emp.YearsAtCompany} yrs tenure, ${emp.YearsWithCurrManager} yrs w/ manager`,
    });

    const totalScore = Math.min(
      100,
      breakdown.reduce((sum, item) => sum + item.points, 0)
    );

    const topDrivers = [...breakdown]
      .filter((b) => b.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 3)
      .map((b) => `${b.criterion} (+${b.points})`);

    return {
      ...emp,
      riskScore: totalScore,
      riskTier: getRiskTier(totalScore),
      levelMedianIncome: levelMedian,
      incomeVsMedianPct,
      riskBreakdown: breakdown,
      topDrivers,
    };
  });
}

export function filterEmployees(
  records: ScoredEmployee[],
  filters: FilterState
): ScoredEmployee[] {
  return records.filter((r) => {
    if (filters.department !== 'All' && r.Department !== filters.department) return false;
    if (filters.location !== 'All' && r.Location !== filters.location) return false;
    if (filters.employmentType !== 'All' && r.EmploymentType !== filters.employmentType) return false;
    if (filters.gender !== 'All' && r.Gender !== filters.gender) return false;
    if (filters.attrition !== 'All' && r.Attrition !== filters.attrition) return false;
    return true;
  });
}

export interface GroupAttritionStat {
  label: string;
  total: number;
  active: number;
  attrited: number;
  attritionRate: number;
  avgIncome: number;
}

export function groupStats(
  records: ScoredEmployee[],
  keyFn: (r: ScoredEmployee) => string,
  orderedKeys?: string[]
): GroupAttritionStat[] {
  const map = new Map<string, { total: number; active: number; attrited: number; incomeSum: number }>();

  if (orderedKeys) {
    for (const k of orderedKeys) {
      map.set(k, { total: 0, active: 0, attrited: 0, incomeSum: 0 });
    }
  }

  for (const r of records) {
    const key = keyFn(r);
    const cur = map.get(key) ?? { total: 0, active: 0, attrited: 0, incomeSum: 0 };
    cur.total += 1;
    if (r.Attrition === 'Yes') cur.attrited += 1;
    else cur.active += 1;
    cur.incomeSum += r.MonthlyIncome_GBP;
    map.set(key, cur);
  }

  const result: GroupAttritionStat[] = [];
  for (const [label, v] of map.entries()) {
    result.push({
      label,
      total: v.total,
      active: v.active,
      attrited: v.attrited,
      attritionRate: v.total > 0 ? (v.attrited / v.total) * 100 : 0,
      avgIncome: v.total > 0 ? v.incomeSum / v.total : 0,
    });
  }
  return result;
}

export function getAgeBand(age: number): string {
  if (age < 25) return '<25';
  if (age <= 34) return '25–34';
  if (age <= 44) return '35–44';
  if (age <= 54) return '45–54';
  return '55+';
}

export function getTenureBand(years: number): string {
  if (years <= 2) return '0–2 yrs';
  if (years <= 5) return '3–5 yrs';
  if (years <= 10) return '6–10 yrs';
  if (years <= 15) return '11–15 yrs';
  return '16+ yrs';
}

export const AGE_BANDS = ['<25', '25–34', '35–44', '45–54', '55+'];
export const TENURE_BANDS = ['0–2 yrs', '3–5 yrs', '6–10 yrs', '11–15 yrs', '16+ yrs'];
export const EDUCATION_ORDER = ['Below College', 'College', "Bachelor's", "Master's", 'Doctorate'];
export const TRAVEL_ORDER = ['Non-Travel', 'Travel_Rarely', 'Travel_Frequently'];

export function computeOverviewMetrics(records: ScoredEmployee[]) {
  const headcount = records.length;
  const attritedRecords = records.filter((r) => r.Attrition === 'Yes');
  const activeRecords = records.filter((r) => r.Attrition === 'No');
  const attritedCount = attritedRecords.length;
  const activeCount = activeRecords.length;
  const attritionRate = headcount > 0 ? (attritedCount / headcount) * 100 : 0;
  const totalPayroll = records.reduce((s, r) => s + r.MonthlyIncome_GBP, 0);
  const activePayroll = activeRecords.reduce((s, r) => s + r.MonthlyIncome_GBP, 0);
  const avgIncome = headcount > 0 ? totalPayroll / headcount : 0;

  return {
    headcount,
    attritedCount,
    activeCount,
    attritionRate,
    avgIncome,
    totalPayroll,
    activePayroll,
  };
}

export function computeDeepDiveMetrics(records: ScoredEmployee[]) {
  const headcount = records.length;
  const activeRecords = records.filter((r) => r.Attrition === 'No');
  const avgTenure =
    headcount > 0 ? records.reduce((s, r) => s + r.YearsAtCompany, 0) / headcount : 0;
  const femaleCount = records.filter((r) => r.Gender === 'Female').length;
  const femaleShare = headcount > 0 ? (femaleCount / headcount) * 100 : 0;
  const nonFullTimeCount = records.filter((r) => r.EmploymentType !== 'Full-Time').length;
  const nonFullTimeShare = headcount > 0 ? (nonFullTimeCount / headcount) * 100 : 0;
  const avgYearsSincePromo =
    headcount > 0 ? records.reduce((s, r) => s + r.YearsSinceLastPromotion, 0) / headcount : 0;
  const highRiskActive = activeRecords.filter((r) => r.riskScore >= HIGH_RISK_THRESHOLD);
  const highRiskCount = highRiskActive.length;
  const highRiskShareOfActive =
    activeRecords.length > 0 ? (highRiskCount / activeRecords.length) * 100 : 0;

  return {
    avgTenure,
    femaleCount,
    femaleShare,
    nonFullTimeCount,
    nonFullTimeShare,
    avgYearsSincePromo,
    highRiskCount,
    highRiskShareOfActive,
    activeTotal: activeRecords.length,
  };
}

export function generateInsights(
  filtered: ScoredEmployee[],
  fullDataset: ScoredEmployee[]
): {
  findings: FindingItem[];
  watchlist: ScoredEmployee[];
  actions: RecommendedAction[];
} {
  if (filtered.length === 0) {
    return {
      findings: [],
      watchlist: [],
      actions: [],
    };
  }

  const findings: FindingItem[] = [];
  const actions: RecommendedAction[] = [];

  const overview = computeOverviewMetrics(filtered);
  const baselineRate =
    fullDataset.length > 0
      ? (fullDataset.filter((r) => r.Attrition === 'Yes').length / fullDataset.length) * 100
      : 0;

  // 1. Overall / Benchmark Attrition Finding
  const rateDelta = overview.attritionRate - baselineRate;
  const deltaText =
    filtered.length === fullDataset.length
      ? `${overview.attritedCount} of ${overview.headcount} employees have left across the UK footprint.`
      : `${Math.abs(rateDelta).toFixed(1)} pp ${rateDelta >= 0 ? 'above' : 'below'} the all-company baseline (${baselineRate.toFixed(1)}%).`;

  findings.push({
    id: 'attrition-benchmark',
    category: 'Attrition Overview',
    severity: overview.attritionRate >= 22 ? 'critical' : overview.attritionRate >= 15 ? 'warning' : 'positive',
    headline: `Cohort attrition stands at ${overview.attritionRate.toFixed(1)}% (${overview.attritedCount} leavers)`,
    detail: deltaText,
    metricValue: `${overview.attritionRate.toFixed(1)}%`,
  });

  // 2. Department Hotspot
  const deptStats = groupStats(filtered, (r) => r.Department).filter((d) => d.total >= 3);
  const sortedDeptsByRate = [...deptStats].sort((a, b) => b.attritionRate - a.attritionRate);
  const topDept = sortedDeptsByRate[0];
  if (topDept) {
    findings.push({
      id: 'dept-hotspot',
      category: 'Department Concentration',
      severity: topDept.attritionRate >= 25 ? 'critical' : topDept.attritionRate >= 18 ? 'warning' : 'neutral',
      headline: `${topDept.label} leads attrition at ${topDept.attritionRate.toFixed(1)}%`,
      detail: `${topDept.attrited} leavers out of ${topDept.total} staff (${topDept.active} currently active, avg pay ${formatGBP(topDept.avgIncome)}/mo).`,
      metricValue: `${topDept.attrited}/${topDept.total}`,
    });
  }

  // 3. Location Hotspot
  const locStats = groupStats(filtered, (r) => r.Location).filter((l) => l.total >= 3);
  const topLoc = [...locStats].sort((a, b) => b.attritionRate - a.attritionRate)[0];
  if (topLoc) {
    findings.push({
      id: 'location-hotspot',
      category: 'Site Dynamics',
      severity: topLoc.attritionRate >= 25 ? 'warning' : 'neutral',
      headline: `${topLoc.label} records the highest site turnover (${topLoc.attritionRate.toFixed(1)}%)`,
      detail: `${topLoc.attrited} departures among ${topLoc.total} employees assigned to ${topLoc.label}.`,
      metricValue: `${topLoc.attritionRate.toFixed(1)}%`,
    });
  }

  // 4. Promotion Stagnation vs Attrition
  const stalled = filtered.filter((r) => r.YearsSinceLastPromotion >= 3);
  const recentPromo = filtered.filter((r) => r.YearsSinceLastPromotion < 3);
  const stalledRate =
    stalled.length > 0 ? (stalled.filter((r) => r.Attrition === 'Yes').length / stalled.length) * 100 : 0;
  const recentRate =
    recentPromo.length > 0
      ? (recentPromo.filter((r) => r.Attrition === 'Yes').length / recentPromo.length) * 100
      : 0;
  if (stalled.length > 0) {
    findings.push({
      id: 'promo-stagnation',
      category: 'Career Progression',
      severity: stalledRate > recentRate + 4 ? 'warning' : 'neutral',
      headline: `${stalled.length} staff have waited 3+ years for promotion (${stalledRate.toFixed(1)}% attrition)`,
      detail: `Employees promoted within 3 years show ${recentRate.toFixed(1)}% attrition across this selection.`,
      metricValue: `${stalled.length} staff`,
    });
  }

  // 5. Pay & Travel Dynamics
  const underpaidActive = filtered.filter((r) => r.Attrition === 'No' && r.incomeVsMedianPct <= -10);
  const freqTravel = filtered.filter((r) => r.BusinessTravel === 'Travel_Frequently');
  const freqTravelRate =
    freqTravel.length > 0
      ? (freqTravel.filter((r) => r.Attrition === 'Yes').length / freqTravel.length) * 100
      : 0;
  findings.push({
    id: 'comp-travel',
    category: 'Pay & Travel Exposure',
    severity: underpaidActive.length >= 10 || freqTravelRate >= 22 ? 'warning' : 'neutral',
    headline: `${underpaidActive.length} active staff sit >10% below Job Level median pay`,
    detail:
      freqTravel.length > 0
        ? `Frequent travellers (n=${freqTravel.length}) show a ${freqTravelRate.toFixed(1)}% attrition rate.`
        : `No frequent travellers present in current filter slice.`,
    metricValue: `${underpaidActive.length} below band`,
  });

  // 6. Active Flight-Risk Concentration
  const active = filtered.filter((r) => r.Attrition === 'No');
  const highRiskActive = active.filter((r) => r.riskScore >= HIGH_RISK_THRESHOLD);
  const elevatedActive = active.filter((r) => r.riskScore >= 40 && r.riskScore < HIGH_RISK_THRESHOLD);
  findings.push({
    id: 'flight-risk-summary',
    category: 'Retention Forecast',
    severity: highRiskActive.length > 0 ? 'critical' : 'positive',
    headline: `${highRiskActive.length} active employees score High Flight-Risk (>=60/100)`,
    detail: `Another ${elevatedActive.length} active employees fall in the Elevated band (40–59 pts) out of ${active.length} active staff.`,
    metricValue: `${highRiskActive.length} high risk`,
  });

  // Top-10 Watchlist (Active employees sorted by riskScore desc, deterministic tie-breakers)
  const watchlist = [...active]
    .sort((a, b) => {
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
      if (b.YearsSinceLastPromotion !== a.YearsSinceLastPromotion) {
        return b.YearsSinceLastPromotion - a.YearsSinceLastPromotion;
      }
      return a.incomeVsMedianPct - b.incomeVsMedianPct;
    })
    .slice(0, 10);

  // Recommended Actions (dynamically parameterized from filtered cohort)
  if (highRiskActive.length > 0) {
    const riskDeptCounts = groupStats(highRiskActive, (r) => r.Department).sort(
      (a, b) => b.total - a.total
    );
    const leadRiskDept = riskDeptCounts[0]?.label ?? 'priority teams';
    actions.push({
      id: 'act-stay-interviews',
      priority: 'Immediate',
      title: 'Conduct targeted stay interviews for High Flight-Risk cohort',
      targetGroup: `${highRiskActive.length} active employees (led by ${leadRiskDept})`,
      rationale: `Active staff scoring >=60 combine multiple attrition catalysts such as stalled promotion timelines, frequent travel, and sub-median compensation.`,
      expectedImpact: 'Reduces near-term voluntary departures among critical operational roles.',
    });
  }

  if (underpaidActive.length > 0) {
    const estMonthlyCost = underpaidActive.reduce(
      (sum, r) => sum + Math.max(0, r.levelMedianIncome * 0.95 - r.MonthlyIncome_GBP),
      0
    );
    actions.push({
      id: 'act-pay-calibration',
      priority: 'Immediate',
      title: 'Calibrate pay bands for below-median active employees',
      targetGroup: `${underpaidActive.length} active staff >10% below Job Level median`,
      rationale: `Closing the gap to 95% of Job Level median requires ~${formatGBP(estMonthlyCost)}/mo (${((estMonthlyCost / Math.max(1, overview.activePayroll)) * 100).toFixed(1)}% of active monthly payroll).`,
      expectedImpact: 'Neutralizes competitive external poaching risk before annual review cycle.',
    });
  }

  const stalledActive = active.filter((r) => r.YearsSinceLastPromotion >= 3);
  if (stalledActive.length > 0) {
    actions.push({
      id: 'act-career-pathing',
      priority: 'Near-Term',
      title: 'Run promotion & lateral mobility audit for unpromoted staff',
      targetGroup: `${stalledActive.length} active employees with 3+ yrs since last promotion`,
      rationale: `Prolonged role stagnation is the single highest-weighted factor (25 pts) in the flight-risk model.`,
      expectedImpact: 'Unlocks internal progression pathways or job-level re-grading.',
    });
  }

  const freqTravelActive = active.filter((r) => r.BusinessTravel === 'Travel_Frequently');
  if (freqTravelActive.length > 0) {
    actions.push({
      id: 'act-travel-rotation',
      priority: 'Near-Term',
      title: 'Rebalance site travel rotations & hybrid schedules',
      targetGroup: `${freqTravelActive.length} active frequent travellers`,
      rationale: `Frequent travellers paired with long commutes (>=15 km) experience compounding burnout risk.`,
      expectedImpact: 'Lowers travel strain score and improves work-life retention across field sites.',
    });
  }

  const earlyTenureActive = active.filter((r) => r.YearsAtCompany <= 2);
  if (earlyTenureActive.length > 0) {
    actions.push({
      id: 'act-onboarding',
      priority: 'Ongoing',
      title: 'Strengthen 90-day & 18-month manager check-ins for early-tenure hires',
      targetGroup: `${earlyTenureActive.length} active employees within first 2 years`,
      rationale: `Early-tenure employees and staff with new managers (<1 yr) face elevated disengagement if expectations misalign.`,
      expectedImpact: 'Improves early-career retention and manager alignment.',
    });
  }

  return { findings, watchlist, actions };
}
