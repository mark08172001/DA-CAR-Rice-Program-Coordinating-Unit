// Fetcher & Data Models for Dry Season (DS) Operations
// Source Google Sheet:
// ID: 1Uaa5P_IchuO3gbabAmLNWOeChEsp3nrsYABKkZE8ra4
// GID: 1178837907

export interface SubInterventionItem {
  name: string;
  unit: string;
  deliveredTarget: number;
  deliveredActual: number;
  distributedQty: number;
  distributedArea: number;
}

export interface ProvinceInterventionData {
  province: string;
  target: number; // Column D (Ha)
  accomp: number; // Column L (Ha)
  rate: number;   // Accomp / Target %
  interventions: SubInterventionItem[];
}

export interface CategoryData {
  id: string;
  name: string;
  target: number; // Column D
  accomp: number; // Column L
  rate: number;
  provinces: ProvinceInterventionData[];
}

export interface ProvinceTotalRow {
  province: string;
  targetSeeds: number;
  accompSeeds: number;
  targetFertH: number;
  accompFertH: number;
  targetFertI: number;
  accompFertI: number;
  targetBiofert: number;
  accompBiofert: number;
  totalTarget: number;
  totalAccomp: number;
  totalBalance: number;
  rate: number;
}

export interface DrySeasonSheetData {
  categories: CategoryData[];
  provinceTotals: ProvinceTotalRow[];
  grandTotal: {
    totalTarget: number;
    totalAccomp: number;
    totalBalance: number;
    rate: number;
    targetSeeds: number;
    accompSeeds: number;
    targetFertH: number;
    accompFertH: number;
    targetFertI: number;
    accompFertI: number;
    targetBiofert: number;
    accompBiofert: number;
  };
  fetchedAt: string;
  sourceUrl: string;
}

export const DRY_SEASON_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1Uaa5P_IchuO3gbabAmLNWOeChEsp3nrsYABKkZE8ra4/export?format=csv&gid=1178837907';

export const PROVINCES_LIST = ['ABRA', 'APAYAO', 'BENGUET', 'IFUGAO', 'KALINGA', 'MT. PROVINCE'] as const;

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }
  return rows;
}

