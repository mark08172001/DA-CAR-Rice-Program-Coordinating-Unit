import fs from 'fs';
import path from 'path';

export type ProvinceName =
  | 'All Provinces'
  | 'Abra'
  | 'Apayao'
  | 'Benguet'
  | 'Ifugao'
  | 'Kalinga'
  | 'Mountain Province';

export type FundSourceName =
  | 'All Fund Sources'
  | 'GAA 2026 - Regular'
  | 'GAA 2026 - Regular WS'
  | 'GAA 2026 - Regular DS'
  | 'GAA 2026 - Model Farm'
  | 'GAA 2026 - Seed Reserve'
  | 'Unprogrammed Fund 2025'
  | 'Continuing 2025'
  | 'GAA 2025'
  | string;

export type InputCategoryName =
  | 'All Categories'
  | 'Inorganic Fertilizer'
  | 'Hybrid Rice Seeds'
  | 'Biofertilizer'
  | 'Liquid / Foliar Fertilizer'
  | 'Wettable Powder / Protection'
  | 'Soil Ameliorant'
  | 'Inbred / Seed Reserve';

export interface ContractLineItem {
  row: number;
  fundSource: Exclude<FundSourceName, 'All Fund Sources'>;
  ibNo: string;
  ntpNo: string;
  ntpQty: number;
  unitPrice: number;
  unit: string;
  amount: number;
  supplier: string;
  product: string;
  category: Exclude<InputCategoryName, 'All Categories'>;
}

export type SeasonName =
  | 'All Seasons'
  | 'Wet Season (WS 2026)'
  | 'Dry Season (DS 2026-2027)'
  | 'Model Farm'
  | 'Seed Reserve'
  | 'General / Regular & Carryover';

export interface DeliverySiteItem {
  row: number;
  fundSource: Exclude<FundSourceName, 'All Fund Sources'>;
  ibNo: string;
  supplier: string;
  product: string;
  category: Exclude<InputCategoryName, 'All Categories'>;
  quantity: number;
  unit: string;
  municipality: string;
  province: Exclude<ProvinceName, 'All Provinces'>;
  season: Exclude<SeasonName, 'All Seasons'>;
  regWS2026: number;
  regDS2026_2027: number;
  mfWS2026: number;
  mfDS2026_2027: number;
}

export interface SummaryOfSuppliesResult {
  contracts: ContractLineItem[];
  deliveries: DeliverySiteItem[];
  fetchedAt: string;
  sourceUrl: string;
}

export const SUMMARY_OF_SUPPLIES_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/14yYevFb_7qQ2RGiLTD4FbxAiN_l94krxXH78KbcG9kE/export?format=csv&gid=1578812300';

const CACHE_FILE = path.join(process.cwd(), 'data', 'summary_of_supplies_cache.json');
const CACHE_TTL_MS = 30 * 1000; // 30s fresh TTL + instant stale-while-revalidate

const gGlobal = globalThis as unknown as {
  __daSummaryOfSuppliesCache?: { data: SummaryOfSuppliesResult; timestamp: number };
  __daSummaryOfSuppliesInflight?: Promise<SummaryOfSuppliesResult> | null;
};

function parseNumber(val: unknown): number {
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
      if (row.some((cell) => cell.trim() !== '')) lines.push(row);
      row = [];
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur !== '' || row.length > 0) {
    row.push(cur);
    if (row.some((cell) => cell.trim() !== '')) lines.push(row);
  }
  return lines;
}

function normalizeFundSource(raw: string): string {
  const s = raw.replace(/\s+/g, ' ').trim();
  const u = s.toUpperCase();
  if (u.includes('UNPROGRAMMED FUND 2025')) return 'Unprogrammed Fund 2025';
  if (u.includes('CONTINUING 2025')) return 'Continuing 2025';
  if (u.includes('GAA 2026') && u.includes('REGULAR WS')) return 'GAA 2026 - Regular WS';
  if (u.includes('GAA 2026') && u.includes('REGULAR DS')) return 'GAA 2026 - Regular DS';
  if (u.includes('GAA 2026') && u.includes('REGULAR')) return 'GAA 2026 - Regular';
  if (u.includes('GAA 2026') && u.includes('MODEL FARM')) return 'GAA 2026 - Model Farm';
  if (u.includes('GAA 2026') && u.includes('SEED RESERVE')) return 'GAA 2026 - Seed Reserve';
  if (u.includes('GAA 2025')) return 'GAA 2025';
  return s;
}

