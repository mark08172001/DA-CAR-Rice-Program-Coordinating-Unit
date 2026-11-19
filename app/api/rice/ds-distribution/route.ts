import { NextResponse } from 'next/server';
import { fetchDrySeasonData } from '@/utils/fetchDrySeasonSheet';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await fetchDrySeasonData();
    return NextResponse.json({ success: true, data }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch Dry Season data' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
