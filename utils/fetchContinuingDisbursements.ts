export interface ContinuingDisbursementItem {
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
}

export interface FetchContinuingDisbursementResult {
  records: ContinuingDisbursementItem[];
  totals: {
    totalObligation: number;
    grossAmount: number;
    unpaidObligation: number;
    count: number;
  };
  fetchedAt: string;
  error?: string;
}

const CONTINUING_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1r1nx9Rhnixo_cUTq8XVU2ltuHbBiwMfKznkOOF9_j-Y/export?format=csv&gid=380689862';

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

export async function fetchContinuingDisbursements(): Promise<FetchContinuingDisbursementResult> {
  try {
    const res = await fetch(CONTINUING_SHEET_URL, {
      next: { revalidate: 60 },
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
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Payee') && lines[i].includes('TOTAL OBLIGATION')) {
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
    const unpaidIdx = headers.findIndex((h) => h.toUpperCase() === 'UNPAID OBLIGATION');
    const particularsIdx = headers.findIndex((h) => h.toUpperCase().includes('PARTICULAR'));
    const orsIdx = headers.findIndex((h) => h.toUpperCase().includes('ORS NUMBER'));
    const statusIdx = headers.findIndex((h) => h.toUpperCase().includes('ACCOUNTING STATUS') || h.toUpperCase() === 'STATUS');

    const records: ContinuingDisbursementItem[] = [];
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

      const totalObligRaw = cols[totalObligIdx] || '';
      const grossRaw = cols[grossIdx] || '';
      const unpaidRaw = cols[unpaidIdx] || '';
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
        id: `disb-cont-${i}`,
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
    console.error('fetchContinuingDisbursements error:', err);
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