function normalizeSupplier(raw: string): string {
  const s = raw.replace(/\s+/g, ' ').trim();
  const u = s.toUpperCase();
  if (!s) return '';
  if (u.includes('ADA MANUFACTURING')) return 'ADA Manufacturing Corporation';
  if (u.includes('STY BATAC')) return 'STY Batac Agro-Industrial Trading';
  if (u.includes('ST. JOSEPH')) return 'St. Joseph Agrimarketing Corp.';
  if (u.includes('SEED TO RICE')) return 'Seed To Rice Producers (S2R)';
  if (u.includes('JCV')) return 'JCV Worldwide Traders Corp.';
  if (u.includes('LEADS AGRICULTURAL')) return 'Leads Agricultural Products Corp.';
  if (u.includes('JEDECO')) return 'JEDECO Trading Corporation';
  if (u.includes('GLOBAL GREEN')) return 'Global Green Organic Fertilizer, Inc.';
  if (u.includes('UNIFIED TILLERS')) return 'Unified Tillers Agriculture Cooperative';
  if (u.includes('NS AGRICULTURAL')) return 'NS Agricultural Distribution Inc.';
  if (u.includes('AGRI BUNCH')) return 'Agri Bunch Products OPC';
  if (u.includes('FLORA FARMERS')) return 'Flora Farmers Cluster Agriculture Coop.';
  if (u.includes('SL AGRITECH')) return 'SL Agritech Corporation';
  if (u.includes('GREEN AND GROW')) return 'Green and Grow Teknologies, Inc.';
  if (u.includes('PHILRICE')) return 'DA-PhilRice Isabela';
  if (u.includes('MATAGOAN')) return 'Matagoan Multipurpose Cooperative';
  if (u.includes('ALJAY')) return 'Aljay Agro-Industrial Solutions, Inc.';
  if (u.includes('MODERN TIMES')) return 'Modern Times';
  return s;
}

function normalizeProvince(raw: string): Exclude<ProvinceName, 'All Provinces'> | '' {
  const u = raw.replace(/\s+/g, ' ').trim().toUpperCase();
  if (!u) return '';
  if (u.includes('ABRA')) return 'Abra';
  if (u.includes('APAYAO')) return 'Apayao';
  if (u.includes('BENGUET')) return 'Benguet';
  if (u.includes('IFUGAO')) return 'Ifugao';
  if (u.includes('KALINGA')) return 'Kalinga';
  if (u.includes('MOUNTAIN') || u.includes('MT.')) return 'Mountain Province';
  return '';
}

function normalizeMunicipality(raw: string): string {
  const s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return 'Provincial / OPAG Drop-off';
  if (s.toUpperCase() === 'RIZAL') return 'Rizal';
  if (s.toUpperCase() === 'OPAG') return 'OPAG';
  return s;
}

function classifyCategory(product: string): Exclude<InputCategoryName, 'All Categories'> {
  const p = product.toLowerCase();
  if (
    p.includes('urea') ||
    p.includes('complete') ||
    p.includes('muriate') ||
    p.includes('potash') ||
    p.includes('phosphorous') ||
    p.includes('ammonium')
  ) {
    return 'Inorganic Fertilizer';
  }
  if (
    p.includes('adaboost') ||
    p.includes('consort') ||
    p.includes('bioprime') ||
    p.includes('unigrow') ||
    p.includes('xplorer') ||
    p.includes('emas') ||
    p.includes('yama-n')
  ) {
    return 'Biofertilizer';
  }
  if (p.includes('humi-n') || p.includes('hyfer') || p.includes('semia')) {
    return 'Liquid / Foliar Fertilizer';
  }
  if (p.includes('sureharvest')) {
    return 'Soil Ameliorant';
  }
  if (p.includes('wettable')) {
    return 'Wettable Powder / Protection';
  }
  if (
    p.includes('rc222') ||
    p.includes('rc218') ||
    p.includes('rc480') ||
    p.includes('rc512') ||
    p.includes('rc534') ||
    p.includes('rc402') ||
    p.includes('rc18') ||
    p.includes('inbred')
  ) {
    return 'Inbred / Seed Reserve';
  }
  return 'Hybrid Rice Seeds';
}