function parseNum(val: any): number {
  if (val === undefined || val === null) return 0;
  const cleaned = String(val).replace(/["',\s₱]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Fallback data in case Google Sheet is unreachable
export const FALLBACK_DRY_SEASON_DATA: DrySeasonSheetData = {
  categories: [
    {
      id: 'hybrid-seeds',
      name: 'Hybrid Seeds',
      target: 18197,
      accomp: 4487,
      rate: 24.66,
      provinces: [
        { province: 'ABRA', target: 2098, accomp: 812, rate: 38.7, interventions: [] },
        { province: 'APAYAO', target: 7593, accomp: 0, rate: 0, interventions: [] },
        { province: 'BENGUET', target: 259, accomp: 29, rate: 11.2, interventions: [] },
        { province: 'IFUGAO', target: 899, accomp: 820, rate: 91.21, interventions: [] },
        { province: 'KALINGA', target: 6980, accomp: 2827, rate: 40.5, interventions: [] },
        { province: 'MT. PROVINCE', target: 368, accomp: 0, rate: 0, interventions: [] },
      ],
    },
    {
      id: 'fert-hybrid',
      name: 'FERTILIZER (HYBRID)',
      target: 17604,
      accomp: 5925,
      rate: 33.66,
      provinces: [
        { province: 'ABRA', target: 2098, accomp: 0, rate: 0, interventions: [] },
        { province: 'APAYAO', target: 7000, accomp: 0, rate: 0, interventions: [] },
        { province: 'BENGUET', target: 259, accomp: 58, rate: 22.39, interventions: [] },
        { province: 'IFUGAO', target: 899, accomp: 2567, rate: 285.54, interventions: [] },
        { province: 'KALINGA', target: 6980, accomp: 3300, rate: 47.28, interventions: [] },
        { province: 'MT. PROVINCE', target: 368, accomp: 0, rate: 0, interventions: [] },
      ],
    },
    {
      id: 'fert-inbred',
      name: 'FERTILIZERS (INBRED)',
      target: 50790,
      accomp: 4122,
      rate: 8.12,
      provinces: [
        { province: 'ABRA', target: 14416, accomp: 0, rate: 0, interventions: [] },
        { province: 'APAYAO', target: 5616, accomp: 0, rate: 0, interventions: [] },
        { province: 'BENGUET', target: 1257, accomp: 0, rate: 0, interventions: [] },
        { province: 'IFUGAO', target: 8877, accomp: 4122, rate: 46.43, interventions: [] },
        { province: 'KALINGA', target: 18364, accomp: 0, rate: 0, interventions: [] },
        { province: 'MT. PROVINCE', target: 2261, accomp: 0, rate: 0, interventions: [] },
      ],
    },
    {
      id: 'biofert-asa',
      name: 'BIOFERT ASA',
      target: 33057,
      accomp: 597,
      rate: 1.81,
      provinces: [
        { province: 'ABRA', target: 3668, accomp: 0, rate: 0, interventions: [] },
        { province: 'APAYAO', target: 11146, accomp: 0, rate: 0, interventions: [] },
        { province: 'BENGUET', target: 652, accomp: 0, rate: 0, interventions: [] },
        { province: 'IFUGAO', target: 3335, accomp: 0, rate: 0, interventions: [] },
        { province: 'KALINGA', target: 13315, accomp: 597, rate: 4.48, interventions: [] },
        { province: 'MT. PROVINCE', target: 941, accomp: 0, rate: 0, interventions: [] },
      ],
    },
  ],
  provinceTotals: [
    { province: 'ABRA', targetSeeds: 2098, accompSeeds: 812, targetFertH: 2098, accompFertH: 0, targetFertI: 14416, accompFertI: 0, targetBiofert: 3668, accompBiofert: 0, totalTarget: 22280, totalAccomp: 812, totalBalance: 21468, rate: 3.64 },
    { province: 'APAYAO', targetSeeds: 7593, accompSeeds: 0, targetFertH: 7000, accompFertH: 0, targetFertI: 5616, accompFertI: 0, targetBiofert: 11146, accompBiofert: 0, totalTarget: 31355, totalAccomp: 0, totalBalance: 31355, rate: 0 },
    { province: 'BENGUET', targetSeeds: 259, accompSeeds: 29, targetFertH: 259, accompFertH: 58, targetFertI: 1257, accompFertI: 0, targetBiofert: 652, accompBiofert: 0, totalTarget: 2427, totalAccomp: 87, totalBalance: 2340, rate: 3.58 },
    { province: 'IFUGAO', targetSeeds: 899, accompSeeds: 820, targetFertH: 899, accompFertH: 2567, targetFertI: 8877, accompFertI: 4122, targetBiofert: 3335, accompBiofert: 0, totalTarget: 14010, totalAccomp: 7509, totalBalance: 6501, rate: 53.60 },
    { province: 'KALINGA', targetSeeds: 6980, accompSeeds: 2827, targetFertH: 6980, accompFertH: 3300, targetFertI: 18364, accompFertI: 0, targetBiofert: 13315, accompBiofert: 597, totalTarget: 45639, totalAccomp: 6724, totalBalance: 38915, rate: 14.73 },
    { province: 'MT. PROVINCE', targetSeeds: 368, accompSeeds: 0, targetFertH: 368, accompFertH: 0, targetFertI: 2261, accompFertI: 0, targetBiofert: 941, accompBiofert: 0, totalTarget: 3938, totalAccomp: 0, totalBalance: 3938, rate: 0 },
  ],
  grandTotal: {
    totalTarget: 119648,
    totalAccomp: 15131,
    totalBalance: 104517,
    rate: 12.65,
    targetSeeds: 18197,
    accompSeeds: 4487,
    targetFertH: 17604,
    accompFertH: 5925,
    targetFertI: 50790,
    accompFertI: 4122,
    targetBiofert: 33057,
    accompBiofert: 597,
  },
  fetchedAt: new Date().toISOString(),
  sourceUrl: DRY_SEASON_SHEET_URL,
};

export async function fetchDrySeasonData(): Promise<DrySeasonSheetData> {
  try {
    const res = await fetch(DRY_SEASON_SHEET_URL, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DA-CAR-Portal/2.0',
        Accept: 'text/csv, text/plain, */*',
      },
    });

    if (!res.ok) {
      console.warn(`[DrySeason] Fetch returned HTTP ${res.status}, using fallback.`);
      return FALLBACK_DRY_SEASON_DATA;
    }

    const text = await res.text();
    const rawRows = parseCSV(text);

    if (rawRows.length < 10) {
      return FALLBACK_DRY_SEASON_DATA;
    }

    const SECTIONS = [
      { key: 'HYBRID SEEDS', id: 'hybrid-seeds', displayName: 'Hybrid Seeds' },
      { key: 'FERTILIZER (HYBRID)', id: 'fert-hybrid', displayName: 'FERTILIZER (HYBRID)' },
      { key: 'FERTILIZERS (INBRED)', id: 'fert-inbred', displayName: 'FERTILIZERS (INBRED)' },
      { key: 'BIOFERT ASA', id: 'biofert-asa', displayName: 'BIOFERT ASA' },
    ];

    const sectionKeys = SECTIONS.map((s) => s.key);
    let currentSectionKey = '';
    let currentProv = '';

    const parsedSections: Record<
      string,
      {
        target: number;
        accomp: number;
        provinces: Record<string, ProvinceInterventionData>;
      }
    > = {
      'HYBRID SEEDS': { target: 0, accomp: 0, provinces: {} },
      'FERTILIZER (HYBRID)': { target: 0, accomp: 0, provinces: {} },
      'FERTILIZERS (INBRED)': { target: 0, accomp: 0, provinces: {} },
      'BIOFERT ASA': { target: 0, accomp: 0, provinces: {} },
    };

    // Prepopulate provinces
    for (const s of sectionKeys) {
      for (const p of PROVINCES_LIST) {
        parsedSections[s].provinces[p] = {
          province: p,
          target: 0,
          accomp: 0,
          rate: 0,
          interventions: [],
        };
      }
    }

    for (let i = 0; i < rawRows.length; i++) {
      const cols = rawRows[i];
      const a = (cols[0] || '').trim().toUpperCase();
      const d = parseNum(cols[3]);
      const l = parseNum(cols[11]);

      if (sectionKeys.includes(a)) {
        currentSectionKey = a;
        parsedSections[currentSectionKey].target = d;
        parsedSections[currentSectionKey].accomp = l;
        currentProv = '';
        continue;
      }

      if (a === 'SOIL AMELIORANT' || a.startsWith('TOTAL')) {
        currentSectionKey = '';
        currentProv = '';
        continue;
      }

      if (PROVINCES_LIST.includes(a as any) && currentSectionKey) {
        currentProv = a;
        const rate = d > 0 ? (l / d) * 100 : 0;
        parsedSections[currentSectionKey].provinces[currentProv] = {
          province: a,
          target: d,
          accomp: l,
          rate: Math.round(rate * 100) / 100,
          interventions: [],
        };
        continue;
      }

      const intervName = (cols[4] || cols[0] || '').trim();
      if (
        intervName &&
        !PROVINCES_LIST.includes(intervName.toUpperCase() as any) &&
        !sectionKeys.includes(intervName.toUpperCase()) &&
        currentSectionKey &&
        currentProv &&
        parsedSections[currentSectionKey].provinces[currentProv]
      ) {
        parsedSections[currentSectionKey].provinces[currentProv].interventions.push({
          name: intervName,
          unit: cols[5] || '',
          deliveredTarget: parseNum(cols[6]),
          deliveredActual: parseNum(cols[7]),
          distributedQty: parseNum(cols[10]),
          distributedArea: parseNum(cols[11]),
        });
      }
    }

    // Ensure section accomp is accurate (if header row in sheet had empty Col L)
    for (const s of sectionKeys) {
      const pData = parsedSections[s];
      const sumAccomp = PROVINCES_LIST.reduce((acc, p) => acc + (pData.provinces[p]?.accomp || 0), 0);
      if (pData.accomp === 0 && sumAccomp > 0) {
        pData.accomp = sumAccomp;
      }
    }

    // Build CategoryData array
    const categories: CategoryData[] = SECTIONS.map((sec) => {
      const pData = parsedSections[sec.key];
      const provArray = PROVINCES_LIST.map((p) => pData.provinces[p]);
      const secRate = pData.target > 0 ? (pData.accomp / pData.target) * 100 : 0;
      return {
        id: sec.id,
        name: sec.displayName,
        target: pData.target,
        accomp: pData.accomp,
        rate: Math.round(secRate * 100) / 100,
        provinces: provArray,
      };
    });

    // Build Total by Province
    const provinceTotals: ProvinceTotalRow[] = PROVINCES_LIST.map((p) => {
      const tSeeds = parsedSections['HYBRID SEEDS'].provinces[p]?.target || 0;
      const aSeeds = parsedSections['HYBRID SEEDS'].provinces[p]?.accomp || 0;
      const tFertH = parsedSections['FERTILIZER (HYBRID)'].provinces[p]?.target || 0;
      const aFertH = parsedSections['FERTILIZER (HYBRID)'].provinces[p]?.accomp || 0;
      const tFertI = parsedSections['FERTILIZERS (INBRED)'].provinces[p]?.target || 0;
      const aFertI = parsedSections['FERTILIZERS (INBRED)'].provinces[p]?.accomp || 0;
      const tBio = parsedSections['BIOFERT ASA'].provinces[p]?.target || 0;
      const aBio = parsedSections['BIOFERT ASA'].provinces[p]?.accomp || 0;

      const totalTarget = tSeeds + tFertH + tFertI + tBio;
      const totalAccomp = aSeeds + aFertH + aFertI + aBio;
      const totalBalance = totalTarget - totalAccomp;
      const rate = totalTarget > 0 ? (totalAccomp / totalTarget) * 100 : 0;

      return {
        province: p,
        targetSeeds: tSeeds,
        accompSeeds: aSeeds,
        targetFertH: tFertH,
        accompFertH: aFertH,
        targetFertI: tFertI,
        accompFertI: aFertI,
        targetBiofert: tBio,
        accompBiofert: aBio,
        totalTarget,
        totalAccomp,
        totalBalance,
        rate: Math.round(rate * 100) / 100,
      };
    });

    const grandTargetSeeds = parsedSections['HYBRID SEEDS'].target;
    const grandAccompSeeds = parsedSections['HYBRID SEEDS'].accomp;
    const grandTargetFertH = parsedSections['FERTILIZER (HYBRID)'].target;
    const grandAccompFertH = parsedSections['FERTILIZER (HYBRID)'].accomp;
    const grandTargetFertI = parsedSections['FERTILIZERS (INBRED)'].target;
    const grandAccompFertI = parsedSections['FERTILIZERS (INBRED)'].accomp;
    const grandTargetBiofert = parsedSections['BIOFERT ASA'].target;
    const grandAccompBiofert = parsedSections['BIOFERT ASA'].accomp;

    const totalTarget = grandTargetSeeds + grandTargetFertH + grandTargetFertI + grandTargetBiofert;
    const totalAccomp = grandAccompSeeds + grandAccompFertH + grandAccompFertI + grandAccompBiofert;
    const totalBalance = totalTarget - totalAccomp;
    const grandRate = totalTarget > 0 ? (totalAccomp / totalTarget) * 100 : 0;

    return {
      categories,
      provinceTotals,
      grandTotal: {
        totalTarget,
        totalAccomp,
        totalBalance,
        rate: Math.round(grandRate * 100) / 100,
        targetSeeds: grandTargetSeeds,
        accompSeeds: grandAccompSeeds,
        targetFertH: grandTargetFertH,
        accompFertH: grandAccompFertH,
        targetFertI: grandTargetFertI,
        accompFertI: grandAccompFertI,
        targetBiofert: grandTargetBiofert,
        accompBiofert: grandAccompBiofert,
      },
      fetchedAt: new Date().toISOString(),
      sourceUrl: DRY_SEASON_SHEET_URL,
    };
  } catch (error) {
    console.error('[DrySeason] Error fetching Google Sheet:', error);
    return FALLBACK_DRY_SEASON_DATA;
  }
}
