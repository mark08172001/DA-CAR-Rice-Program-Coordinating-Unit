import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const GOOGLE_SHEET_EXPORT_URL =
  'https://docs.google.com/spreadsheets/d/1prg2YjXMCUnTtod4F0rVgPL9Ij136F4jBv8t7fHUyI4/export?format=csv&gid=0';

const GOOGLE_SHEET_REF_URL =
  'https://docs.google.com/spreadsheets/d/1prg2YjXMCUnTtod4F0rVgPL9Ij136F4jBv8t7fHUyI4/edit?gid=0#gid=0';

const TARGET_PAPS = [
  '310101100001000',
  '310103100001000',
  '310104100001000',
  '310202100001000',
];

export interface EarmarkedActiveRow {
  id: string;
  rowIndex: number;
  utilization: string;
  source: string;
  sourceFund: string;
  inputtedDate: string;
  dueDate: string;
  fund: string;
  type: string;
  prNo: string;
  earmarkNo: string;
  requestedBy: string;
  particular: string;
  pap: string;
  rc: string;
  objectCode: string;
  description: string;
  allotmentClass: string;
  amount: number;
  status: string;
  remarks: string;
}

function getLocalCache(): { count: number; rows: EarmarkedActiveRow[]; objectCodes: string[]; fetchedAt: string } | null {
  try {
    const cachePath = path.join(process.cwd(), 'data', 'earmarked_active_cache.json');
    if (fs.existsSync(cachePath)) {
      const raw = fs.readFileSync(cachePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading earmarked local cache:', err);
  }
  return null;
}

function saveLocalCache(payload: any) {
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const cachePath = path.join(dir, 'earmarked_active_cache.json');
    fs.writeFileSync(cachePath, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving earmarked local cache:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Attempt live fetch with cache-busting
    const fetchUrl = `${GOOGLE_SHEET_EXPORT_URL}&_cb=${Date.now()}`;
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/csv, application/csv, text/plain, */*',
      },
      cache: 'no-store',
      next: { revalidate: 0 },
    });

    if (response.ok) {
      const csvText = await response.text();
      const workbook = XLSX.read(csvText, { type: 'string', raw: false });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const parsedRows: EarmarkedActiveRow[] = [];
      const objectCodesSet = new Set<string>();

      for (let i = 1; i < data.length; i++) {
        const r = data[i];
        if (!r || r.length < 5) continue;

        const status = String(r[17] || '').trim().toUpperCase();
        const pap = String(r[11] || '').trim();
        const isTargetPap =
          TARGET_PAPS.some((p) => pap.includes(p)) ||
          pap.toUpperCase().includes('PSS RICE') ||
          pap.toUpperCase().includes('ESETS RICE') ||
          pap.toUpperCase().includes('RD RICE') ||
          pap.toUpperCase().includes('INS RICE');

        if (isTargetPap && status === 'ACTIVE') {
          const rawAmount = r[16];
          let numAmount = 0;
          if (typeof rawAmount === 'number') {
            numAmount = rawAmount;
          } else {
            numAmount = parseFloat(String(rawAmount || '0').replace(/[₱,$\s]/g, '')) || 0;
          }

          const objDesc = String(r[14] || '').trim();
          if (objDesc) objectCodesSet.add(objDesc);

          parsedRows.push({
            id: `em-active-${i}`,
            rowIndex: i + 1,
            utilization: String(r[0] || '').trim(),
            source: String(r[1] || '').trim(),
            sourceFund: String(r[2] || '').trim(),
            inputtedDate: String(r[3] || '').trim(),
            dueDate: String(r[4] || '').trim(),
            fund: String(r[5] || '').trim(),
            type: String(r[6] || '').trim(),
            prNo: String(r[7] || '').trim(),
            earmarkNo: String(r[8] || '').trim(),
            requestedBy: String(r[9] || '').trim(),
            particular: String(r[10] || '').trim(),
            pap,
            rc: String(r[12] || '').trim(),
            objectCode: String(r[13] || '').trim(),
            description: objDesc,
            allotmentClass: String(r[15] || '').trim(),
            amount: numAmount,
            status: 'ACTIVE',
            remarks: String(r[18] || '').trim(),
          });
        }
      }

      if (parsedRows.length > 0) {
        const result = {
          success: true,
          count: parsedRows.length,
          sourceUrl: GOOGLE_SHEET_REF_URL,
          fetchedAt: new Date().toISOString(),
          objectCodes: Array.from(objectCodesSet).sort(),
          rows: parsedRows,
        };
        saveLocalCache(result);
        return NextResponse.json(result);
      }
    }
  } catch (err) {
    console.warn('Error fetching live Google Sheet for Earmarks, falling back to cache:', err);
  }

  // Fallback to local cache
  const cached = getLocalCache();
  if (cached) {
    return NextResponse.json({
      ...cached,
      isFallback: true,
      sourceUrl: GOOGLE_SHEET_REF_URL,
    });
  }

  return NextResponse.json(
    {
      success: false,
      error: 'Failed to fetch Earmarked 2026 Google Sheet and no local cache available.',
    },
    { status: 500 }
  );
}
