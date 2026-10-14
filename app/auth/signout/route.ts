import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();

  const url = new URL(request.url);
  return NextResponse.redirect(`${url.origin}/login`, {
    status: 302,
  });
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();

  const url = new URL(request.url);
  return NextResponse.redirect(`${url.origin}/login`, {
    status: 302,
  });
}
