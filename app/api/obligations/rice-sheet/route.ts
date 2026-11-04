import { NextRequest, NextResponse } from 'next/server';
import { fetchRiceObligationsFromGoogleSheet } from '@/utils/fetchRiceObligationsSheet';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
    const data = await fetchRiceObligationsFromGoogleSheet(forceRefresh);
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch Google Sheet data' },
      { status: 500 }
    );
  }
}
