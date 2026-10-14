import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ balanceId: string }> }
) {
  try {
    const { balanceId } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('balance_id', balanceId)
      .order('transaction_date', { ascending: false });

    if (error) {
      return NextResponse.json({ data: [], error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [], error: null });
  } catch (err: any) {
    return NextResponse.json({ data: [], error: err.message }, { status: 500 });
  }
}
