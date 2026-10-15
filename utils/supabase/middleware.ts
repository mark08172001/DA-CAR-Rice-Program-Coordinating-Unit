import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://wzvcxffiwmhsqavrsbjb.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_FeXqVsnwAIZTLblegl24mw_3-jTW8ac";

export const createClient = async (request: NextRequest) => {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  // Calling getUser() refreshes expired auth tokens and commits session cookies
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  // Support local super admin session cookie
  let user = supabaseUser;
  if (!user) {
    const adminSessionCookie = request.cookies.get('da_admin_session')?.value;
    if (adminSessionCookie) {
      try {
        const raw = adminSessionCookie.startsWith('%') ? decodeURIComponent(adminSessionCookie) : adminSessionCookie;
        const parsed = JSON.parse(raw);
        if (parsed?.email) {
          user = {
            id: parsed.id || 'usr-001',
            email: parsed.email,
            user_metadata: {
              full_name: parsed.full_name || 'Regional Executive Director (Super Admin)',
              role: parsed.role || 'super_admin',
              department: parsed.department || 'Office of the Regional Executive Director',
            },
          } as any;
        }
      } catch {}
    }
  }

  const pathname = request.nextUrl.pathname;

  // Module 01 & Publicly Permitted Paths for outsiders
  const isModule1Path =
    pathname === '/' ||
    pathname === '/about' ||
    pathname === '/contact' ||
    pathname === '/provinces' ||
    pathname === '/weather' ||
    pathname === '/market-prices' ||
    pathname === '/privacy-policy' ||
    pathname === '/terms-of-use' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/beneficiaries') ||
    pathname.startsWith('/api/obligations') ||
    pathname.startsWith('/api/rice/programs') ||
    (pathname === '/api/admin/logs' && request.method === 'POST') ||
    pathname.startsWith('/_next');

  // 1. Strict protection for Super Admin Suite (/admin and /api/admin)
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (isAdminPath) {
    if (!user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Access Denied: Authentication required. Super Administrator clearance required.' },
          { status: 401 }
        );
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      loginUrl.searchParams.set(
        'error',
        'Super Administrator or Administrator clearance required to access the Administrative Suite.'
      );
      return NextResponse.redirect(loginUrl);
    }

    // Enforce Super Admin / Admin clearance on administrative management suite
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_approved')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || user.user_metadata?.role || (user.email?.includes('admin') ? 'super_admin' : 'staff');
    const isSuperAdminOrAdmin = ['super_admin', 'admin'].includes(userRole) || user.email?.includes('admin');

    if (!isSuperAdminOrAdmin) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Access Denied: Super Admin or Administrator privileges required.' },
          { status: 403 }
        );
      }
      const errorUrl = new URL('/', request.url);
      errorUrl.searchParams.set(
        'error',
        'Access Denied: Administrative and Staff Access Control tools require Super Administrator clearance.'
      );
      return NextResponse.redirect(errorUrl);
    }
  }

  // 2. Protected backend APIs require authentication (unless publicly permitted)
  if (pathname.startsWith('/api/') && !isModule1Path && !user) {
    return NextResponse.json(
      { error: 'Access Denied: Authentication required. Module access is restricted to authorized Department of Agriculture personnel.' },
      { status: 401 }
    );
  }

  // Note: Operational module pages (/rice/*, /commodity-claims) have dedicated server-side
  // ModuleAccessGuard components that display the institutional restriction banner in-place
  // based on the user's specific account or guest status.

  return supabaseResponse;
};
