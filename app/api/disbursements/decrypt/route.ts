import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getAuthoritativeUserAccess } from '@/utils/adminStore';
import { decryptPersonnelName } from '@/utils/disbursementPrivacy';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const hasAuthCookie = allCookies.some(
      (c) => c.name.startsWith('sb-') || c.name === 'da_admin_session'
    );

    let activeEmail: string | undefined;
    let supabase: any = null;

    if (hasAuthCookie) {
      supabase = createClient(cookieStore);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      activeEmail = user?.email;

      if (!activeEmail) {
        const adminSessionCookie = cookieStore.get('da_admin_session')?.value;
        if (adminSessionCookie) {
          try {
            const parsed = JSON.parse(decodeURIComponent(adminSessionCookie));
            if (parsed?.email) activeEmail = parsed.email;
          } catch {}
        }
      }
    }

    if (!activeEmail) {
      return NextResponse.json(
        {
          error: 'Unauthorized. Sign in required to decrypt confidential personnel data.',
        },
        { status: 401 }
      );
    }

    const access = await getAuthoritativeUserAccess(activeEmail, supabase);
    if (!access || access.status === 'suspended') {
      return NextResponse.json(
        {
          error: 'Access restricted or suspended.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tokens } = body;

    if (!tokens || typeof tokens !== 'object') {
      return NextResponse.json(
        { error: 'Invalid tokens payload.' },
        { status: 400 }
      );
    }

    const decryptedMap: Record<string, string> = {};
    if (Array.isArray(tokens)) {
      tokens.forEach((t: string) => {
        decryptedMap[t] = decryptPersonnelName(t);
      });
    } else {
      for (const [key, val] of Object.entries(tokens)) {
        if (typeof val === 'string') {
          decryptedMap[key] = decryptPersonnelName(val);
        }
      }
    }

    return NextResponse.json({
      success: true,
      decrypted: decryptedMap,
      user: {
        email: activeEmail,
        role: access.role,
        name: access.fullName,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
