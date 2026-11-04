export const RICE_PROGRAM_PAP_CODES = [
  '310101100001000 PSS RICE',
  '310103100001000 ESETS RICE',
  '310104100001000 RD RICE',
  '310202100001000 INS RICE',
] as const;

export const UNPAID_PRIOR_YEARS_RICE_PAP_CODES = [
  '310101100001000 PSS RICE',
  '310103100001000 ESETS RICE',
  '310104100001000 RD RICE',
  '310202100001000 INS RICE',
  '310201100001000 PAEF RICE',
  '200000100009000 STO FPMA-RICE',
] as const;

export const CONTINUING_RICE_PAP_CODES = RICE_PROGRAM_PAP_CODES;

export interface DisbursementItem {
  id: string;
  payee: string;
  totalObligation: number;
  totalObligationFormatted: string;
  grossAmount: number;
  grossAmountFormatted: string;
  unpaidObligation: number;
  unpaidObligationFormatted: string;
  particulars?: string;
  orsNumber?: string;
  date?: string;
  status?: string;
  ppaCode?: string;
}

export interface FetchDisbursementResult {
  records: DisbursementItem[];
  totals: {
    totalObligation: number;
    grossAmount: number;
    unpaidObligation: number;
    count: number;
  };
  fetchedAt: string;
  error?: string;
}

// Continuing Sheet: gid=380689862
const CONTINUING_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1r1nx9Rhnixo_cUTq8XVU2ltuHbBiwMfKznkOOF9_j-Y/export?format=csv&gid=380689862';

// Current Sheet: gid=2034607497
const CURRENT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1r1nx9Rhnixo_cUTq8XVU2ltuHbBiwMfKznkOOF9_j-Y/export?format=csv&gid=2034607497';

// Unpaid Prior Years Sheet: gid=481468908
const UNPAID_PRIOR_YEARS_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1r1nx9Rhnixo_cUTq8XVU2ltuHbBiwMfKznkOOF9_j-Y/export?format=csv&gid=481468908';

