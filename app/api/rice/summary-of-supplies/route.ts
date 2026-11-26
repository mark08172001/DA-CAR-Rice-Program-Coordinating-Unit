import { NextRequest, NextResponse } from 'next/server';
import { fetchSummaryOfSuppliesSheet } from '@/utils/fetchSummaryOfSuppliesSheet';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const forceRefresh = request.nextUrl.searchParams.get('refresh') !== 'false';
    const data = await fetchSummaryOfSuppliesSheet(forceRefresh);
    return NextResponse.json({ success: true, ...data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Summary of Supplies sheet data';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
