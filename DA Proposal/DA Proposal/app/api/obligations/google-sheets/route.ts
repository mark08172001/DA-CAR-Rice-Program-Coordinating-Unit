import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import {
  saveObligations,
  getAllSheets,
  ObligationBalanceRow,
} from '@/utils/obligationsStore';

export const dynamic = 'force-dynamic';

// Helper to normalize keys for fuzzy matching
const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const parseGovernmentNumber = (val: any): number => {
  if (val === undefined || val === null) return 0;
  let str = String(val).trim();
  if (str === '' || str === '-' || str === '—' || str.includes('#DIV') || str === 'NaN') return 0;
  const isNegative = (str.startsWith('(') && str.endsWith(')')) || str.startsWith('-');
  str = str.replace(/[₱,$\s()]/g, '');
  const n = parseFloat(str);
  if (isNaN(n)) return 0;
  return isNegative ? -Math.abs(n) : n;
};

// Extracts Google Spreadsheet ID and GID from varied URL formats
function parseGoogleSheetUrl(inputUrl: string): { spreadsheetId: string; gid: string } | null {
  try {
    const trimmed = inputUrl.trim();
    if (!trimmed) return null;

    // Pattern 1: standard /d/{spreadsheetId}/edit#gid={gid} or /d/{spreadsheetId}
    const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!idMatch || !idMatch[1]) {
      return null;
    }
    const spreadsheetId = idMatch[1];

    // GID extraction: #gid=12345 or ?gid=12345
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    return { spreadsheetId, gid };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      url,
      sheetName = 'Google Sheet (Live)',
      autoSave = true,
    } = body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json(
        { success: false, error: 'Google Spreadsheet URL is required.' },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();
    let exportUrl: string;

    // If it's already a direct published CSV link
    if (trimmedUrl.includes('pub?output=csv') || trimmedUrl.includes('export?format=csv')) {
      exportUrl = trimmedUrl;
    } else {
      const parsed = parseGoogleSheetUrl(trimmedUrl);
      if (!parsed) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid Google Sheets link. Please provide a valid URL like: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=0',
          },
          { status: 400 }
        );
      }
      exportUrl = `https://docs.google.com/spreadsheets/d/${parsed.spreadsheetId}/export?format=csv&gid=${parsed.gid}`;
    }

    // Fetch the CSV export from Google
    const response = await fetch(exportUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/csv, application/csv, text/plain, */*',
      },
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Access denied by Google. Please check your sheet sharing settings: Click "Share" in Google Sheets and set General Access to "Anyone with the link can view".',
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: `Google Sheets returned HTTP error status ${response.status} (${response.statusText}).`,
        },
        { status: 502 }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const textData = await response.text();

    // Check if Google returned an HTML login page instead of CSV
    if (
      contentType.includes('text/html') ||
      textData.includes('<!DOCTYPE html>') ||
      textData.includes('accounts.google.com') ||
      textData.includes('ServiceLogin')
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'The Google Sheet is private or requires sign-in. To allow real-time tracking, open the Google Sheet, click "Share" (top-right), and set General access to "Anyone with the link" (Viewer).',
        },
        { status: 403 }
      );
    }

    // Parse CSV data via XLSX library
    const workbook = XLSX.read(textData, { type: 'string', raw: false });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return NextResponse.json(
        { success: false, error: 'Could not read any worksheet in the Google Sheet.' },
        { status: 400 }
      );
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[firstSheetName], {
      defval: '',
    });

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'The Google Sheet appears to be empty or has no data rows.' },
        { status: 400 }
      );
    }

    // Exclusively pull data under Rice: FPMA, PSS, ESETS, RD, INS
    const RICE_COMPONENTS = [
      {
        key: 'FPMA',
        test: (p: string) => p.includes('FPMA-RICE') || (p.includes('FPMA') && p.includes('RICE')),
      },
      {
        key: 'PSS',
        test: (p: string) => p.includes('PSS RICE') || p.includes('PSS-RICE'),
      },
      {
        key: 'ESETS',
        test: (p: string) => p.includes('ESETS RICE') || (p.includes('ESETS') && p.includes('RICE')),
      },
      {
        key: 'RD',
        test: (p: string) => p.includes('RD RICE') || (p.includes('RD') && p.includes('RICE')),
      },
      {
        key: 'INS',
        test: (p: string) => p.includes('INS RICE') || (p.includes('INS') && p.includes('RICE')),
      },
    ];

    let currentFund = '';
    let currentRicePap: string | null = null;
    const riceFiltered: Record<string, any>[] = [];

    for (const r of rawRows) {
      // Track active fund across spreadsheet sections
      const rawFund = String(r.FUND || r.fund || r['Fund Cluster'] || r['Fund Source'] || '').trim();
      if (rawFund && !rawFund.toLowerCase().includes('total')) {
        currentFund = rawFund;
      }

      const rawPap = String(r.PAP || r.pap || '').trim().toUpperCase();

      if (rawPap) {
        const matched = RICE_COMPONENTS.find((c) => c.test(rawPap));
        if (matched) {
          currentRicePap = String(r.PAP || r.pap).trim();
        } else {
          // If a new PAP starts that does not match the 5 Rice categories, stop capturing
          currentRicePap = null;
        }
      }

      if (currentRicePap) {
        const rowCopy = { ...r };
        // Ensure child subtotals inherit parent PAP label
        if (!rowCopy.PAP && !rowCopy.pap) {
          rowCopy.PAP = currentRicePap;
        }
        // Inherit active fund if child row has blank fund
        if (!rowCopy.FUND && !rowCopy.fund && currentFund) {
          rowCopy.FUND = currentFund;
        }
        riceFiltered.push(rowCopy);
      }

      // Check if this row is the closing category total
      if (rawPap.endsWith('TOTAL') && RICE_COMPONENTS.some((c) => c.test(rawPap))) {
        currentRicePap = null;
      }
    }

    if (riceFiltered.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Could not find any data rows under Rice (FPMA, PSS, ESETS, RD, INS). Please verify your Google Sheet contains these PAP categories.',
        },
        { status: 400 }
      );
    }

    const targetRawRows = riceFiltered;
    const isFilteredToRice = true;

    // Map rows into official ObligationBalanceRow structure
    let cleanedRows: ObligationBalanceRow[] = targetRawRows
      .filter((r) => Object.values(r).some((v) => v !== undefined && v !== null && String(v).trim() !== ''))
      .map((r, i) => {
        const getField = (...aliases: string[]) => {
          const targets = aliases.map(norm);
          for (const t of targets) {
            for (const key of Object.keys(r)) {
              if (norm(key) === t) {
                const val = r[key];
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                  return String(val).trim();
                }
              }
            }
          }
          return '';
        };

        const getNum = (...aliases: string[]) => {
          const raw = getField(...aliases);
          return parseGovernmentNumber(raw);
        };

        let fund = getField('FUND', 'fund', 'Fund Cluster', 'Fund Source', 'gass', 'GASS', 'Fund/GASS');
        if (!fund) {
          const firstKey = Object.keys(r)[0];
          if (firstKey && r[firstKey] !== undefined && r[firstKey] !== null) {
            const rawVal = String(r[firstKey]).trim();
            if (rawVal) fund = rawVal;
          }
        }
        const hasGrandTotal = Object.values(r).some((v) => String(v || '').toLowerCase().trim() === 'grand total');
        if (hasGrandTotal) {
          fund = 'Grand Total';
        }

        const pap = getField('PAP', 'pap', 'PPA', 'Program');
        const source = getField('SOURCE', 'source', 'Source of Funds');
        const allotmentClass = getField('CLASS', 'class', 'Allotment Class', 'Object Class').toUpperCase();
        const rc = getField('RC', 'rc', 'Responsibility Center', 'Station', 'Province');
        const objCode = getField('OBJ CODE', 'obj_code', 'OBJCODE', 'Object Code', 'UACS');
        const description = getField('DESCRIPTION', 'description', 'Particulars', 'Purpose');

        const appropriations = getNum('APPROPRIATIONS', 'appropriations', 'Appropriation');
        const adjustedAllotment = getNum('ADJUSTED ALLOTMENT', 'adjusted_allotment', 'Allotment', 'Adjusted');
        const totalObligation = getNum('TOTAL OBLIGATION', 'total_obligation', 'Obligated', 'Obligation');
        const earmark = getNum('EARMARK', 'earmark', 'Earmarks');
        const disbursement = getNum('DISBURSEMENT', 'disbursement', 'Disbursed', 'Cash Paid', 'Paid');

        const rawUnobligated = getField('UNOBLIGATED ALLOTMENT', 'unobligated_allotment', 'Unobligated');
        const unobligated =
          rawUnobligated !== ''
            ? parseGovernmentNumber(rawUnobligated)
            : adjustedAllotment - totalObligation;

        const rawUnallocated = getField('UNALLOCATED ALLOTMENT', 'unallocated_allotment', 'Unallocated');
        const unallocated =
          rawUnallocated !== ''
            ? parseGovernmentNumber(rawUnallocated)
            : unobligated - earmark;

        const rawUnpaid = getField('UNPAID', 'unpaid', 'Unpaid Obligations');
        const unpaid =
          rawUnpaid !== ''
            ? parseGovernmentNumber(rawUnpaid)
            : Math.max(0, totalObligation - disbursement);

        return {
          id: `gsheet-${i + 1}`,
          sheet_name: sheetName,
          row_order: i + 1,
          fund,
          pap,
          source,
          class: allotmentClass,
          rc,
          obj_code: objCode,
          description,
          appropriations,
          adjusted_allotment: adjustedAllotment,
          total_obligation: totalObligation,
          unobligated_allotment: unobligated,
          earmark,
          unallocated_allotment: unallocated,
          disbursement,
          unpaid,
          created_at: new Date(Date.now() + i * 2).toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

    // Strictly ensure all returned rows belong ONLY to FPMA, PSS, ESETS, RD, or INS (or Rice Program Total)
    cleanedRows = cleanedRows.filter((r) => {
      const p = (r.pap || '').toUpperCase();
      const f = (r.fund || '').toUpperCase();
      if (f === 'GRAND TOTAL' || p.includes('RICE PROGRAM TOTAL')) return true;
      return (
        p.includes('FPMA') ||
        p.includes('PSS') ||
        p.includes('ESETS') ||
        p.includes('RD RICE') || p.includes('RD-RICE') || (/\bRD\b/.test(p) && !p.includes('ORED')) ||
        p.includes('INS')
      );
    });

    if (cleanedRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Could not find any data rows under Rice (FPMA, PSS, ESETS, RD, INS). Please verify your Google Sheet contains these PAP categories.',
        },
        { status: 400 }
      );
    }

    // If filtered to Rice and no existing overall Grand Total row in the slice, append the Authoritative Rice Grand Total
    if (isFilteredToRice && !cleanedRows.some((r) => (r.fund || '').toLowerCase() === 'grand total')) {
      const papTotals = cleanedRows.filter((r) => (r.pap || '').toUpperCase().endsWith('TOTAL'));

      let totalApp = 0;
      let totalAdj = 0;
      let totalObl = 0;
      let totalUnob = 0;
      let totalEar = 0;
      let totalUnall = 0;
      let totalDisb = 0;
      let totalUnp = 0;

      if (papTotals.length > 0) {
        for (const pt of papTotals) {
          totalApp += pt.appropriations || 0;
          totalAdj += pt.adjusted_allotment || 0;
          totalObl += pt.total_obligation || 0;
          totalUnob += pt.unobligated_allotment || 0;
          totalEar += pt.earmark || 0;
          totalUnall += pt.unallocated_allotment || 0;
          totalDisb += pt.disbursement || 0;
          totalUnp += pt.unpaid || 0;
        }
      } else {
        const lineItems = cleanedRows.filter(
          (r) =>
            !(r.fund || '').toLowerCase().includes('total') &&
            !(r.pap || '').toLowerCase().includes('total') &&
            !(r.rc || '').toLowerCase().includes('total') &&
            !(r.class || '').toLowerCase().includes('total')
        );
        for (const li of lineItems) {
          totalApp += li.appropriations || 0;
          totalAdj += li.adjusted_allotment || 0;
          totalObl += li.total_obligation || 0;
          totalEar += li.earmark || 0;
          totalDisb += li.disbursement || 0;
        }
        totalUnob = totalAdj - totalObl;
        totalUnall = totalUnob - totalEar;
        totalUnp = Math.max(0, totalObl - totalDisb);
      }

      cleanedRows.push({
        id: `gsheet-rice-grand-total`,
        sheet_name: sheetName,
        row_order: cleanedRows.length + 1,
        fund: 'Grand Total',
        pap: 'RICE PROGRAM TOTAL',
        source: 'GAA / Continuing',
        class: '',
        rc: 'DA-CAR Regional Rice Program',
        obj_code: '',
        description: 'Grand Total: Rice Banner Program (FPMA, PSS, ESETS, RD, INS)',
        appropriations: totalApp,
        adjusted_allotment: totalAdj,
        total_obligation: totalObl,
        unobligated_allotment: totalUnob,
        earmark: totalEar,
        unallocated_allotment: totalUnall,
        disbursement: totalDisb,
        unpaid: totalUnp,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    let updatedSheets: Array<{ name: string; count: number; updatedAt?: string }> | undefined;

    // Automatically persist to obligationsStore if requested
    if (autoSave) {
      await saveObligations(cleanedRows, sheetName);
      updatedSheets = await getAllSheets();
    }

    const lastSyncedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      sheetName,
      count: cleanedRows.length,
      rows: cleanedRows,
      sheets: updatedSheets,
      lastSyncedAt,
      exportUrl,
    });
  } catch (error: any) {
    console.error('Google Sheets sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred while syncing with Google Sheets.',
      },
      { status: 500 }
    );
  }
}
