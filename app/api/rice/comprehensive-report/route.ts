import { NextResponse } from 'next/server';
import { getObligations } from '@/utils/obligationsStore';
import {
  fetchCurrentDisbursements,
  fetchContinuingDisbursements,
  fetchUnpaidPriorYearsDisbursements,
} from '@/utils/fetchContinuingDisbursements';
import { fetchPhysicalAccomplishmentData } from '@/utils/fetchPhysicalAccomplishmentSheet';
import { fetchRiceObligationsFromGoogleSheet } from '@/utils/fetchRiceObligationsSheet';
import { fetchDSDistributionData } from '@/utils/fetchDSDistributionSheet';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Fetch Financial & Obligations Registry Rows
    let rows: any[] = [];
    try {
      rows = await getObligations('Main Registry');
      if (!rows || rows.length === 0) {
        rows = await getObligations('Google Sheet (Live)');
      }
    } catch (e) {
      console.warn('Could not load obligations store:', e);
    }

    // 2. Fetch Live Rice Obligations Sheet (Obligation Balances & Benchmarks)
    let obligationsSheet: any = null;
    try {
      obligationsSheet = await fetchRiceObligationsFromGoogleSheet();
    } catch (e) {
      console.warn('Could not fetch rice obligations sheet:', e);
    }

    // 3. Fetch Disbursements (Current, Continuing, Unpaid Prior Years)
    let currentDisb: any = null;
    let continuingDisb: any = null;
    let unpaidPriorYearsDisb: any = null;
    try {
      const [cur, cont, prior] = await Promise.all([
        fetchCurrentDisbursements(),
        fetchContinuingDisbursements(),
        fetchUnpaidPriorYearsDisbursements(),
      ]);
      currentDisb = cur;
      continuingDisb = cont;
      unpaidPriorYearsDisb = prior;
    } catch (e) {
      console.warn('Could not fetch disbursements data:', e);
    }

    // 4. Fetch Physical Accomplishments & Provincial Matrices
    let physicalData: any = null;
    try {
      physicalData = await fetchPhysicalAccomplishmentData();
    } catch (e) {
      console.warn('Could not fetch physical accomplishments:', e);
    }

    // 5. Fetch DS 2026-2027 Distribution Status & Variety Consignments
    let dsData: any = null;
    try {
      dsData = await fetchDSDistributionData();
    } catch (e) {
      console.warn('Could not fetch DS distribution data:', e);
    }

    // Calculate Financial Aggregates across core Rice categories (PSS, ESETS, RD, INS)
    const validRows = rows.filter((r) => {
      const p = (r.pap || '').toLowerCase();
      const f = (r.fund || '').toLowerCase();
      const desc = (r.description || '').toLowerCase();
      const obj = (r.obj_code || '').toLowerCase();
      const isTotal =
        f.includes('total') ||
        p.includes('total') ||
        desc.includes('total');
      const isFpma = p.includes('fpma') || p.includes('sto');
      return p.includes('rice') && !isFpma && !isTotal && (desc || obj);
    });

    const categories = [
      { id: 'pss', title: 'PSS RICE', pCheck: (p: string) => p.includes('pss') },
      { id: 'esets', title: 'ESETS RICE', pCheck: (p: string) => p.includes('esets') },
      { id: 'rd', title: 'RD RICE', pCheck: (p: string) => p.includes('rd') || p.includes('research') },
      { id: 'ins', title: 'INS RICE', pCheck: (p: string) => p.includes('ins') },
    ];

    const categoryBreakdown = categories.map((c) => {
      const items = validRows.filter((r) => c.pCheck((r.pap || '').toLowerCase()));
      const allocation = items.reduce((s, r) => s + (Number(r.adjusted_allotment) || 0), 0);
      const obligation = items.reduce((s, r) => s + (Number(r.total_obligation) || 0), 0);
      const unobligated = items.reduce(
        (s, r) =>
          s +
          (r.unobligated_allotment !== undefined && r.unobligated_allotment !== null
            ? Number(r.unobligated_allotment)
            : (Number(r.adjusted_allotment) || 0) - (Number(r.total_obligation) || 0)),
        0
      );
      const disbursement = items.reduce((s, r) => s + (Number(r.disbursement) || 0), 0);
      const unpaid = items.reduce(
        (s, r) =>
          s +
          (r.unpaid !== undefined && r.unpaid !== null
            ? Number(r.unpaid)
            : Math.max(0, (Number(r.total_obligation) || 0) - (Number(r.disbursement) || 0))),
        0
      );

      return {
        id: c.id,
        title: c.title,
        count: items.length,
        allocation,
        obligation,
        unobligated,
        disbursement,
        unpaid,
      };
    });

    const totalAlloc = validRows.reduce((s, r) => s + (Number(r.adjusted_allotment) || 0), 0);
    const totalOblig = validRows.reduce((s, r) => s + (Number(r.total_obligation) || 0), 0);
    const totalUnoblig = validRows.reduce((s, r) => {
      if (r.unobligated_allotment !== undefined && r.unobligated_allotment !== null) {
        return s + Number(r.unobligated_allotment);
      }
      return s + ((Number(r.adjusted_allotment) || 0) - (Number(r.total_obligation) || 0));
    }, 0);
    const totalEarmark = validRows.reduce((s, r) => s + (Number(r.earmark) || 0), 0);
    const totalUnallocated = validRows.reduce((s, r) => {
      if (r.unallocated_allotment !== undefined && r.unallocated_allotment !== null) {
        return s + Number(r.unallocated_allotment);
      }
      const unob = (Number(r.adjusted_allotment) || 0) - (Number(r.total_obligation) || 0);
      return s + (unob - (Number(r.earmark) || 0));
    }, 0);
    const totalDisb = validRows.reduce((s, r) => s + (Number(r.disbursement) || 0), 0);
    const totalUnpaid = validRows.reduce((s, r) => {
      if (r.unpaid !== undefined && r.unpaid !== null) {
        return s + Number(r.unpaid);
      }
      return s + Math.max(0, (Number(r.total_obligation) || 0) - (Number(r.disbursement) || 0));
    }, 0);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      financial: {
        totalAllocation: totalAlloc,
        totalObligation: totalOblig,
        totalUnobligated: totalUnoblig,
        totalEarmark,
        totalUnallocated,
        totalDisbursement: totalDisb,
        totalUnpaid,
        obligationRate: totalAlloc > 0 ? (totalOblig / totalAlloc) * 100 : 0,
        unobligatedRate: totalAlloc > 0 ? (totalUnoblig / totalAlloc) * 100 : 0,
        disbursementRate: totalOblig > 0 ? (totalDisb / totalOblig) * 100 : 0,
        categoryBreakdown,
        sampleLineItems: validRows.slice(0, 15),
      },
      obligation: {
        totalBannerRice: obligationsSheet?.totalBannerRice || null,
        categories: obligationsSheet?.categories || null,
      },
      disbursement: {
        current: currentDisb?.totals || null,
        continuing: continuingDisb?.totals || null,
        unpaidPriorYears: unpaidPriorYearsDisb?.totals || null,
        recentCurrentRecords: currentDisb?.records?.slice(0, 10) || [],
      },
      physical: {
        totals: physicalData?.totals || null,
        provinces: physicalData?.provinces || [],
        monthlySchedule: physicalData?.monthlySchedule?.slice(0, 12) || [],
      },
      dsDistribution: {
        season: dsData?.season || 'Dry Season (DS) 2026-2027',
        fiscalYear: dsData?.fiscalYear || '2026-2027',
        totals: dsData?.totals || null,
        provinces: dsData?.provinces || [],
        varieties: dsData?.varieties?.slice(0, 8) || [],
        asOfDate: dsData?.asOfDate || null,
      },
    });
  } catch (error: any) {
    console.error('Error compiling comprehensive report data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to compile comprehensive report data',
      },
      { status: 500 }
    );
  }
}