function parseNumber(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/["',\s₱]/g, '');
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    const num = parseFloat(cleaned.slice(1, -1));
    return isNaN(num) ? 0 : -num;
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function formatMoney(num: number): string {
  if (num === 0) return '-';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function splitCSVRow(str: string): string[] {
  const res: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"') {
      if (inQuotes && str[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      res.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  res.push(current.trim());
  return res;
}

async function parseSheetCsv(sheetUrl: string, prefix: string): Promise<FetchDisbursementResult> {
  try {
    const res = await fetch(sheetUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Google Sheet: HTTP ${res.status}`);
    }

    const csvText = await res.text();
    const lines = csvText.split(/\r?\n/);

    let headerIndex = -1;
    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      const upper = lines[i].toUpperCase();
      if (upper.includes('PAYEE') && (upper.includes('TOTAL OBLIGATION') || upper.includes('OBLIGATION'))) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      throw new Error('Header row with Payee and TOTAL OBLIGATION not found');
    }

    const headers = splitCSVRow(lines[headerIndex]);
    const payeeIdx = headers.findIndex((h) => h.toUpperCase().includes('PAYEE'));
    const totalObligIdx = headers.findIndex((h) => h.toUpperCase() === 'TOTAL OBLIGATION');
    const grossIdx = headers.findIndex((h) => h.toUpperCase() === 'GROSS AMOUNT');
    const unpaidIdx = headers.findLastIndex((h) => h.toUpperCase() === 'UNPAID OBLIGATION');
    const particularsIdx = headers.findIndex((h) => h.toUpperCase().includes('PARTICULAR'));
    const orsIdx = headers.findIndex((h) => h.toUpperCase().includes('ORS NUMBER'));
    const statusIdx = headers.findIndex((h) => h.toUpperCase().includes('ACCOUNTING STATUS') || h.toUpperCase() === 'STATUS');
    const ppaIdx = headers.findIndex((h) => {
      const u = h.toUpperCase();
      return u.includes('GAA/PPA') || u.includes('PPA');
    });
    const papIdx = headers.findIndex((h) => {
      const u = h.toUpperCase();
      return u.includes('PAP CODE') || u.includes('PAP');
    });

    const records: DisbursementItem[] = [];
    let sumTotalOblig = 0;
    let sumGross = 0;
    let sumUnpaid = 0;

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const cols = splitCSVRow(line);
      const payee = cols[payeeIdx] || '';

      // Skip empty, invalid or subtotal rows
      if (
        !payee ||
        payee.toUpperCase().includes('TOTAL') ||
        payee.toUpperCase().includes('GRAND')
      ) {
        continue;
      }

      const ppaRaw = ppaIdx !== -1 ? (cols[ppaIdx] || '').trim() : '';
      const papRaw = papIdx !== -1 ? (cols[papIdx] || '').trim() : '';
      const combinedPpa = `${ppaRaw} ${papRaw}`.toUpperCase();

      const targetCodes =
        prefix === 'disb-unpaid'
          ? UNPAID_PRIOR_YEARS_RICE_PAP_CODES
          : prefix === 'disb-cont'
            ? CONTINUING_RICE_PAP_CODES
            : RICE_PROGRAM_PAP_CODES;

      let matchedRiceCode: string | undefined = undefined;
      for (const target of targetCodes) {
        const tUpper = target.toUpperCase();
        if (
          combinedPpa.includes(tUpper) ||
          (ppaRaw && tUpper.includes(ppaRaw.toUpperCase()) && ppaRaw.length > 10) ||
          (papRaw && tUpper.includes(papRaw.toUpperCase()) && papRaw.length > 10)
        ) {
          matchedRiceCode = target;
          break;
        }
      }

      // Only retain records matching the official Rice PAP codes
      if (!matchedRiceCode) {
        continue;
      }

      const totalObligRaw = totalObligIdx !== -1 ? cols[totalObligIdx] : '';
      const grossRaw = grossIdx !== -1 ? cols[grossIdx] : '';
      const unpaidRaw = unpaidIdx !== -1 ? cols[unpaidIdx] : '';
      const particulars = particularsIdx !== -1 ? cols[particularsIdx] : '';
      const orsNumber = orsIdx !== -1 ? cols[orsIdx] : '';
      const status = statusIdx !== -1 ? cols[statusIdx] : '';

      const totalObligNum = parseNumber(totalObligRaw);
      const grossNum = parseNumber(grossRaw);
      const unpaidNum = parseNumber(unpaidRaw);

      sumTotalOblig += totalObligNum;
      sumGross += grossNum;
      sumUnpaid += unpaidNum;

      records.push({
        id: `${prefix}-${i}`,
        payee,
        totalObligation: totalObligNum,
        totalObligationFormatted: formatMoney(totalObligNum),
        grossAmount: grossNum,
        grossAmountFormatted: formatMoney(grossNum),
        unpaidObligation: unpaidNum,
        unpaidObligationFormatted: formatMoney(unpaidNum),
        particulars,
        orsNumber,
        status,
        ppaCode: matchedRiceCode || ppaRaw || papRaw || undefined,
      });
    }

    return {
      records,
      totals: {
        totalObligation: sumTotalOblig,
        grossAmount: sumGross,
        unpaidObligation: sumUnpaid,
        count: records.length,
      },
      fetchedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error(`parseSheetCsv (${prefix}) error:`, err);
    return {
      records: [],
      totals: {
        totalObligation: 0,
        grossAmount: 0,
        unpaidObligation: 0,
        count: 0,
      },
      fetchedAt: new Date().toISOString(),
      error: err.message || 'Error parsing Google Sheet data',
    };
  }
}

// In-memory + disk cache for ultra-fast sub-millisecond retrieval with SWR revalidation
const DISBURSEMENT_CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

interface DisbursementCacheEntry {
  data: FetchDisbursementResult;
  timestamp: number;
}

function getDiskDisbCache(): Record<string, DisbursementCacheEntry> | null {
  if (typeof window !== 'undefined') return null;
  try {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(process.cwd(), 'data', 'disbursements_cache.json');
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

function saveDiskDisbCache(cacheMap: Map<string, DisbursementCacheEntry>) {
  if (typeof window !== 'undefined') return;
  try {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(process.cwd(), 'data', 'disbursements_cache.json');
    const obj: Record<string, DisbursementCacheEntry> = {};
    cacheMap.forEach((val, key) => {
      obj[key] = val;
    });
    fs.writeFileSync(file, JSON.stringify(obj), 'utf8');
  } catch {
    // ignore
  }
}

const gDisb = globalThis as unknown as {
  __daDisbCache?: Map<string, DisbursementCacheEntry>;
  __daDisbInflight?: Map<string, Promise<FetchDisbursementResult>>;
};

if (!gDisb.__daDisbCache) {
  gDisb.__daDisbCache = new Map();
  const disk = getDiskDisbCache();
  if (disk) {
    Object.entries(disk).forEach(([k, v]) => {
      gDisb.__daDisbCache!.set(k, v);
    });
  }
}
if (!gDisb.__daDisbInflight) {
  gDisb.__daDisbInflight = new Map();
}

const memoryCache = gDisb.__daDisbCache;
const inflightFetches = gDisb.__daDisbInflight;

async function parseSheetCsvCached(
  sheetUrl: string,
  prefix: string,
  forceRefresh = false
): Promise<FetchDisbursementResult> {
  const cached = memoryCache.get(sheetUrl);
  const now = Date.now();

  // 1. Fresh cache: return instantly (< 1ms)
  if (!forceRefresh && cached && now - cached.timestamp < DISBURSEMENT_CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Stale cache: return immediately and revalidate in background
  if (!forceRefresh && cached) {
    if (!inflightFetches.has(sheetUrl)) {
      const bgPromise = parseSheetCsv(sheetUrl, prefix)
        .then((fresh) => {
          if (!fresh.error && fresh.records.length > 0) {
            memoryCache.set(sheetUrl, { data: fresh, timestamp: Date.now() });
            saveDiskDisbCache(memoryCache);
          }
          return fresh;
        })
        .catch((err) => {
          console.warn(`[Disbursement] Background refresh failed for ${prefix}:`, err);
          return cached.data;
        })
        .finally(() => {
          inflightFetches.delete(sheetUrl);
        });
      inflightFetches.set(sheetUrl, bgPromise);
    }
    return cached.data;
  }

  // 3. Cold start: coalesce concurrent inflight requests
  if (inflightFetches.has(sheetUrl)) {
    return inflightFetches.get(sheetUrl)!;
  }

  const fetchPromise = parseSheetCsv(sheetUrl, prefix)
    .then((fresh) => {
      if (!fresh.error && fresh.records.length > 0) {
        memoryCache.set(sheetUrl, { data: fresh, timestamp: Date.now() });
        saveDiskDisbCache(memoryCache);
      }
      return fresh;
    })
    .finally(() => {
      inflightFetches.delete(sheetUrl);
    });

  inflightFetches.set(sheetUrl, fetchPromise);
  return fetchPromise;
}

export async function fetchContinuingDisbursements(forceRefresh = false): Promise<FetchDisbursementResult> {
  return parseSheetCsvCached(CONTINUING_SHEET_URL, 'disb-cont', forceRefresh);
}

export async function fetchCurrentDisbursements(forceRefresh = false): Promise<FetchDisbursementResult> {
  return parseSheetCsvCached(CURRENT_SHEET_URL, 'disb-curr', forceRefresh);
}

export async function fetchUnpaidPriorYearsDisbursements(forceRefresh = false): Promise<FetchDisbursementResult> {
  return parseSheetCsvCached(UNPAID_PRIOR_YEARS_SHEET_URL, 'disb-unpaid', forceRefresh);
}

// Backwards-compatible alias
export type ContinuingDisbursementItem = DisbursementItem;
export type FetchContinuingDisbursementResult = FetchDisbursementResult;
