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

    // 2. If NO Supabase user, check for Super Admin emergency session cookie
    const adminSessionCookie = cookieStore.get('da_admin_session')?.value;
    if (adminSessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(adminSessionCookie));
        if (parsed?.email && (parsed.email === 'super.admin@car.da.gov.ph' || parsed.email === 'admin@car.da.gov.ph')) {
          const localAcc = getAccountByEmail(parsed.email);
          return NextResponse.json({
            authenticated: true,
            user: {
              id: parsed.id || 'usr-001',
              email: parsed.email,
              user_metadata: {
                full_name: parsed.full_name,
                role: parsed.role || 'super_admin',
                department: parsed.department,
              },
            },
            account: {
              id: parsed.id || 'usr-001',
              email: parsed.email,
              full_name: parsed.full_name,
              department: parsed.department,
              role: 'super_admin',
              status: 'active',
              allowed_modules: localAcc?.allowed_modules || [
                'mod-general',
                'mod-rice',
                'mod-beneficiary',
                'mod-finance',
                'mod-admin',
              ],
              permissions: localAcc ? getEffectivePermissions(localAcc) : getDefaultPermissionsForRole('super_admin'),
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
