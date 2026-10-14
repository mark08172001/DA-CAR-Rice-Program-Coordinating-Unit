export interface CommodityAllocation {
  id?: string | number;
  commodity?: string;
  category?: string;
  fund?: number | null;
  total_amount?: number | null;
  ws_2024?: number | null;
  ds_2024_25?: number | null;
  ws_2025?: number | null;
  ds_2025_26?: number | null;
  claimed?: number | null;
  unutilized?: number | null;
  transactions_count?: number | null;
}

export const COMMODITY_CLAIMS_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1bZxrV8Y6LY3pOq7clelRIPIjHK_3O15eUpqhmQu_JEw/export?format=csv&gid=2052755701';

export const FALLBACK_COMMODITY_CLAIMS: CommodityAllocation[] = [
  {
    id: 'hybrid-seeds',
    commodity: 'Hybrid Seeds',
    category: 'Hybrid Seeds',
    fund: 118650000.0,
    ws_2024: 37311996.19,
    ds_2024_25: 46318012.03,
    ws_2025: 25323539.72,
    ds_2025_26: 8257146.21,
    claimed: 117210694.15,
    unutilized: 1439305.85,
  },
  {
    id: 'iof',
    commodity: 'IOF',
    category: 'IOF',
    fund: 272816000.0,
    ws_2024: 87014480.45,
    ds_2024_25: 119239860.23,
    ws_2025: 52832217.97,
    ds_2025_26: 8496375.31,
    claimed: 267582933.96,
    unutilized: 5233066.04,
  },
  {
    id: 'biofert',
    commodity: 'BIOFERT',
    category: 'BIOFERT',
    fund: 98717000.0,
    ws_2024: 25893587.72,
    ds_2024_25: 38458818.63,
    ws_2025: 20645150.16,
    ds_2025_26: 5247185.24,
    claimed: 90244741.75,
    unutilized: 8472258.25,
  },
  {
    id: 'sa',
    commodity: 'SA',
    category: 'SA',
    fund: 65811000.0,
    ws_2024: null,
    ds_2024_25: 19879136.16,
    ws_2025: 14234043.22,
    ds_2025_26: 5525649.4,
    claimed: 39638828.78,
    unutilized: 26172171.22,
  },
  {
    id: 'drone',
    commodity: 'DRONE',
    category: 'DRONE',
    fund: 15200000.0,
    ws_2024: null,
    ds_2024_25: 534977.42,
    ws_2025: null,
    ds_2025_26: null,
    claimed: 534977.42,
    unutilized: 14665022.58,
  },
];

export interface CommodityClaimsSheetResult {
  allocations: CommodityAllocation[];
  totalRow: CommodityAllocation | null;
  fetchedAt: string;
  sourceUrl: string;
}

function parseGovernmentNumber(val: any): number {
  if (val === undefined || val === null) return 0;
  let str = String(val).trim();
  if (str === '' || str === '-' || str === '—' || str.includes('#DIV') || str === 'NaN') return 0;
  const isNegative = (str.startsWith('(') && str.endsWith(')')) || str.startsWith('-');
  str = str.replace(/[₱,$\s()]/g, '');
  const n = parseFloat(str);
  if (isNaN(n)) return 0;
  return isNegative ? -Math.abs(n) : n;
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
      row.push(cur.trim());
      cur = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      row.push(cur.trim());
      lines.push(row);
      row = [];
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur.trim());
    lines.push(row);
  }
  return lines;
}

export async function fetchCommodityClaimsFromGoogleSheet(): Promise<CommodityClaimsSheetResult> {
  const now = new Date().toISOString();
  try {
    const cacheBusterUrl = `${COMMODITY_CLAIMS_SHEET_URL}&_cb=${Date.now()}`;
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

    // Look for header row (contains COMMODITY and FUND)
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.length > 0 && row[0]?.toUpperCase().includes('COMMODITY')) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      console.warn('Could not locate COMMODITY header row in Google Sheet CSV, using fallback.');
      return {
        allocations: FALLBACK_COMMODITY_CLAIMS,
        totalRow: null,
        fetchedAt: now,
        sourceUrl: COMMODITY_CLAIMS_SHEET_URL,
      };
    }

    const allocations: CommodityAllocation[] = [];
    let totalRow: CommodityAllocation | null = null;

    // Process rows starting after header (rows 3 to 8, which is index headerIdx + 1 onwards)
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0) continue;
      const commodityName = r[0]?.trim();
      if (!commodityName) continue;

      const isTotal = commodityName.toUpperCase() === 'TOTAL';

      const fundVal = r[1] && r[1].trim() !== '' ? parseGovernmentNumber(r[1]) : null;
      const ws2024Val = r[2] && r[2].trim() !== '' ? parseGovernmentNumber(r[2]) : null;
      const ds2024_25Val = r[3] && r[3].trim() !== '' ? parseGovernmentNumber(r[3]) : null;
      const ws2025Val = r[4] && r[4].trim() !== '' ? parseGovernmentNumber(r[4]) : null;
      const ds2025_26Val = r[5] && r[5].trim() !== '' ? parseGovernmentNumber(r[5]) : null;
      const claimedVal = r[6] && r[6].trim() !== '' ? parseGovernmentNumber(r[6]) : null;
      const unutilizedVal = r[7] && r[7].trim() !== '' ? parseGovernmentNumber(r[7]) : null;

      const item: CommodityAllocation = {
        id: commodityName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        commodity: commodityName,
        category: commodityName,
        fund: fundVal,
        ws_2024: ws2024Val,
        ds_2024_25: ds2024_25Val,
        ws_2025: ws2025Val,
        ds_2025_26: ds2025_26Val,
        claimed: claimedVal,
        unutilized: unutilizedVal,
      };

      if (isTotal) {
        totalRow = item;
        break; // A2:H8 ends at TOTAL
      } else {
        allocations.push(item);
      }
    }

    if (allocations.length === 0) {
      return {
        allocations: FALLBACK_COMMODITY_CLAIMS,
        totalRow: null,
        fetchedAt: now,
        sourceUrl: COMMODITY_CLAIMS_SHEET_URL,
      };
    }

    return {
      allocations,
      totalRow,
      fetchedAt: now,
      sourceUrl: COMMODITY_CLAIMS_SHEET_URL,
    };
  } catch (err: any) {
    console.error('Error fetching commodity claims sheet:', err);
    return {
      allocations: FALLBACK_COMMODITY_CLAIMS,
      totalRow: null,
      fetchedAt: now,
      sourceUrl: COMMODITY_CLAIMS_SHEET_URL,
    };
  }
}
