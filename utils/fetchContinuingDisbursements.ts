export const RICE_PROGRAM_PAP_CODES = [
  '310101100001000 PSS RICE',
  '310103100001000 ESETS RICE',
  '310104100001000 RD RICE',
  '310202100001000 INS RICE',
] as const;

export const UNPAID_PRIOR_YEARS_RICE_PAP_CODES = RICE_PROGRAM_PAP_CODES;
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
  endUser?: string;
  ppaCode?: string;
  isPerson?: boolean;
  isEncrypted?: boolean;
  encryptedPayee?: string;
  originalPayee?: string;
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

export interface MasterDisbursementGroup {
  current: FetchDisbursementResult;
  continuing: FetchDisbursementResult;
  unpaid: FetchDisbursementResult;
}

// Master Google Sheet source URL (Spreadsheet: 1vhslMFxejmwhCJOoi5sIRwP3x1c1HQccrV3d5LMxXOE)
export const MASTER_DISBURSEMENT_SHEET_REF =
  'https://docs.google.com/spreadsheets/d/1vhslMFxejmwhCJOoi5sIRwP3x1c1HQccrV3d5LMxXOE/edit?gid=0#gid=0';

// Direct CSV export link for the master Details Disbursement transaction tab (gid=0)
export const MASTER_DISBURSEMENT_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1vhslMFxejmwhCJOoi5sIRwP3x1c1HQccrV3d5LMxXOE/export?format=csv&gid=0';

