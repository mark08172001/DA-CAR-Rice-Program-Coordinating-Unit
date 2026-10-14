import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getAccountByEmail, isAccountDeleted, getAuthoritativeUserAccess } from '@/utils/adminStore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    // 1. If Supabase user exists, that is the authoritative authenticated session
    if (user && user.email) {
      // Check if account has been deleted by Super Admin
      if (isAccountDeleted(user.email)) {
        return NextResponse.json({
          authenticated: true,
          user: { id: user.id, email: user.email },
          account: {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
            department: 'Rice Program Coordinating Unit',
            role: 'staff',
            status: 'suspended',
            allowed_modules: [],
            permissions: {
              can_add_activities: false,
              can_edit_budget: false,
              can_import_beneficiaries: false,
              can_manage_claims: false,
              can_delete_programs: false,
              can_edit_programs: false,
            },
            is_deleted: true,
          },
        });
      }

      // Retrieve authoritative account with permissions (Supabase cloud first, then admin store)
      const access = await getAuthoritativeUserAccess(user.email, supabase);
      const localAccount = getAccountByEmail(user.email);

      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
        },
        account: {
          id: localAccount?.id || user.id,
          email: user.email,
          full_name: access.fullName,
          department: access.department,
          role: access.role,
          status: access.status,
          allowed_modules: access.allowed_modules,
          permissions: access.permissions,
          notes: localAccount?.notes,
        },
      });
    }

    // 2. If NO Supabase user, check for emergency / admin session cookie
    const adminSessionCookie = cookieStore.get('da_admin_session')?.value;
    if (adminSessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(adminSessionCookie));
        if (parsed?.email) {
          const email = parsed.email.trim().toLowerCase();

          // Check if deleted
          if (isAccountDeleted(email)) {
            return NextResponse.json({
              authenticated: true,
              user: { id: parsed.id || 'usr-001', email },
              account: {
                id: parsed.id || 'usr-001',
                email,
                full_name: parsed.full_name || email,
                department: parsed.department || 'Rice Program Coordinating Unit',
                role: 'staff',
                status: 'suspended',
                allowed_modules: [],
                permissions: {
                  can_add_activities: false,
                  can_edit_budget: false,
                  can_import_beneficiaries: false,
                  can_manage_claims: false,
                  can_delete_programs: false,
                  can_edit_programs: false,
                },
                is_deleted: true,
              },
            });
          }

          const access = await getAuthoritativeUserAccess(email, supabase);
          const localAcc = getAccountByEmail(email);

          return NextResponse.json({
            authenticated: true,
            user: {
              id: parsed.id || localAcc?.id || 'usr-001',
              email,
              user_metadata: {
                full_name: access.fullName,
                role: access.role,
                department: access.department,
              },
            },
            account: {
              id: parsed.id || localAcc?.id || 'usr-001',
              email,
              full_name: access.fullName,
              department: access.department,
              role: access.role,
              status: access.status,
              allowed_modules: access.allowed_modules,
              permissions: access.permissions,
              notes: localAcc?.notes,
            },
          });
        }
      } catch {
        // Fall through to unauthenticated
      }
    }

    return NextResponse.json({ authenticated: false, user: null, account: null });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error fetching user session' },
      { status: 500 }
    );
  }
}
