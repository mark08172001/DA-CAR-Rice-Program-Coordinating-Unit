// Fetcher & Data Models for DS 2026-2027 Distribution Status
// Reset to clean/empty state awaiting live operational data

export interface DSDistributionRow {
  province: string;
  targetAreaHa: number;
  hybridSeedsTarget: number;
  september: number;
  october: number;
  november: number;
  december: number;
  january: number;
  february: number;
  iofTargetHa: number;
  distributedBags: number;
  balanceBags: number;
  progressPercent: number;
  status: 'In Progress' | 'Advanced' | 'Pending Delivery' | 'Completed' | 'Pending';
  lastShipmentDate: string;
}

export interface DSDistributionData {
  season: string;
  fiscalYear: string;
  totalAreaHa: number;
  totalHybridSeeds: number;
  provinces: DSDistributionRow[];
  lastUpdated: string;
  isLive: boolean;
}

export const DEFAULT_DS_DISTRIBUTION_DATA: DSDistributionData = {
  season: 'Dry Season (DS)',
  fiscalYear: '2026-2027',
  totalAreaHa: 0,
  totalHybridSeeds: 0,
  provinces: [],
  lastUpdated: new Date().toISOString(),
  isLive: true,
};

export async function fetchDSDistributionData(): Promise<DSDistributionData> {
  // Initialized empty clean state
  return DEFAULT_DS_DISTRIBUTION_DATA;
}
