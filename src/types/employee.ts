export type TabId = 'overview' | 'deep-dive' | 'insights';

export type AttritionStatus = 'Yes' | 'No';

export type RiskTier = 'High' | 'Elevated' | 'Moderate' | 'Low';

export interface EmployeeRecord {
  EmployeeID: string;
  FirstName: string;
  LastName: string;
  FullName: string;
  Gender: string;
  Age: number;
  MaritalStatus: string;
  Department: string;
  JobTitle: string;
  JobLevel: number;
  EmploymentType: string;
  Location: string;
  HireDate: string;
  HireYear: number;
  YearsAtCompany: number;
  YearsInCurrentRole: number;
  YearsSinceLastPromotion: number;
  YearsWithCurrManager: number;
  Education: string;
  DistanceFromHome_km: number;
  BusinessTravel: string;
  MonthlyIncome_GBP: number;
  Attrition: AttritionStatus;
}

export interface RiskFactorBreakdown {
  criterion: string;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface ScoredEmployee extends EmployeeRecord {
  riskScore: number;
  riskTier: RiskTier;
  levelMedianIncome: number;
  incomeVsMedianPct: number;
  riskBreakdown: RiskFactorBreakdown[];
  topDrivers: string[];
}

export interface FilterState {
  department: string;
  location: string;
  employmentType: string;
  gender: string;
  attrition: 'All' | 'No' | 'Yes';
}

export interface DataSourceMeta {
  sourceType: 'google-sheet' | 'csv-upload';
  label: string;
  lastSynced: string;
  totalRows: number;
}

export interface FindingItem {
  id: string;
  category: string;
  severity: 'critical' | 'warning' | 'neutral' | 'positive';
  headline: string;
  detail: string;
  metricValue: string;
}

export interface RecommendedAction {
  id: string;
  priority: 'Immediate' | 'Near-Term' | 'Ongoing';
  title: string;
  targetGroup: string;
  rationale: string;
  expectedImpact: string;
}
