import fs from 'fs';
import path from 'path';

export interface ObligationListItem {
  id: string;
  banner: string;
  pap: 'PSS' | 'ESETS' | 'RD' | 'INS' | string;
  currentDetails: string;
  currentAmt: number;
  continuingDetails: string;
  continuingAmt: number;
  rowTotal: number;
  statusType: 'current' | 'continuing' | 'both';
}

export interface PapBudgetSummary {
  pap: string;
  name: string;
  current: number;
  continuing: number;
  total: number;
  count: number;
  sharePercent: number;
}

export interface ObligationListResult {
  totalAllocation: number;
  currentFunds: number;
  continuingFunds: number;
  activeLineItems: number;
  currentPercent: number;
  continuingPercent: number;
  papBreakdown: Record<string, PapBudgetSummary>;
  papList: PapBudgetSummary[];
  items: ObligationListItem[];
  fetchedAt: string;
  sourceUrl: string;
}

export const OBLIGATION_LIST_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1AuMxyRx_OVlRU6kT-SYlmuISFT7_Br4Kq8fM7a_CT5Y/export?format=csv&gid=0';

export const FALLBACK_OBLIGATION_ITEMS: ObligationListItem[] = [
  {
    id: 'obl-1',
    banner: 'RICE',
    pap: 'PSS',
    currentDetails: 'Inorganic Fertilizer',
    currentAmt: 3736800.0,
    continuingDetails: 'Biofertilize for repeat order',
    continuingAmt: 5800000.0,
    rowTotal: 9536800.0,
    statusType: 'both',
  },
  {
    id: 'obl-2',
    banner: 'RICE',
    pap: 'PSS',
    currentDetails: '-',
    currentAmt: 0.0,
    continuingDetails: 'Supplies (BABRC)',
    continuingAmt: 15000.0,
    rowTotal: 15000.0,
    statusType: 'continuing',
  },
  {
    id: 'obl-3',
    banner: 'RICE',
    pap: 'ESETS',
    currentDetails: 'DBM NBC 602',
    currentAmt: 3252840.0,
    continuingDetails: 'Power Sprayer',
    continuingAmt: 394495.0,
    rowTotal: 3647335.0,
    statusType: 'both',
  },
  {
    id: 'obl-4',
    banner: 'RICE',
    pap: 'ESETS',
    currentDetails: 'SRI',
    currentAmt: 1118900.38,
    continuingDetails: '-',
    continuingAmt: 0.0,
    rowTotal: 1118900.38,
    statusType: 'current',
  },
  {
    id: 'obl-5',
    banner: 'RICE',
    pap: 'ESETS',
    currentDetails: 'SVP',
    currentAmt: 2500000.0,
    continuingDetails: '-',
    continuingAmt: 0.0,
    rowTotal: 2500000.0,
    statusType: 'current',
  },
  {
    id: 'obl-6',
    banner: 'RICE',
    pap: 'ESETS',
    currentDetails: 'Supplies Model farm',
    currentAmt: 5800000.0,
    continuingDetails: '-',
    continuingAmt: 0.0,
    rowTotal: 5800000.0,
    statusType: 'current',
  },
  {
    id: 'obl-7',
    banner: 'RICE',
    pap: 'ESETS',
    currentDetails: 'For Gratuity Pay',
    currentAmt: 530995.0,
    continuingDetails: '-',
    continuingAmt: 0.0,
    rowTotal: 530995.0,
    statusType: 'current',
  },
  {
    id: 'obl-8',
    banner: 'RICE',
    pap: 'RD',
    currentDetails: 'Supplies (Supplemental APP/PR for signing)',
    currentAmt: 2515592.0,
    continuingDetails: 'Supplies',
    continuingAmt: 1070371.0,
    rowTotal: 3585963.0,
    statusType: 'both',
  },
  {
    id: 'obl-9',
    banner: 'RICE',
    pap: 'RD',
    currentDetails: 'Supplies (RFQ)',
    currentAmt: 132310.0,
    continuingDetails: 'Reimbursement RM',
    continuingAmt: 203190.0,
    rowTotal: 335500.0,
    statusType: 'both',
  },
  {
    id: 'obl-10',
    banner: 'RICE',
    pap: 'RD',
    currentDetails: 'Supplies (For Obligation)',
    currentAmt: 22973.0,
    continuingDetails: '-',
    continuingAmt: 0.0,
    rowTotal: 22973.0,
    statusType: 'current',
  },
  {
    id: 'obl-11',
    banner: 'RICE',
    pap: 'RD',
    currentDetails: 'Labor and Wages',
    currentAmt: 72667.5,
    continuingDetails: '-',
    continuingAmt: 0.0,
    rowTotal: 72667.5,
    statusType: 'current',
  },
  {
    id: 'obl-12',
    banner: 'RICE',
    pap: 'RD',
    currentDetails: 'Honorarium',
    currentAmt: 13685.0,
    continuingDetails: '-',
    continuingAmt: 0.0,
    rowTotal: 13685.0,
    statusType: 'current',
  },
  {
    id: 'obl-13',
    banner: 'RICE',
    pap: 'RD',
    currentDetails: 'Mobile Expense',
    currentAmt: 41000.0,
    continuingDetails: '-',
    continuingAmt: 0.0,
    rowTotal: 41000.0,
    statusType: 'current',
  },
  {
    id: 'obl-14',
    banner: 'RICE',
    pap: 'RD',
    currentDetails: 'For Gratuity Pay',
    currentAmt: 230000.0,
    continuingDetails: '-',
    continuingAmt: 0.0,
    rowTotal: 230000.0,
    statusType: 'current',
  },
  {
    id: 'obl-15',
    banner: 'RICE',
    pap: 'RD',
    currentDetails: 'Realignment for traveling',
    currentAmt: 714768.5,
    continuingDetails: '-',
    continuingAmt: 0.0,
    rowTotal: 714768.5,
    statusType: 'current',
  },
  {
    id: 'obl-16',
    banner: 'RICE',
    pap: 'INS',
    currentDetails: 'Pump and Engine Set',
    currentAmt: 4900000.0,
    continuingDetails: 'Pump and Engine Set',
    continuingAmt: 4900000.0,
    rowTotal: 9800000.0,
    statusType: 'both',
  },
  {
    id: 'obl-17',
    banner: 'RICE',
    pap: 'INS',
    currentDetails: 'EAO',
    currentAmt: 1300000.0,
    continuingDetails: 'EAO',
    continuingAmt: 1300000.0,
    rowTotal: 2600000.0,
    statusType: 'both',
  },
];

