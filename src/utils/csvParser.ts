import type { AttritionStatus, EmployeeRecord } from '../types/employee';

export const SHEET_ID = '1mhUGLV5wnenYldxoUt8R56OPreuJdDH2yJLUjCZw8Xg';
export const SHEET_GID = '136101761';
export const SHEET_GVIZ_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;

const REQUIRED_COLUMNS = [
  'EmployeeID',
  'FirstName',
  'LastName',
  'Gender',
  'Age',
  'Department',
  'JobTitle',
  'JobLevel',
  'EmploymentType',
  'Location',
  'HireDate',
  'YearsAtCompany',
  'YearsSinceLastPromotion',
  'Education',
  'BusinessTravel',
  'MonthlyIncome_GBP',
  'Attrition',
] as const;

export function parseRawCSVRows(csvText: string): string[][] {
  const cleaned = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (inQuotes) {
      if (ch === '"' && cleaned[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(field.trim());
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && cleaned[i + 1] === '\n') {
          i++;
        }
        currentRow.push(field.trim());
        field = '';
        if (currentRow.some((cell) => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        field += ch;
      }
    }
  }

  if (field !== '' || currentRow.length > 0) {
    currentRow.push(field.trim());
    if (currentRow.some((cell) => cell !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function toSafeNumber(val: string | undefined, fallback = 0): number {
  if (!val) return fallback;
  const normalized = val.replace(/[£$,\s]/g, '');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeAttrition(val: string | undefined): AttritionStatus {
  const v = (val ?? '').trim().toLowerCase();
  if (v === 'yes' || v === 'true' || v === '1' || v === 'attrited' || v === 'left') {
    return 'Yes';
  }
  return 'No';
}

export function parseEmployeeRows(rows: string[][], contextLabel = 'spreadsheet'): EmployeeRecord[] {
  if (rows.length < 2) {
    throw new Error(
      `No employee rows found in ${contextLabel}. It must include a header row and at least one employee record.`
    );
  }

  const headers = rows[0].map((h) => String(h ?? '').trim());
  const headerIndex = new Map<string, number>();
  headers.forEach((h, idx) => {
    headerIndex.set(h, idx);
    headerIndex.set(h.toLowerCase(), idx);
  });

  const missingColumns = REQUIRED_COLUMNS.filter(
    (col) => !headerIndex.has(col) && !headerIndex.has(col.toLowerCase())
  );

  if (missingColumns.length > 0) {
    throw new Error(
      `Missing expected column(s): ${missingColumns.join(', ')}. Verify the selected tab or CSV schema.`
    );
  }

  const getCell = (row: string[], col: string): string => {
    const idx = headerIndex.get(col) ?? headerIndex.get(col.toLowerCase());
    return idx !== undefined ? String(row[idx] ?? '').trim() : '';
  };

  const records: EmployeeRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((cell) => String(cell ?? '').trim() === '')) continue;

    const id = getCell(row, 'EmployeeID');
    const firstName = getCell(row, 'FirstName');
    const lastName = getCell(row, 'LastName');
    if (!id && !firstName && !lastName) continue;

    const hireDate = getCell(row, 'HireDate');
    const parsedYear = Number(hireDate.slice(0, 4));
    const hireYear =
      Number.isFinite(parsedYear) && parsedYear >= 1970 && parsedYear <= 2035 ? parsedYear : 0;

    records.push({
      EmployeeID: id || `ROW-${i}`,
      FirstName: firstName,
      LastName: lastName,
      FullName: [firstName, lastName].filter(Boolean).join(' ') || id,
      Gender: getCell(row, 'Gender') || 'Unspecified',
      Age: toSafeNumber(getCell(row, 'Age'), 0),
      MaritalStatus: getCell(row, 'MaritalStatus') || 'Unspecified',
      Department: getCell(row, 'Department') || 'Unassigned',
      JobTitle: getCell(row, 'JobTitle') || 'Unspecified',
      JobLevel: Math.max(1, Math.round(toSafeNumber(getCell(row, 'JobLevel'), 1))),
      EmploymentType: getCell(row, 'EmploymentType') || 'Full-Time',
      Location: getCell(row, 'Location') || 'Unspecified',
      HireDate: hireDate,
      HireYear: hireYear,
      YearsAtCompany: toSafeNumber(getCell(row, 'YearsAtCompany'), 0),
      YearsInCurrentRole: toSafeNumber(getCell(row, 'YearsInCurrentRole'), 0),
      YearsSinceLastPromotion: toSafeNumber(getCell(row, 'YearsSinceLastPromotion'), 0),
      YearsWithCurrManager: toSafeNumber(getCell(row, 'YearsWithCurrManager'), 0),
      Education: getCell(row, 'Education') || 'Unspecified',
      DistanceFromHome_km: toSafeNumber(getCell(row, 'DistanceFromHome_km'), 0),
      BusinessTravel: getCell(row, 'BusinessTravel') || 'Non-Travel',
      MonthlyIncome_GBP: toSafeNumber(getCell(row, 'MonthlyIncome_GBP'), 0),
      Attrition: normalizeAttrition(getCell(row, 'Attrition')),
    });
  }

  if (records.length === 0) {
    throw new Error('Headers matched, but zero valid employee records could be parsed.');
  }

  return records;
}

export function parseEmployeeCSV(csvText: string): EmployeeRecord[] {
  const trimmed = csvText.trim();
  if (!trimmed) {
    throw new Error('The CSV data is empty. Please check the Google Sheet or upload a populated CSV file.');
  }

  const lowerHead = trimmed.slice(0, 300).toLowerCase();
  if (lowerHead.startsWith('<!doctype') || lowerHead.startsWith('<html') || lowerHead.includes('<title>google')) {
    throw new Error(
      'Google Sheets returned an HTML page instead of CSV data. Sign in with Google to read private sheets via the Sheets API, ensure public view access, or use Upload CSV.'
    );
  }

  const rows = parseRawCSVRows(trimmed);
  return parseEmployeeRows(rows, `CSV (gid ${SHEET_GID})`);
}

export async function fetchGoogleSheetCSV(bustCache = false): Promise<EmployeeRecord[]> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15000);

  try {
    const url = bustCache ? `${SHEET_GVIZ_CSV_URL}&_t=${Date.now()}` : SHEET_GVIZ_CSV_URL;
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'text/csv,text/plain;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Unable to read Google Sheet (HTTP ${response.status} ${response.statusText}). Confirm public view access or use Upload CSV.`
      );
    }

    const csvText = await response.text();
    return parseEmployeeCSV(csvText);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'Timed out after 15 seconds while fetching the Google Sheet. Check your connection or use Upload CSV.'
      );
    }
    if (err instanceof TypeError) {
      throw new Error(
        'Network or browser CORS error prevented reading the Google Sheet. Verify internet access and public sheet permissions, or use Upload CSV.'
      );
    }
    throw err instanceof Error ? err : new Error('Failed to load Google Sheet CSV.');
  } finally {
    window.clearTimeout(timeoutId);
  }
}
