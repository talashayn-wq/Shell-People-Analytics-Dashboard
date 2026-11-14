import type { EmployeeRecord, ScoredEmployee } from '../types/employee';
import { formatGBP } from './analytics';
import { parseEmployeeRows } from './csvParser';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  rowCount: number;
  columnCount: number;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: SheetTabInfo[];
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) return urlMatch[1];
  return trimmed;
}

export function extractGidFromUrl(input: string): number | null {
  const gidMatch = input.match(/[?#&]gid=(\d+)/);
  if (gidMatch?.[1]) {
    const n = Number(gidMatch[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function fetchGoogleJson<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let errMsg = `Google API error (${res.status} ${res.statusText})`;
    try {
      const body = await res.json();
      if (body?.error?.message) {
        errMsg = body.error.message;
      }
    } catch {
      // keep default status text
    }
    if (res.status === 401) {
      throw new Error('Your Google session token expired. Please sign in with Google again.');
    }
    throw new Error(errMsg);
  }

  return (await res.json()) as T;
}

export async function listUserSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=25&fields=files(id,name,modifiedTime)`;
  const data = await fetchGoogleJson<{ files?: DriveSpreadsheetFile[] }>(url, accessToken);
  return data.files ?? [];
}

export async function getSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetMetadata> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    cleanId
  )}?fields=properties.title,sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))`;

  const data = await fetchGoogleJson<{
    properties?: { title?: string };
    sheets?: Array<{
      properties?: {
        sheetId?: number;
        title?: string;
        gridProperties?: { rowCount?: number; columnCount?: number };
      };
    }>;
  }>(url, accessToken);

  const sheets: SheetTabInfo[] = (data.sheets ?? []).map((s) => ({
    sheetId: s.properties?.sheetId ?? 0,
    title: s.properties?.title ?? 'Sheet1',
    rowCount: s.properties?.gridProperties?.rowCount ?? 0,
    columnCount: s.properties?.gridProperties?.columnCount ?? 0,
  }));

  if (sheets.length === 0) {
    throw new Error('The selected Google Spreadsheet contains no worksheet tabs.');
  }

  return {
    spreadsheetId: cleanId,
    title: data.properties?.title ?? 'Untitled Spreadsheet',
    sheets,
  };
}

export async function readSpreadsheetTabAsEmployees(
  spreadsheetId: string,
  sheetTitle: string,
  accessToken: string
): Promise<EmployeeRecord[]> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const escapedTitle = `'${sheetTitle.replace(/'/g, "''")}'`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    cleanId
  )}/values/${encodeURIComponent(escapedTitle)}?majorDimension=ROWS`;

  const data = await fetchGoogleJson<{ values?: string[][] }>(url, accessToken);
  const rows = data.values ?? [];
  return parseEmployeeRows(rows, `tab "${sheetTitle}"`);
}

export async function fetchSheetViaApiByGid(
  spreadsheetId: string,
  preferredGid: number,
  accessToken: string
): Promise<{ records: EmployeeRecord[]; spreadsheetTitle: string; tabTitle: string }> {
  const meta = await getSpreadsheetMetadata(spreadsheetId, accessToken);
  const matchedTab = meta.sheets.find((s) => s.sheetId === preferredGid) ?? meta.sheets[0];
  const records = await readSpreadsheetTabAsEmployees(
    meta.spreadsheetId,
    matchedTab.title,
    accessToken
  );
  return {
    records,
    spreadsheetTitle: meta.title,
    tabTitle: matchedTab.title,
  };
}

export async function exportReportToNewGoogleSheet(
  title: string,
  employees: ScoredEmployee[],
  mode: 'watchlist' | 'filtered',
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; rowCount: number }> {
  const tabName = mode === 'watchlist' ? 'Flight Risk Watchlist' : 'Filtered Workforce';

  const createRes = await fetchGoogleJson<{
    spreadsheetId: string;
    spreadsheetUrl: string;
  }>('https://sheets.googleapis.com/v4/spreadsheets', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: tabName } }],
    }),
  });

  const headers = [
    'EmployeeID',
    'FullName',
    'Department',
    'Location',
    'JobTitle',
    'JobLevel',
    'EmploymentType',
    'YearsAtCompany',
    'YearsSinceLastPromotion',
    'BusinessTravel',
    'MonthlyIncome_GBP',
    'Attrition',
    'FlightRiskScore',
    'RiskTier',
    'TopRiskDrivers',
  ];

  const rows = employees.map((e) => [
    e.EmployeeID,
    e.FullName,
    e.Department,
    e.Location,
    e.JobTitle,
    String(e.JobLevel),
    e.EmploymentType,
    String(e.YearsAtCompany),
    String(e.YearsSinceLastPromotion),
    e.BusinessTravel,
    formatGBP(e.MonthlyIncome_GBP),
    e.Attrition,
    String(e.riskScore),
    e.riskTier,
    e.topDrivers.join(' | '),
  ]);

  const escapedTab = `'${tabName}'`;
  await fetchGoogleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      createRes.spreadsheetId
    )}/values/${encodeURIComponent(escapedTab)}!A1:O${rows.length + 1}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        range: `${escapedTab}!A1:O${rows.length + 1}`,
        majorDimension: 'ROWS',
        values: [headers, ...rows],
      }),
    }
  );

  return {
    spreadsheetId: createRes.spreadsheetId,
    spreadsheetUrl: createRes.spreadsheetUrl,
    rowCount: rows.length,
  };
}