function deriveSeason(
  fundSource: string,
  municipality: string,
  regWS: number,
  regDS: number,
  mfWS: number,
  mfDS: number
): Exclude<SeasonName, 'All Seasons'> {
  const fs = fundSource.toUpperCase();
  const mun = municipality.toUpperCase();
  if (regDS > 0 || mfDS > 0 || fs.includes('REGULAR DS') || mun.includes('(DS)')) {
    return 'Dry Season (DS 2026-2027)';
  }
  if (regWS > 0 || mfWS > 0 || fs.includes('REGULAR WS')) {
    return 'Wet Season (WS 2026)';
  }
  if (fs.includes('MODEL FARM') || mun.includes('MODEL FARM')) {
    return 'Model Farm';
  }
  if (fs.includes('SEED RESERVE')) {
    return 'Seed Reserve';
  }
  return 'General / Regular & Carryover';
}

function getDiskCache(): { data: SummaryOfSuppliesResult; timestamp: number } | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (parsed?.data?.contracts && parsed?.data?.deliveries) {
        return parsed;
      }
    }
  } catch {
    // Ignore disk cache read errors
  }
  return null;
}

function saveDiskCache(entry: { data: SummaryOfSuppliesResult; timestamp: number }) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(entry), 'utf8');
  } catch {
    // Ignore disk cache write errors
  }
}

function parseSummaryOfSuppliesCSV(csvText: string, fetchedAt: string): SummaryOfSuppliesResult {
  const rows = parseCSV(csvText);
  const contracts: ContractLineItem[] = [];
  const deliveries: DeliverySiteItem[] = [];

  let currentFundSource = '';
  let currentIbNo = '';
  let currentSupplier = '';
  let currentProduct = '';
  let currentUnit = 'units';

  // Data starts after the 3 header rows (index 3 -> sheet row 2 relative to data)
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const sheetRowNum = i - 1; // Matches row index numbering (first data row = 2)

    const rawFundSource = (row[0] || '').trim();
    const rawIbNo = (row[1] || '').trim();
    const rawNtpNo = (row[2] || '').trim();
    const ntpQty = parseNumber(row[3]);
    const unitPrice = parseNumber(row[4]);
    const rawNtpUnit = (row[5] || '').trim();
    const amount = parseNumber(row[6]);
    const rawSupplier = (row[7] || '').trim();
    const rawProduct = (row[8] || '').trim();

    const siteQty = parseNumber(row[9]);
    const rawSiteUnit = (row[10] || '').trim();
    const rawMun = (row[11] || '').trim();
    const rawProvince = (row[12] || '').trim();

    const regWS2026 = parseNumber(row[13]);
    const regDS2026_2027 = parseNumber(row[14]);
    const mfWS2026 = parseNumber(row[15]);
    const mfDS2026_2027 = parseNumber(row[16]);

    if (rawFundSource) {
      currentFundSource = normalizeFundSource(rawFundSource);
      // Reset IB No. when a new fund source section starts without an IB No.
      if (!rawIbNo) {
        currentIbNo = '';
      }
    }
    if (rawIbNo) {
      currentIbNo = rawIbNo;
    }
    if (rawSupplier) {
      currentSupplier = normalizeSupplier(rawSupplier);
    }
    if (rawProduct) {
      currentProduct = rawProduct.replace(/\s+/g, ' ').trim();
    }
    if (rawSiteUnit) {
      currentUnit = rawSiteUnit.toLowerCase();
    } else if (rawNtpUnit) {
      currentUnit = rawNtpUnit.toLowerCase();
    }

    const category = classifyCategory(currentProduct);

    // Contract Line Item: has NTP qty, unit price, or contract amount
    if (ntpQty > 0 || unitPrice > 0 || amount > 0) {
      contracts.push({
        row: sheetRowNum,
        fundSource: currentFundSource || 'Unclassified',
        ibNo: currentIbNo,
        ntpNo: rawNtpNo,
        ntpQty,
        unitPrice,
        unit: rawNtpUnit || currentUnit || 'units',
        amount,
        supplier: currentSupplier || 'Unknown Supplier',
        product: currentProduct || 'Unspecified Product',
        category,
      });
    }

    // Delivery Site Item: has a valid CAR Province and positive site quantity
    let province = normalizeProvince(rawProvince);
    const municipality = normalizeMunicipality(rawMun);
    // Correct sheet typos where Ifugao municipalities (Alfonso Lista, Lamut) are mislabeled under another province
    if (municipality === 'Alfonso Lista' || municipality === 'Lamut') {
      province = 'Ifugao';
    }
    if (province && siteQty > 0) {
      const fundSource = currentFundSource || 'Unclassified';
      deliveries.push({
        row: sheetRowNum,
        fundSource,
        ibNo: currentIbNo,
        supplier: currentSupplier || 'Unknown Supplier',
        product: currentProduct || 'Unspecified Product',
        category,
        quantity: siteQty,
        unit: rawSiteUnit || currentUnit || 'units',
        municipality,
        province,
        season: deriveSeason(fundSource, municipality, regWS2026, regDS2026_2027, mfWS2026, mfDS2026_2027),
        regWS2026,
        regDS2026_2027,
        mfWS2026,
        mfDS2026_2027,
      });
    }
  }

  return {
    contracts,
    deliveries,
    fetchedAt,
    sourceUrl: SUMMARY_OF_SUPPLIES_SHEET_URL,
  };
}

