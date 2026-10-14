export interface CategoryObligationData {
  id: string;
  name: string;
  // Allotment: Current, Continuing, Total
  allocation: number; // Current Allotment
  continuingAlloc?: number; // Continuing Allotment
  totalAlloc?: number; // Total Allotment
  // Obligation: Current, Continuing, Total
  obligated: number; // Current Obligation
  continuingOblig?: number; // Continuing Obligation
  totalOblig?: number; // Total Obligation
  // Unobligated: Current, Continuing, Total
  unobligated?: number; // Current Unobligated
  unobligatedCurrent?: number; // Current Unobligated
  unobligatedContinuing?: number; // Continuing Unobligated
  unobligatedTotal?: number; // Total Unobligated
  // Rates: Current, Continuing, Total
  rate: number; // Current Rate (% Obligated of Current Allotment)
  rateContinuing?: number; // Continuing Rate (% Obligated of Continuing Allotment)
  rateTotal?: number; // Total Rate (% Obligated of Total Allotment)
}

export interface RiceObligationsSheetResult {
  categories: CategoryObligationData[];
  totalBannerRice: CategoryObligationData;
  paefRice: CategoryObligationData;
  fetchedAt: string;
  sourceUrl: string;
}

export const TARGET_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1lQW1zRdcR4hS2-VNqv0HVN-aQojcix2Nrc-bpeuMIAk/export?format=csv&gid=262455718';

// Fallback numbers directly extracted from authoritative SAAODB Google Sheet
export const FALLBACK_RICE_OBLIGATION_CATEGORIES: CategoryObligationData[] = [
  {
    id: 'pss',
    name: 'PSS RICE',
    allocation: 513163000.0,
    continuingAlloc: 56511602.0,
    totalAlloc: 569674602.0,
    obligated: 491111589.5,
    continuingOblig: 8682602.0,
    totalOblig: 499794191.5,
    unobligated: 22051410.5,
    unobligatedCurrent: 22051410.5,
    unobligatedContinuing: 47829000.0,
    unobligatedTotal: 69880410.5,
    rate: 95.70284,
    rateContinuing: 15.36428,
    rateTotal: 87.73328,
  },
  {
    id: 'esets',
    name: 'ESETS RICE',
    allocation: 96432159.0,
    continuingAlloc: 5499248.35,
    totalAlloc: 101931407.35,
    obligated: 59862758.78,
    continuingOblig: 5164753.35,
    totalOblig: 65027512.13,
    unobligated: 36569400.22,
    unobligatedCurrent: 36569400.22,
    unobligatedContinuing: 334495.0,
    unobligatedTotal: 36903895.22,
    rate: 62.07759,
    rateContinuing: 93.91744,
    rateTotal: 63.79536,
  },
  {
    id: 'rd',
    name: 'RD RICE',
    allocation: 13753000.0,
    continuingAlloc: 1474571.18,
    totalAlloc: 15227571.18,
    obligated: 10476444.47,
    continuingOblig: 781170.18,
    totalOblig: 11257614.65,
    unobligated: 3276555.53,
    unobligatedCurrent: 3276555.53,
    unobligatedContinuing: 693401.0,
    unobligatedTotal: 3969956.53,
    rate: 76.17571,
    rateContinuing: 52.97609,
    rateTotal: 73.92915,
  },
  {
    id: 'ins',
    name: 'INS RICE',
    allocation: 22100000.0,
    continuingAlloc: 3411338.85,
    totalAlloc: 25511338.85,
    obligated: 15563621.63,
    continuingOblig: 3411338.85,
    totalOblig: 18974960.48,
    unobligated: 6536378.37,
    unobligatedCurrent: 6536378.37,
    unobligatedContinuing: 0.0,
    unobligatedTotal: 6536378.37,
    rate: 70.42363,
    rateContinuing: 100.0,
    rateTotal: 74.37854,
  },
];

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