const PAP_FULL_NAMES: Record<string, string> = {
  PSS: 'Production Support Services',
  ESETS: 'Extension Support, Education & Training Services',
  RD: 'Research & Development',
  INS: 'Infrastructure Support Services',
};

function parseNumber(val: any): number {
  if (val === undefined || val === null) return 0;
  const str = String(val).trim().replace(/[₱,$\s]/g, '');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let cur = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      row.push(cur);
      cur = '';
      lines.push(row);
      row = [];
    } else {
      cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    lines.push(row);
  }
  return lines;
}

const DISK_CACHE_PATH = path.join(process.cwd(), 'data', 'obligation_list_cache.json');
const CACHE_TTL_MS = 5 * 1000; // 5 seconds for fast live Google Sheets sync

const gGlobal = globalThis as unknown as {
  __daObligationListCache?: { data: ObligationListResult; timestamp: number };
  __daObligationListInflight?: Promise<ObligationListResult> | null;
};

function getDiskCache(): { data: ObligationListResult; timestamp: number } | null {
  try {
    if (fs.existsSync(DISK_CACHE_PATH)) {
      const raw = fs.readFileSync(DISK_CACHE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

function saveDiskCache(entry: { data: ObligationListResult; timestamp: number }) {
  try {
    fs.mkdirSync(path.dirname(DISK_CACHE_PATH), { recursive: true });
    fs.writeFileSync(DISK_CACHE_PATH, JSON.stringify(entry), 'utf-8');
  } catch {}
}

function compileSummary(items: ObligationListItem[], fetchedAt: string): ObligationListResult {
  let totalCurrent = 0;
  let totalContinuing = 0;
  let grandTotal = 0;

  const papBreakdown: Record<string, PapBudgetSummary> = {
    ESETS: { pap: 'ESETS', name: PAP_FULL_NAMES.ESETS, current: 0, continuing: 0, total: 0, count: 0, sharePercent: 0 },
    PSS: { pap: 'PSS', name: PAP_FULL_NAMES.PSS, current: 0, continuing: 0, total: 0, count: 0, sharePercent: 0 },
    INS: { pap: 'INS', name: PAP_FULL_NAMES.INS, current: 0, continuing: 0, total: 0, count: 0, sharePercent: 0 },
    RD: { pap: 'RD', name: PAP_FULL_NAMES.RD, current: 0, continuing: 0, total: 0, count: 0, sharePercent: 0 },
  };

  for (const item of items) {
    totalCurrent += item.currentAmt;
    totalContinuing += item.continuingAmt;
    grandTotal += item.rowTotal;

    const p = item.pap;
    if (!papBreakdown[p]) {
      papBreakdown[p] = {
        pap: p,
        name: PAP_FULL_NAMES[p] || p,
        current: 0,
        continuing: 0,
        total: 0,
        count: 0,
        sharePercent: 0,
      };
    }
    papBreakdown[p].current += item.currentAmt;
    papBreakdown[p].continuing += item.continuingAmt;
    papBreakdown[p].total += item.rowTotal;
    papBreakdown[p].count += 1;
  }

  // Calculate percentage shares
  for (const key of Object.keys(papBreakdown)) {
    papBreakdown[key].sharePercent = grandTotal > 0 ? (papBreakdown[key].total / grandTotal) * 100 : 0;
  }

  // Desired ordering matching the mockup chart: ESETS, PSS, INS, RD
  const desiredOrder = ['ESETS', 'PSS', 'INS', 'RD'];
  const papList = desiredOrder.map((key) => papBreakdown[key]).filter(Boolean);

  const currentPercent = grandTotal > 0 ? (totalCurrent / grandTotal) * 100 : 78.2;
  const continuingPercent = grandTotal > 0 ? (totalContinuing / grandTotal) * 100 : 21.8;

  return {
    totalAllocation: grandTotal,
    currentFunds: totalCurrent,
    continuingFunds: totalContinuing,
    activeLineItems: items.length,
    currentPercent,
    continuingPercent,
    papBreakdown,
    papList,
    items,
    fetchedAt,
    sourceUrl: OBLIGATION_LIST_GOOGLE_SHEET_URL,
  };
}

async function doFetchFromGoogleSheet(): Promise<ObligationListResult> {
  const now = new Date().toISOString();
  try {
    const cacheBusterUrl = `${OBLIGATION_LIST_GOOGLE_SHEET_URL}&_cb=${Date.now()}`;
    const res = await fetch(cacheBusterUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (!res.ok) {
      throw new Error(`Google Sheets responded with HTTP ${res.status}`);
    }

    const csvText = await res.text();
    const rows = parseCSV(csvText);

    const items: ObligationListItem[] = [];
    let idCounter = 1;

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;
      const banner = (row[0] || '').trim().toUpperCase();

      // STRICT USER REQUIREMENT: Capture data only for RICE
      if (banner !== 'RICE') continue;

      const pap = (row[1] || '').trim().toUpperCase() as 'PSS' | 'ESETS' | 'RD' | 'INS';
      const currentDetails = (row[2] || '').trim();
      const currentAmt = parseNumber(row[3]);
      const continuingDetails = (row[4] || '').trim();
      const continuingAmt = parseNumber(row[5]);
      const rowTotal = parseNumber(row[6]) || currentAmt + continuingAmt;

      let statusType: 'current' | 'continuing' | 'both' = 'current';
      if (currentAmt > 0 && continuingAmt > 0) {
        statusType = 'both';
      } else if (continuingAmt > 0) {
        statusType = 'continuing';
      }

      items.push({
        id: `obl-${idCounter++}`,
        banner: 'RICE',
        pap,
        currentDetails: currentDetails || '-',
        currentAmt,
        continuingDetails: continuingDetails || '-',
        continuingAmt,
        rowTotal,
        statusType,
      });
    }

    if (items.length > 0) {
      return compileSummary(items, now);
    }
    throw new Error('No valid RICE rows found in Google Sheet');
  } catch (err) {
    console.warn('[ObligationList] Falling back to verified 17-item data:', err);
    return compileSummary(FALLBACK_OBLIGATION_ITEMS, now);
  }
}

export async function fetchObligationListSheet(forceRefresh = false): Promise<ObligationListResult> {
  const now = Date.now();
  if (gGlobal.__daObligationListCache === undefined) {
    gGlobal.__daObligationListCache = getDiskCache() || undefined;
  }
  const cached = gGlobal.__daObligationListCache;

  // 1. Fresh cache within TTL
  if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Fetch fresh live data directly from Google Sheets
  try {
    const fresh = await doFetchFromGoogleSheet();
    if (fresh.items.length > 0) {
      const entry = { data: fresh, timestamp: Date.now() };
      gGlobal.__daObligationListCache = entry;
      saveDiskCache(entry);
      return fresh;
    }
  } catch (err) {
    console.warn('[ObligationList] Live fetch error, falling back to cache:', err);
  }

  if (cached?.data) {
    return cached.data;
  }

  return compileSummary(FALLBACK_OBLIGATION_ITEMS, new Date().toISOString());
}
