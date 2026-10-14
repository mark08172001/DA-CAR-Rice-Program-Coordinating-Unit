import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getAccountByEmail, isAccountDeleted, getEffectivePermissions, getDefaultPermissionsForRole } from '@/utils/adminStore';

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

      // Retrieve authoritative account with permissions from admin store
      const localAccount = getAccountByEmail(user.email);

      if (localAccount) {
        return NextResponse.json({
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata,
          },
          account: {
            id: localAccount.id || user.id,
            email: localAccount.email,
            full_name: localAccount.full_name,
            department: localAccount.department,
            role: localAccount.role,
            status: localAccount.status,
            allowed_modules: localAccount.allowed_modules,
            permissions: getEffectivePermissions(localAccount),
            notes: localAccount.notes,
          },
        });
      }

      // Fallback: Query Supabase profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role || user.user_metadata?.role || (user.email === 'super.admin@car.da.gov.ph' ? 'super_admin' : 'staff');
      const isApproved = profile?.is_approved !== false;
      const isSuper = role === 'super_admin' || role === 'admin' || user.email === 'super.admin@car.da.gov.ph';
      const fallbackAccount: any = {
        role,
        status: isApproved ? 'active' : 'pending_approval',
      };

      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
        },
        account: {
          id: user.id,
          email: user.email,
          full_name: profile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0],
          department: profile?.department || 'Rice Program Coordinating Unit',
          role,
          status: isApproved ? 'active' : 'pending_approval',
          allowed_modules: isSuper
            ? ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance', 'mod-admin']
            : ['mod-general'],
          permissions: getEffectivePermissions(fallbackAccount),
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

          const localAcc = getAccountByEmail(email);
          const isSuper = email === 'super.admin@car.da.gov.ph' || localAcc?.role === 'super_admin' || parsed.role === 'super_admin';
          const role = isSuper ? 'super_admin' : (localAcc?.role || parsed.role || 'staff');
          const status = localAcc?.status || 'active';

          return NextResponse.json({
            authenticated: true,
            user: {
              id: parsed.id || localAcc?.id || 'usr-001',
              email,
              user_metadata: {
                full_name: parsed.full_name || localAcc?.full_name || email,
                role,
                department: parsed.department || localAcc?.department,
              },
            },
            account: {
              id: parsed.id || localAcc?.id || 'usr-001',
              email,
              full_name: parsed.full_name || localAcc?.full_name || email,
              department: parsed.department || localAcc?.department || 'Rice Program Coordinating Unit',
              role,
              status,
              allowed_modules: isSuper
                ? ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance', 'mod-admin']
                : (localAcc?.allowed_modules || ['mod-general']),
              permissions: isSuper
                ? getDefaultPermissionsForRole('super_admin')
                : (localAcc ? getEffectivePermissions(localAcc) : getDefaultPermissionsForRole(role)),
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