export async function fetchRiceObligationsFromGoogleSheet(): Promise<RiceObligationsSheetResult> {
  const now = new Date().toISOString();
  try {
    const cacheBusterUrl = `${TARGET_GOOGLE_SHEET_URL}&_cb=${Date.now()}`;
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
    const lines = parseCSV(csvText);

    const parseRow = (id: string, name: string, row: string[]): CategoryObligationData => {
      const alloc = parseGovernmentNumber(row[7]);
      const continuingAlloc = parseGovernmentNumber(row[8]);
      const totalAlloc = parseGovernmentNumber(row[9]);
      const oblig = parseGovernmentNumber(row[10]);
      const continuingOblig = parseGovernmentNumber(row[11]);
      const totalOblig = parseGovernmentNumber(row[12]);
      const unobligated = parseGovernmentNumber(row[13]);
      const unobligatedContinuing = parseGovernmentNumber(row[14]);
      const unobligatedTotal = parseGovernmentNumber(row[15]);
      // % Obligation versus Allotment from Columns Q (Current), R (Continuing), S (Total) - Q61:S66
      const sheetRateCurrent = parseGovernmentNumber(row[16]);
      const sheetRateContinuing = parseGovernmentNumber(row[17]);
      const sheetRateTotal = parseGovernmentNumber(row[18]);

      const rate = sheetRateCurrent > 0 ? sheetRateCurrent : (alloc > 0 ? (oblig / alloc) * 100 : 0);
      const rateContinuing = sheetRateContinuing > 0 ? sheetRateContinuing : (continuingAlloc > 0 ? (continuingOblig / continuingAlloc) * 100 : 0);
      const rateTotal = sheetRateTotal > 0 ? sheetRateTotal : (totalAlloc > 0 ? (totalOblig / totalAlloc) * 100 : 0);
      return {
        id,
        name,
        allocation: alloc,
        continuingAlloc,
        totalAlloc: totalAlloc > 0 ? totalAlloc : alloc + continuingAlloc,
        obligated: oblig,
        continuingOblig,
        totalOblig: totalOblig > 0 ? totalOblig : oblig + continuingOblig,
        unobligated,
        unobligatedCurrent: unobligated,
        unobligatedContinuing,
        unobligatedTotal: unobligatedTotal > 0 ? unobligatedTotal : unobligated + unobligatedContinuing,
        rate,
        rateContinuing,
        rateTotal,
      };
    };

    // Find rows dynamically by matching the specified names/codes:
    // 310101100001000 PSS RICE
    // 310103100001000 ESETS RICE
    // 310104100001000 RD RICE
    const bannerRiceRow =
      lines.find((r, i) => i >= 55 && i <= 75 && (r[1] || '').trim().toUpperCase() === 'RICE') ||
      lines[62] ||
      [];

    const pssRow =
      lines.find((r) => r.some((c) => c.includes('310101100001000 PSS RICE'))) ||
      lines.find((r, i) => i >= 55 && i <= 75 && (r[4] || '').trim().toUpperCase() === 'PSS') ||
      lines[63] ||
      [];

    const esetsRow =
      lines.find((r) => r.some((c) => c.includes('310103100001000 ESETS RICE'))) ||
      lines.find((r, i) => i >= 55 && i <= 75 && (r[4] || '').trim().toUpperCase() === 'ESETS') ||
      lines[64] ||
      [];

    const rdRow =
      lines.find((r) => r.some((c) => c.includes('310104100001000 RD RICE'))) ||
      lines.find((r, i) => i >= 55 && i <= 75 && (r[4] || '').trim().toUpperCase() === 'RD') ||
      lines[65] ||
      [];

    const insRow =
      lines.find((r) => r.some((c) => c.includes('310202100001000 INS RICE'))) ||
      lines.find((r, i) => i >= 55 && i <= 75 && (r[4] || '').trim().toUpperCase() === 'INS') ||
      lines[67] ||
      [];

    const paefRow =
      lines.find((r) => r.some((c) => c.includes('310201100001000 PAEF RICE'))) ||
      lines.find((r, i) => i >= 55 && i <= 75 && (r[4] || '').trim().toUpperCase() === 'PAEF') ||
      lines[66] ||
      [];

    // Only fetch data with the specified names
    const categories: CategoryObligationData[] = [
      parseRow('pss', 'PSS RICE', pssRow),
      parseRow('esets', 'ESETS RICE', esetsRow),
      parseRow('rd', 'RD RICE', rdRow),
      parseRow('ins', 'INS RICE', insRow),
    ];

    const totalBannerRice = parseRow('total_rice', 'TOTAL BANNER RICE', bannerRiceRow);
    const paefRice = parseRow('paef', 'PAEF RICE', paefRow);

    return {
      categories,
      totalBannerRice,
      paefRice,
      fetchedAt: now,
      sourceUrl: TARGET_GOOGLE_SHEET_URL,
    };
  } catch (err) {
    console.warn('Falling back to authoritative SAAODB data:', err);
    return {
      categories: FALLBACK_RICE_OBLIGATION_CATEGORIES,
      totalBannerRice: {
        id: 'total_rice',
        name: 'TOTAL BANNER RICE',
        allocation: 645448159.0,
        continuingAlloc: 66896760.38,
        totalAlloc: 712344919.38,
        obligated: 577014414.38,
        continuingOblig: 18039864.38,
        totalOblig: 595054278.76,
        unobligated: 68433744.62,
        unobligatedCurrent: 68433744.62,
        unobligatedContinuing: 48856896.0,
        unobligatedTotal: 117290640.62,
        rate: 89.39733,
        rateContinuing: 26.96672,
        rateTotal: 83.53457,
      },
      paefRice: {
        id: 'paef',
        name: 'PAEF RICE',
        allocation: 0,
        obligated: 0,
        rate: 0,
      },
      fetchedAt: now,
      sourceUrl: TARGET_GOOGLE_SHEET_URL,
    };
  }
}

