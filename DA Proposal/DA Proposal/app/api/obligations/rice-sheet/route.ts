import { NextResponse } from 'next/server';
import { fetchRiceObligationsFromGoogleSheet } from '@/utils/fetchRiceObligationsSheet';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await fetchRiceObligationsFromGoogleSheet();
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch Google Sheet data' },
      { status: 500 }
    );
  }
}
