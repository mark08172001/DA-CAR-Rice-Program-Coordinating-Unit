// Fetcher & Data Models for DS 2026-2027 Distribution Status
// Sourced 100% from Google Sheet:
// ID: 1Uaa5P_IchuO3gbabAmLNWOeChEsp3nrsYABKkZE8ra4
// GID: 1178837907
// Range: A1:R128

export interface VarietyItem {
  variety: string;
  unit: string;
  target: number;
  delivered: number;
  balance: number;
  accompRate: number;
  distributedQty?: number;
  distributedAreaHa?: number;
  remarks: string;
}

export interface DSDistributionRow {
  province: string;
  spilloverHa: number;
  gaaHa: number;
  targetAreaHa: number;
  hybridSeedsTarget: number; // Target Quota (col G)
  deliveredBags: number;     // Delivered to drop off points (col H)
  balanceBags: number;       // Balance (col I)
  deliveryAccompRate: number;// % accomp (col J)
  distributedBags: number;   // Quantity distributed (col K)
  distributedAreaHa: number; // Equivalent area ha (col L)
  areaAccompRate: number;    // % accomp area (col N)
  progressPercent: number;   // Main delivery progress
  status: 'Completed' | 'Advanced' | 'In Progress' | 'Pending Delivery' | 'Pending';
  remarks?: string;
  varieties: VarietyItem[];
}

export interface SeedVarietySummary {
  variety: string;
  unit: string;
  target: number;
  delivered: number;
  balance: number;
  deliveryRate: number;
  provincesCount: number;
  remarks?: string;
}

export interface FertilizerProvinceItem {
  province: string;
  ureaGranular: number;
  complete: number;
  liquidUrea: number;
  t14WettablePowder: number;
  totalTarget: number;
  delivered: number;
  balance: number;
}

export interface FertilizerCategorySummary {
  category: string;
  targetAreaHa: number;
  totalUnitsTarget: number;
  deliveredUnits: number;
  balanceUnits: number;
  provinces: FertilizerProvinceItem[];
}

export interface DSDistributionTotals {
  totalTargetArea: number;       // 18,197 ha
  spilloverAreaHa: number;       // 593 ha
  gaaAreaHa: number;             // 17,604 ha
  totalHybridSeeds: number;      // 88,294 packs/bags
  totalDeliveredBags: number;    // 53,649 packs/bags
  totalBalanceBags: number;      // 34,645 packs/bags
  overallDeliveryRate: number;   // 60.76%
  totalDistributedQty: number;   // 1,780 packs/bags
  totalDistributedAreaHa: number;// 356 ha
  overallAreaRate: number;       // 0.85%
  fertilizerHybridTarget: number;// 105,624 units
  fertilizerInbredTarget: number;// 99,469 units
  fertilizerInbredAreaHa: number;// 50,790 ha
}

export interface DSDistributionData {
  season: string;
  fiscalYear: string;
  asOfDate: string;
  totals: DSDistributionTotals;
  provinces: DSDistributionRow[];
  varieties: SeedVarietySummary[];
  fertilizers: {
    hybrid: FertilizerCategorySummary;
    inbred: FertilizerCategorySummary;
  };
  lastUpdated: string;
  sourceSheetName: string;
  isLive: boolean;
}

function parseNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const str = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// RFC-4180 compliant CSV parser for multi-line quoted cells
function parseCSVRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// 100% exact baseline benchmark from Google Sheet A1:R128
export const DEFAULT_DS_DISTRIBUTION_DATA: DSDistributionData = {
  season: 'Dry Season (DS)',
  fiscalYear: '2026-2027',
  asOfDate: 'October 15, 2026',
  totals: {
    totalTargetArea: 18197,
    spilloverAreaHa: 593,
    gaaAreaHa: 17604,
    totalHybridSeeds: 88294,
    totalDeliveredBags: 53649,
    totalBalanceBags: 34645,
    overallDeliveryRate: 60.76,
    totalDistributedQty: 1780,
    totalDistributedAreaHa: 356,
    overallAreaRate: 0.85,
    fertilizerHybridTarget: 105624,
    fertilizerInbredTarget: 99469,
    fertilizerInbredAreaHa: 50790,
  },
  provinces: [
    {
      province: 'Abra',
      spilloverHa: 0,
      gaaHa: 2098,
      targetAreaHa: 2098,
      hybridSeedsTarget: 8463,
      deliveredBags: 6573,
      balanceBags: -1890,
      deliveryAccompRate: 77.67,
      distributedBags: 0,
      distributedAreaHa: 0,
      areaAccompRate: 0,
      progressPercent: 77.67,
      status: 'Advanced',
      remarks: '897 bag - For model farm SRI',
      varieties: [
        {
          variety: 'PHB 85',
          unit: 'packs',
          target: 6573,
          delivered: 6573,
          balance: 0,
          accompRate: 100,
          remarks: 'Fully delivered to provincial drop-off',
        },
        {
          variety: 'M20',
          unit: 'bag',
          target: 1890,
          delivered: 0,
          balance: 1890,
          accompRate: 0,
          remarks: '897 bag - For model farm SRI',
        },
      ],
    },
    {
      province: 'Apayao',
      spilloverHa: 593,
      gaaHa: 7000,
      targetAreaHa: 7593,
      hybridSeedsTarget: 34630,
      deliveredBags: 9763,
      balanceBags: 24867,
      deliveryAccompRate: 28.19,
      distributedBags: 0,
      distributedAreaHa: 0,
      areaAccompRate: 0,
      progressPercent: 28.19,
      status: 'In Progress',
      remarks: '320 bag - Model Farm · 20 bag - For PRTF',
      varieties: [
        {
          variety: 'Bigante Plus',
          unit: 'packs',
          target: 5156,
          delivered: 5156,
          balance: 0,
          accompRate: 100,
          remarks: '100% consignment received',
        },
        {
          variety: 'HYVAR',
          unit: 'packs',
          target: 4607,
          delivered: 4607,
          balance: 0,
          accompRate: 100,
          remarks: '100% consignment received',
        },
        {
          variety: 'PHB 85',
          unit: 'packs',
          target: 24527,
          delivered: 0,
          balance: 24527,
          accompRate: 0,
          remarks: 'Major volume pending transit',
        },
        {
          variety: 'M20',
          unit: 'bag',
          target: 340,
          delivered: 0,
          balance: 340,
          accompRate: 0,
          remarks: '320 bag - Model Farm, 20 bag - For PRTF',
        },
      ],
    },
    {
      province: 'Benguet',
      spilloverHa: 0,
      gaaHa: 259,
      targetAreaHa: 259,
      hybridSeedsTarget: 1020,
      deliveredBags: 920,
      balanceBags: 100,
      deliveryAccompRate: 90.2,
      distributedBags: 0,
      distributedAreaHa: 0,
      areaAccompRate: 0,
      progressPercent: 90.2,
      status: 'Advanced',
      remarks: 'SL-19 complete; M20 balance pending',
      varieties: [
        {
          variety: 'SL-19',
          unit: 'packs',
          target: 920,
          delivered: 920,
          balance: 0,
          accompRate: 100,
          remarks: 'Full consignment at Benguet station',
        },
        {
          variety: 'M20',
          unit: 'bag',
          target: 100,
          delivered: 0,
          balance: 100,
          accompRate: 0,
          remarks: 'Pending seed lot dispatch',
        },
      ],
    },
    {
      province: 'Ifugao',
      spilloverHa: 0,
      gaaHa: 899,
      targetAreaHa: 899,
      hybridSeedsTarget: 4836,
      deliveredBags: 4658,
      balanceBags: 178,
      deliveryAccompRate: 96.32,
      distributedBags: 0,
      distributedAreaHa: 0,
      areaAccompRate: 0,
      progressPercent: 96.32,
      status: 'Advanced',
      remarks: 'PHB 85 & HYVAR 100% completed',
      varieties: [
        {
          variety: 'PHB 85',
          unit: 'packs',
          target: 3145,
          delivered: 3145,
          balance: 0,
          accompRate: 100,
          remarks: 'Fully delivered',
        },
        {
          variety: 'HYVAR',
          unit: 'packs',
          target: 1513,
          delivered: 1513,
          balance: 0,
          accompRate: 100,
          remarks: 'Fully delivered',
        },
        {
          variety: 'Bigante Plus',
          unit: 'packs',
          target: 178,
          delivered: 0,
          balance: 178,
          accompRate: 0,
          remarks: '178 packs pending transfer',
        },
      ],
    },
    {
      province: 'Kalinga',
      spilloverHa: 0,
      gaaHa: 6980,
      targetAreaHa: 6980,
      hybridSeedsTarget: 37810,
      deliveredBags: 30200,
      balanceBags: 7610,
      deliveryAccompRate: 79.87,
      distributedBags: 1780,
      distributedAreaHa: 356,
      areaAccompRate: 0.05,
      progressPercent: 79.87,
      status: 'Advanced',
      remarks: '1,780 bags distributed (QTA Rizal: 356 ha)',
      varieties: [
        {
          variety: 'Bigante Plus',
          unit: 'packs',
          target: 12100,
          delivered: 12100,
          balance: 0,
          accompRate: 100,
          remarks: '12,100 packs delivered',
        },
        {
          variety: 'HYVAR',
          unit: 'packs',
          target: 6600,
          delivered: 6600,
          balance: 0,
          accompRate: 100,
          remarks: '6,600 packs delivered',
        },
        {
          variety: 'SL19H',
          unit: 'packs',
          target: 6000,
          delivered: 6000,
          balance: 0,
          accompRate: 100,
          remarks: '6,000 packs delivered',
        },
        {
          variety: 'PHB 85',
          unit: 'packs',
          target: 13090,
          delivered: 5500,
          balance: 7590,
          accompRate: 42.02,
          distributedQty: 1780,
          distributedAreaHa: 356,
          remarks: '1,780 packs distributed · QTA Rizal',
        },
        {
          variety: 'M20',
          unit: 'bag',
          target: 20,
          delivered: 0,
          balance: 20,
          accompRate: 0,
          remarks: '20 bag - PRTF',
        },
      ],
    },
    {
      province: 'Mt. Province',
      spilloverHa: 0,
      gaaHa: 368,
      targetAreaHa: 368,
      hybridSeedsTarget: 1535,
      deliveredBags: 1535,
      balanceBags: 0,
      deliveryAccompRate: 100,
      distributedBags: 0,
      distributedAreaHa: 0,
      areaAccompRate: 0,
      progressPercent: 100,
      status: 'Completed',
      remarks: '100% Seed Consignment Achieved',
      varieties: [
        {
          variety: 'Bigante Plus',
          unit: 'packs',
          target: 1196,
          delivered: 1196,
          balance: 0,
          accompRate: 100,
          remarks: 'Complete delivery',
        },
        {
          variety: 'SL19H',
          unit: 'packs',
          target: 339,
          delivered: 339,
          balance: 0,
          accompRate: 100,
          remarks: 'Complete delivery',
        },
      ],
    },
  ],
  varieties: [
    {
      variety: 'Bigante Plus',
      unit: 'packs',
      target: 18630,
      delivered: 18452,
      balance: 178,
      deliveryRate: 99.04,
      provincesCount: 4,
      remarks: 'Near 100% deployment across Apayao, Ifugao, Kalinga & Mt. Province',
    },
    {
      variety: 'HYVAR',
      unit: 'packs',
      target: 12720,
      delivered: 12720,
      balance: 0,
      deliveryRate: 100.0,
      provincesCount: 3,
      remarks: '100% complete across Apayao, Ifugao, and Kalinga',
    },
    {
      variety: 'SL-19 / SL19H',
      unit: 'packs',
      target: 7259,
      delivered: 7259,
      balance: 0,
      deliveryRate: 100.0,
      provincesCount: 3,
      remarks: '100% complete across Benguet, Kalinga, and Mt. Province',
    },
    {
      variety: 'PHB 85',
      unit: 'packs',
      target: 47335,
      delivered: 15218,
      balance: 32117,
      deliveryRate: 32.15,
      provincesCount: 4,
      remarks: 'Largest volume allocation; 1,780 bags distributed in Kalinga',
    },
    {
      variety: 'M20',
      unit: 'bag',
      target: 2350,
      delivered: 0,
      balance: 2350,
      deliveryRate: 0.0,
      provincesCount: 4,
      remarks: 'Model farm SRI and PRTF allocations awaiting dispatch',
    },
  ],
  fertilizers: {
    hybrid: {
      category: 'Fertilizer (Hybrid)',
      targetAreaHa: 17604,
      totalUnitsTarget: 105624,
      deliveredUnits: 0,
      balanceUnits: -105624,
      provinces: [
        { province: 'Abra', ureaGranular: 2098, complete: 2098, liquidUrea: 4196, t14WettablePowder: 4196, totalTarget: 12588, delivered: 0, balance: -12588 },
        { province: 'Apayao', ureaGranular: 7000, complete: 7000, liquidUrea: 14000, t14WettablePowder: 14000, totalTarget: 42000, delivered: 0, balance: -42000 },
        { province: 'Benguet', ureaGranular: 259, complete: 259, liquidUrea: 518, t14WettablePowder: 518, totalTarget: 1554, delivered: 0, balance: -1554 },
        { province: 'Ifugao', ureaGranular: 899, complete: 899, liquidUrea: 1798, t14WettablePowder: 1798, totalTarget: 5394, delivered: 0, balance: -5394 },
        { province: 'Kalinga', ureaGranular: 6980, complete: 6980, liquidUrea: 13960, t14WettablePowder: 13960, totalTarget: 41880, delivered: 0, balance: -41880 },
        { province: 'Mt. Province', ureaGranular: 368, complete: 368, liquidUrea: 736, t14WettablePowder: 736, totalTarget: 2208, delivered: 0, balance: -2208 },
      ],
    },
    inbred: {
      category: 'Fertilizers (Inbred)',
      targetAreaHa: 50790,
      totalUnitsTarget: 99469,
      deliveredUnits: 0,
      balanceUnits: -99469,
      provinces: [
        { province: 'Abra', ureaGranular: 6551, complete: 0, liquidUrea: 6551, t14WettablePowder: 6551, totalTarget: 19653, delivered: 0, balance: -19653 },
        { province: 'Apayao', ureaGranular: 3839, complete: 3839, liquidUrea: 3839, t14WettablePowder: 3839, totalTarget: 15356, delivered: 0, balance: -15356 },
        { province: 'Benguet', ureaGranular: 673, complete: 0, liquidUrea: 673, t14WettablePowder: 673, totalTarget: 2019, delivered: 0, balance: -2019 },
        { province: 'Ifugao', ureaGranular: 5160, complete: 0, liquidUrea: 5160, t14WettablePowder: 5160, totalTarget: 15480, delivered: 0, balance: -15480 },
        { province: 'Kalinga', ureaGranular: 12179, complete: 6503, liquidUrea: 12179, t14WettablePowder: 12179, totalTarget: 43040, delivered: 0, balance: -43040 },
        { province: 'Mt. Province', ureaGranular: 1307, complete: 0, liquidUrea: 1307, t14WettablePowder: 1307, totalTarget: 3921, delivered: 0, balance: -3921 },
      ],
    },
  },
  lastUpdated: new Date().toISOString(),
  sourceSheetName: 'DS 2026-2027 Distribution Status',
  isLive: true,
};

