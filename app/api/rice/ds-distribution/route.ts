import { NextResponse } from 'next/server';
import { fetchDSDistributionData } from '@/utils/fetchDSDistributionSheet';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await fetchDSDistributionData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch DS distribution data' },
      { status: 500 }
    );
  }
}
