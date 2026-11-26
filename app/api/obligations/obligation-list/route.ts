import { NextRequest, NextResponse } from 'next/server';
import { fetchObligationListSheet } from '@/utils/fetchObligationListSheet';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const forceRefresh = request.nextUrl.searchParams.get('refresh') !== 'false';
    const data = await fetchObligationListSheet(forceRefresh);
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch obligation sheet data' },
      { status: 500 }
    );
  }
}