async function doFetchFromGoogleSheet(): Promise<SummaryOfSuppliesResult> {
  const now = new Date().toISOString();
  const cacheBusterUrl = `${SUMMARY_OF_SUPPLIES_SHEET_URL}&_cb=${Date.now()}`;
  const res = await fetch(cacheBusterUrl, {
    cache: 'no-store',
    headers: {
      'User-Agent': 'DA-CAR-Rice-Program-Portal/1.0',
    },
  });

  if (!res.ok) {
    throw new Error(`Google Sheets responded with HTTP ${res.status}`);
  }

  const csvText = await res.text();
  const parsed = parseSummaryOfSuppliesCSV(csvText, now);
  if (parsed.contracts.length === 0 && parsed.deliveries.length === 0) {
    throw new Error('No valid SUMMARY OF SUPPLIES rows parsed from Google Sheet');
  }
  return parsed;
}

async function refreshSummaryInBackground(): Promise<SummaryOfSuppliesResult> {
  if (gGlobal.__daSummaryOfSuppliesInflight) {
    return gGlobal.__daSummaryOfSuppliesInflight;
  }
  const promise = (async () => {
    try {
      const fresh = await doFetchFromGoogleSheet();
      const entry = { data: fresh, timestamp: Date.now() };
      gGlobal.__daSummaryOfSuppliesCache = entry;
      saveDiskCache(entry);
      return fresh;
    } finally {
      gGlobal.__daSummaryOfSuppliesInflight = null;
    }
  })();
  gGlobal.__daSummaryOfSuppliesInflight = promise;
  return promise;
}

export async function fetchSummaryOfSuppliesSheet(
  forceRefresh = false
): Promise<SummaryOfSuppliesResult> {
  const now = Date.now();
  if (gGlobal.__daSummaryOfSuppliesCache === undefined) {
    gGlobal.__daSummaryOfSuppliesCache = getDiskCache() || undefined;
  }
  const cached = gGlobal.__daSummaryOfSuppliesCache;

  // 1. Fresh cache within TTL -> return immediately
  if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Stale-while-revalidate: return cached data immediately and refresh in background
  if (!forceRefresh && cached?.data) {
    void refreshSummaryInBackground().catch(() => {});
    return cached.data;
  }

  // 3. No cache or forced refresh: await deduplicated fetch
  try {
    return await refreshSummaryInBackground();
  } catch (err) {
    console.warn('[SummaryOfSupplies] Live fetch error, falling back to cache:', err);
  }

  if (cached?.data) {
    return cached.data;
  }

  return {
    contracts: [],
    deliveries: [],
    fetchedAt: new Date().toISOString(),
    sourceUrl: SUMMARY_OF_SUPPLIES_SHEET_URL,
  };
}