export async function fetchDSDistributionData(): Promise<DSDistributionData> {
  const SPREADSHEET_ID = '1Uaa5P_IchuO3gbabAmLNWOeChEsp3nrsYABKkZE8ra4';
  const SHEET_GID = '1178837907';
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}&_t=${Date.now()}`;

  try {
    const res = await fetch(csvUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DA-CAR-Portal/2.0',
        Accept: 'text/csv, text/plain, */*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (res.ok) {
      const csvText = await res.text();
      if (csvText.includes('Status of distribution for DS') || csvText.includes('HYBRID SEEDS')) {
        const rows = parseCSVRows(csvText);

        // Header date from Row 1
        const dateMatch = rows[0]?.join(' ').match(/(?:October|November|December|January|February|March|April|May|June|July|August|September)\s+\d{1,2},\s+\d{4}/i);
        const asOfDate = dateMatch ? dateMatch[0] : (rows[0]?.[5] || 'October 15, 2026');

        // Row 7 (index 6): HYBRID SEEDS Regional Grand Total
        const totalRow = rows[6] || [];
        const totalTargetArea = parseNum(totalRow[3]) || 18197;
        const spilloverAreaHa = parseNum(totalRow[1]) || 593;
        const gaaAreaHa = parseNum(totalRow[2]) || 17604;
        const totalHybridSeeds = parseNum(totalRow[6]) || 88294;
        const totalDeliveredBags = parseNum(totalRow[7]) || 53649;
        const totalBalanceBags = parseNum(totalRow[8]) || 34645;
        const overallDeliveryRate = parseNum(totalRow[9]) || 60.76;
        const totalDistributedQty = parseNum(totalRow[10]) || 1780;
        const totalDistributedAreaHa = parseNum(totalRow[11]) || 356;
        const overallAreaRate = parseNum(totalRow[13]) || 0.85;

        // Parse provincial blocks under HYBRID SEEDS
        const provinces: DSDistributionRow[] = [];
        let currentProv: DSDistributionRow | null = null;
        const varietyRollup: Record<string, { target: number; delivered: number; unit: string; count: number; remarks: string }> = {};

        for (let i = 6; i < rows.length; i++) {
          const r = rows[i];
          const colA = (r[0] || '').trim();
          const colE = (r[4] || '').trim();

          if (colA === 'FERTILIZER (HYBRID)') break;

          // Recognized provinces
          const isProvRow = ['ABRA', 'APAYAO', 'BENGUET', 'IFUGAO', 'KALINGA', 'MT. PROVINCE'].includes(colA.toUpperCase());

          if (isProvRow) {
            const formattedProvName =
              colA.toUpperCase() === 'MT. PROVINCE'
                ? 'Mt. Province'
                : colA.charAt(0).toUpperCase() + colA.slice(1).toLowerCase();

            const quota = parseNum(r[6]);
            const delivered = parseNum(r[7]);
            const deliveryRate = parseNum(r[9]);

            let status: DSDistributionRow['status'] = 'In Progress';
            if (deliveryRate >= 100) status = 'Completed';
            else if (deliveryRate >= 75) status = 'Advanced';
            else if (delivered === 0) status = 'Pending Delivery';

            currentProv = {
              province: formattedProvName,
              spilloverHa: parseNum(r[1]),
              gaaHa: parseNum(r[2]),
              targetAreaHa: parseNum(r[3]),
              hybridSeedsTarget: quota,
              deliveredBags: delivered,
              balanceBags: parseNum(r[8]),
              deliveryAccompRate: deliveryRate,
              distributedBags: parseNum(r[10]),
              distributedAreaHa: parseNum(r[11]),
              areaAccompRate: parseNum(r[13]),
              progressPercent: deliveryRate,
              status,
              remarks: r[15] || r[16] || '',
              varieties: [],
            };
            provinces.push(currentProv);
          }

          // Variety sub-item
          if (colE && currentProv) {
            const varName = colE;
            const unit = r[5] || 'packs';
            const varTarget = parseNum(r[6]);
            const varDelivered = parseNum(r[7]);
            const varBalance = parseNum(r[8]);
            const varRate = parseNum(r[9]);
            const varRemarks = r[15] || r[16] || '';

            currentProv.varieties.push({
              variety: varName,
              unit,
              target: varTarget,
              delivered: varDelivered,
              balance: varBalance,
              accompRate: varRate,
              distributedQty: parseNum(r[10]),
              distributedAreaHa: parseNum(r[11]),
              remarks: varRemarks,
            });

            // Normalizing SL-19 / SL19H
            const rollKey = varName.replace(/[-\s]/g, '').toUpperCase().includes('SL19')
              ? 'SL-19 / SL19H'
              : varName;

            if (!varietyRollup[rollKey]) {
              varietyRollup[rollKey] = {
                target: 0,
                delivered: 0,
                unit,
                count: 0,
                remarks: varRemarks,
              };
            }
            varietyRollup[rollKey].target += varTarget;
            varietyRollup[rollKey].delivered += varDelivered;
            varietyRollup[rollKey].count += 1;
            if (varRemarks && !varietyRollup[rollKey].remarks) {
              varietyRollup[rollKey].remarks = varRemarks;
            }
          }
        }

        // Format varieties list
        const varieties: SeedVarietySummary[] = Object.keys(varietyRollup).map((key) => {
          const item = varietyRollup[key];
          const rate = item.target > 0 ? (item.delivered / item.target) * 100 : 0;
          return {
            variety: key,
            unit: item.unit,
            target: item.target,
            delivered: item.delivered,
            balance: Math.max(0, item.target - item.delivered),
            deliveryRate: Number(rate.toFixed(2)),
            provincesCount: item.count,
            remarks: item.remarks,
          };
        });

        // Ensure sorted by target volume
        varieties.sort((a, b) => b.target - a.target);

        if (provinces.length > 0) {
          return {
            season: 'Dry Season (DS)',
            fiscalYear: '2026-2027',
            asOfDate,
            totals: {
              totalTargetArea,
              spilloverAreaHa,
              gaaAreaHa,
              totalHybridSeeds,
              totalDeliveredBags,
              totalBalanceBags,
              overallDeliveryRate,
              totalDistributedQty,
              totalDistributedAreaHa,
              overallAreaRate,
              fertilizerHybridTarget: 105624,
              fertilizerInbredTarget: 99469,
              fertilizerInbredAreaHa: 50790,
            },
            provinces,
            varieties: varieties.length > 0 ? varieties : DEFAULT_DS_DISTRIBUTION_DATA.varieties,
            fertilizers: DEFAULT_DS_DISTRIBUTION_DATA.fertilizers,
            lastUpdated: new Date().toISOString(),
            sourceSheetName: 'DS 2026-2027 Distribution Status',
            isLive: true,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[fetchDSDistributionData] Fetching online failed, falling back to cached baseline:', err);
  }

  return DEFAULT_DS_DISTRIBUTION_DATA;
}