function parseNumber(val: any): number {
  if (val === undefined || val === null) return 0;
  const str = String(val).trim();
  if (str === '' || str === '-' || str === '—' || str.includes('#DIV') || str === 'NaN') return 0;
  const cleaned = str.replace(/["',\s₱]/g, '');
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

async function fetchAndParseMasterDisbursements(): Promise<MasterDisbursementGroup> {
  const nowIso = new Date().toISOString();
  try {
    const res = await fetch(MASTER_DISBURSEMENT_CSV_URL, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DA-CAR-Portal/2.0',
        Accept: 'text/csv, text/plain, */*',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Master Google Sheet: HTTP ${res.status}`);
    }

    const csvText = await res.text();
    const lines = csvText.split(/\r?\n/);

    if (lines.length < 2) {
      throw new Error('Google Sheet returned empty or invalid CSV');
    }

    let headerIndex = -1;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const u = lines[i].toUpperCase();
      if (u.includes('PAYEE') && (u.includes('OBLIGATION') || u.includes('DISBURSEMENT'))) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      headerIndex = 0;
    }

    const headers = splitCSVRow(lines[headerIndex]);
    const payeeIdx = headers.findIndex((h) => h.toUpperCase() === 'PAYEE');
    const particIdx = headers.findIndex((h) => h.toUpperCase() === 'PARTICULAR');
    const refIdx = headers.findIndex((h) => h.toUpperCase() === 'REF');
    const papIdx = headers.findIndex((h) => h.toUpperCase() === 'PAP');
    const papCodeIdx = headers.findIndex((h) => h.toUpperCase() === 'PAP CODE');
    const obligIdx = headers.findIndex((h) => h.toUpperCase() === 'OBLIGATION');
    const disbIdx = headers.findIndex((h) => h.toUpperCase() === 'DISBURSEMENT');
    const unpaidIdx = headers.findIndex((h) => h.toUpperCase() === 'UNPAID');
    const gamIdx = headers.findIndex((h) => h.toUpperCase() === 'GAM');
    const statusIdx = headers.findIndex((h) => h.toUpperCase() === 'STATUS');
    const endUserIdx = headers.findIndex((h) => h.toUpperCase() === 'END USER');

    if (payeeIdx === -1 || obligIdx === -1) {
      throw new Error('Required columns (Payee, Obligation) not found in Master Sheet');
    }

    const currentRecords: DisbursementItem[] = [];
    const continuingRecords: DisbursementItem[] = [];
    const unpaidPriorRecords: DisbursementItem[] = [];

    let currOblig = 0;
    let currDisb = 0;
    let currUnpaid = 0;

    let contOblig = 0;
    let contDisb = 0;
    let contUnpaid = 0;

    let unpOblig = 0;
    let unpDisb = 0;
    let unpUnpaid = 0;

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const cols = splitCSVRow(line);
      const payee = cols[payeeIdx] || '';

      // Skip blank rows or total headers
      if (
        !payee ||
        payee.toUpperCase().includes('TOTAL') ||
        payee.toUpperCase().includes('GRAND')
      ) {
        continue;
      }

      const papRaw = papIdx !== -1 ? (cols[papIdx] || '').trim() : '';
      const papCodeRaw = papCodeIdx !== -1 ? (cols[papCodeIdx] || '').trim() : '';
      const combinedPpa = `${papRaw} ${papCodeRaw}`.toUpperCase();

      // Official Rice PAP matching
      let matchedRiceCode: string | undefined = undefined;
      for (const target of RICE_PROGRAM_PAP_CODES) {
        const tUpper = target.toUpperCase();
        const codeOnly = target.split(' ')[0];
        if (combinedPpa.includes(tUpper) || combinedPpa.includes(codeOnly)) {
          matchedRiceCode = target;
          break;
        }
      }

      if (!matchedRiceCode) {
        continue;
      }

      const ref = refIdx !== -1 ? (cols[refIdx] || '').toUpperCase() : '';
      const obligNum = obligIdx !== -1 ? parseNumber(cols[obligIdx]) : 0;
      const disbNum = disbIdx !== -1 ? parseNumber(cols[disbIdx]) : 0;
      const unpaidNum = unpaidIdx !== -1 ? parseNumber(cols[unpaidIdx]) : 0;
      const particulars = particIdx !== -1 ? cols[particIdx] : '';
      const orsNumber = gamIdx !== -1 ? cols[gamIdx] : '';
      const rawStatus = statusIdx !== -1 ? (cols[statusIdx] || '').trim() : '';
      const endUser = endUserIdx !== -1 ? (cols[endUserIdx] || '').trim() : '';
      const fallbackStatus = disbNum > 0 && unpaidNum === 0 ? 'PAID' : unpaidNum > 0 ? 'UNPAID' : '';
      const status = rawStatus || fallbackStatus;

      const item: DisbursementItem = {
        id: `disb-${i}`,
        payee,
        totalObligation: obligNum,
        totalObligationFormatted: formatMoney(obligNum),
        grossAmount: disbNum,
        grossAmountFormatted: formatMoney(disbNum),
        unpaidObligation: unpaidNum,
        unpaidObligationFormatted: formatMoney(unpaidNum),
        particulars,
        orsNumber,
        status: status || undefined,
        endUser: endUser || undefined,
        ppaCode: matchedRiceCode,
      };

      if (ref.includes('CURRENT')) {
        currentRecords.push(item);
        currOblig += obligNum;
        currDisb += disbNum;
        currUnpaid += unpaidNum;
      } else if (ref.includes('CONT')) {
        continuingRecords.push(item);
        contOblig += obligNum;
        contDisb += disbNum;
        contUnpaid += unpaidNum;

        // Transactions under Continuing with outstanding balance constitute Unpaid Prior Years
        if (unpaidNum > 0) {
          unpaidPriorRecords.push({ ...item, id: `disb-unpaid-${i}` });
          unpOblig += obligNum;
          unpDisb += disbNum;
          unpUnpaid += unpaidNum;
        }
      } else {
        currentRecords.push(item);
        currOblig += obligNum;
        currDisb += disbNum;
        currUnpaid += unpaidNum;
      }
    }

    return {
      current: {
        records: currentRecords,
        totals: {
          totalObligation: currOblig,
          grossAmount: currDisb,
          unpaidObligation: currUnpaid,
          count: currentRecords.length,
        },
        fetchedAt: nowIso,
      },
      continuing: {
        records: continuingRecords,
        totals: {
          totalObligation: contOblig,
          grossAmount: contDisb,
          unpaidObligation: contUnpaid,
          count: continuingRecords.length,
        },
        fetchedAt: nowIso,
      },
      unpaid: {
        records: unpaidPriorRecords,
        totals: {
          totalObligation: unpOblig,
          grossAmount: unpDisb,
          unpaidObligation: unpUnpaid,
          count: unpaidPriorRecords.length,
        },
        fetchedAt: nowIso,
      },
    };
  } catch (err: any) {
    console.error('fetchAndParseMasterDisbursements error:', err);
    const emptyResult: FetchDisbursementResult = {
      records: [],
      totals: { totalObligation: 0, grossAmount: 0, unpaidObligation: 0, count: 0 },
      fetchedAt: nowIso,
      error: err.message || 'Error parsing master Google Sheet',
    };
    return {
      current: emptyResult,
      continuing: emptyResult,
      unpaid: emptyResult,
    };
  }
}

// In-memory + disk cache for sub-millisecond retrieval with SWR revalidation
const DISBURSEMENT_CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

interface CachedMasterGroup {
  data: MasterDisbursementGroup;
  timestamp: number;
}

function getDiskDisbCache(): CachedMasterGroup | null {
  if (typeof window !== 'undefined') return null;
  try {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(process.cwd(), 'data', 'disbursements_master_cache.json');
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

function saveDiskDisbCache(entry: CachedMasterGroup) {
  if (typeof window !== 'undefined') return;
  try {
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'disbursements_master_cache.json');
    fs.writeFileSync(file, JSON.stringify(entry), 'utf8');
  } catch {
    // ignore
  }
}

const gDisb = globalThis as unknown as {
  __daMasterDisbCache?: CachedMasterGroup | null;
  __daMasterDisbInflight?: Promise<MasterDisbursementGroup> | null;
};

if (gDisb.__daMasterDisbCache === undefined) {
  gDisb.__daMasterDisbCache = getDiskDisbCache();
}

async function getMasterDisbursementsCached(forceRefresh = false): Promise<MasterDisbursementGroup> {
  const cached = gDisb.__daMasterDisbCache;
  const now = Date.now();

  // 1. Fresh cache: return instantly (< 1ms)
  if (!forceRefresh && cached && now - cached.timestamp < DISBURSEMENT_CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Stale cache: return immediately and revalidate in background
  if (!forceRefresh && cached) {
    if (!gDisb.__daMasterDisbInflight) {
      gDisb.__daMasterDisbInflight = fetchAndParseMasterDisbursements()
        .then((fresh) => {
          if (!fresh.current.error && fresh.current.records.length > 0) {
            const entry = { data: fresh, timestamp: Date.now() };
            gDisb.__daMasterDisbCache = entry;
            saveDiskDisbCache(entry);
          }
          return fresh;
        })
        .catch((err) => {
          console.warn('[Disbursement] Background refresh failed:', err);
          return cached.data;
        })
        .finally(() => {
          gDisb.__daMasterDisbInflight = null;
        });
    }
    return cached.data;
  }

  // 3. Cold start: coalesce concurrent inflight requests
  if (gDisb.__daMasterDisbInflight) {
    return gDisb.__daMasterDisbInflight;
  }

  gDisb.__daMasterDisbInflight = fetchAndParseMasterDisbursements()
    .then((fresh) => {
      if (!fresh.current.error && fresh.current.records.length > 0) {
        const entry = { data: fresh, timestamp: Date.now() };
        gDisb.__daMasterDisbCache = entry;
        saveDiskDisbCache(entry);
      }
      return fresh;
    })
    .finally(() => {
      gDisb.__daMasterDisbInflight = null;
    });

  return gDisb.__daMasterDisbInflight;
}

export async function fetchContinuingDisbursements(forceRefresh = false): Promise<FetchDisbursementResult> {
  const master = await getMasterDisbursementsCached(forceRefresh);
  return master.continuing;
}

export async function fetchCurrentDisbursements(forceRefresh = false): Promise<FetchDisbursementResult> {
  const master = await getMasterDisbursementsCached(forceRefresh);
  return master.current;
}

export async function fetchUnpaidPriorYearsDisbursements(forceRefresh = false): Promise<FetchDisbursementResult> {
  const master = await getMasterDisbursementsCached(forceRefresh);
  return master.unpaid;
}

// Backwards-compatible aliases
export type ContinuingDisbursementItem = DisbursementItem;
export type FetchContinuingDisbursementResult = FetchDisbursementResult;
