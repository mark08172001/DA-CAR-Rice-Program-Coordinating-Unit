import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getAccounts, updateStaffAccessBySuperAdmin, deleteAccountBySuperAdmin, getAccountByEmail, syncProfilesFromSupabase } from '@/utils/adminStore';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

async function getCallerAuth(cookieStore: any, supabase: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const localAccount = getAccountByEmail(user.email);
      const userRole = (localAccount?.role || profile?.role || 'staff').toLowerCase();
      const isSuper = userRole === 'super_admin' || user.email === 'super.admin@car.da.gov.ph';
      const isAuth = isSuper || userRole === 'admin';

      return {
        authenticated: true,
        email: user.email,
        role: isSuper ? 'super_admin' : userRole,
        isSuperAdmin: isSuper,
        isAuthorized: isAuth,
        userId: user.id,
      };
    }
  } catch {}

  // Fallback to da_admin_session cookie
  const adminCookie = cookieStore.get('da_admin_session')?.value;
  if (adminCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(adminCookie));
      if (parsed?.email) {
        const localAccount = getAccountByEmail(parsed.email);
        const userRole = (localAccount?.role || parsed.role || 'staff').toLowerCase();
        const isSuper = userRole === 'super_admin' || parsed.email === 'super.admin@car.da.gov.ph';
        const isAuth = isSuper || userRole === 'admin';

        return {
          authenticated: true,
          email: parsed.email,
          role: isSuper ? 'super_admin' : userRole,
          isSuperAdmin: isSuper,
          isAuthorized: isAuth,
          userId: parsed.id || 'usr-001',
        };
      }
    } catch {}
  }

  return {
    authenticated: false,
    email: null,
    role: 'visitor',
    isSuperAdmin: false,
    isAuthorized: false,
    userId: null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const caller = await getCallerAuth(cookieStore, supabase);

    if (!caller.authenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!caller.isAuthorized) {
      return NextResponse.json(
        { error: 'Access Denied: Super Admin or Administrator privileges required.' },
        { status: 403 }
      );
    }

    try {
      const db = createAdminClient() ?? supabase;
      const { data: dbProfiles } = await db.from('profiles').select('*').order('created_at', { ascending: false });
      if (dbProfiles && dbProfiles.length > 0) {
        syncProfilesFromSupabase(dbProfiles);
      }
    } catch {}

    const accounts = getAccounts();
    return NextResponse.json({ accounts, callerRole: caller.role });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const caller = await getCallerAuth(cookieStore, supabase);

    if (!caller.authenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Super Admin or Admin privilege check to limit/modify staff access
    if (!caller.isAuthorized) {
      return NextResponse.json(
        { error: 'Access Denied: Only Super Admin and Administrators can modify staff access permissions.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetEmail, role, status, allowed_modules, permissions, notes } = body;

    if (!targetEmail) {
      return NextResponse.json({ error: 'Target email is required' }, { status: 400 });
    }

    // Attempt to update Supabase profiles table if it exists
    try {
      if (role || status) {
        const profileUpdate: any = {
          updated_at: new Date().toISOString(),
        };
        if (role) profileUpdate.role = role;
        if (status) profileUpdate.is_approved = status === 'active' || status === 'restricted';

        const db = createAdminClient() ?? supabase;
        const { error: profErr } = await db
          .from('profiles')
          .update(profileUpdate)
          .eq('email', targetEmail.trim().toLowerCase());
        if (profErr) console.warn('Profiles update error:', profErr.message);
      }
    } catch (e) {
      console.warn('Note updating Supabase profiles table:', e);
    }

    // Update persistent admin store
    const result = updateStaffAccessBySuperAdmin(
      targetEmail,
      { role, status, allowed_modules, permissions, notes },
      caller.email || 'super.admin@car.da.gov.ph'
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    // Sync auth user metadata if admin client is available
    try {
      const adminClient = createAdminClient();
      if (adminClient && result.account?.id && !result.account.id.startsWith('usr-')) {
        await adminClient.auth.admin.updateUserById(result.account.id, {
          user_metadata: {
            role: result.account.role,
            status: result.account.status,
            allowed_modules: result.account.allowed_modules,
            permissions: result.account.permissions,
          },
        });
      }
    } catch (authErr) {
      console.warn('Note updating auth metadata:', authErr);
    }

    return NextResponse.json({
      success: true,
      message: `Permissions updated successfully for ${targetEmail}.`,
      account: result.account,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update user access' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const caller = await getCallerAuth(cookieStore, supabase);

    if (!caller.authenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only Super Admin can delete user accounts
    if (!caller.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Access Denied: Only the Super Administrator has authority to delete registered personnel accounts.' },
        { status: 403 }
      );
    }

    const { targetEmail } = await request.json();
    if (!targetEmail) {
      return NextResponse.json({ error: 'Target email is required' }, { status: 400 });
    }

    // Delete from Supabase (auth user + cascading profile row)
    try {
      const admin = createAdminClient();
      const cleanTarget = targetEmail.trim().toLowerCase();

      // 1. Invoke PostgreSQL SECURITY DEFINER RPC to delete from auth.users and profiles
      try {
        await supabase.rpc('delete_user_account', { user_email: cleanTarget });
      } catch (rpcErr) {
        console.warn('RPC delete_user_account note:', rpcErr);
      }

      // 2. If service role admin client is present, also explicitly delete auth user
      if (admin) {
        try {
          const { data: prof } = await admin.from('profiles').select('id').eq('email', cleanTarget).maybeSingle();
          if (prof?.id) {
            const { error: delAuthErr } = await admin.auth.admin.deleteUser(prof.id);
            if (delAuthErr) console.warn('Auth user delete error:', delAuthErr.message);
          }
        } catch (adminErr) {
          console.warn('Admin client delete note:', adminErr);
        }
        await admin.from('profiles').delete().eq('email', cleanTarget);
      }

      // 3. Fallback direct profile removal
      await supabase.from('profiles').delete().eq('email', cleanTarget);
    } catch (e) {
      console.warn('Note deleting from profiles table:', e);
    }

    const result = deleteAccountBySuperAdmin(targetEmail, caller.email || 'super.admin@car.da.gov.ph');

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Account ${targetEmail} has been permanently deleted.`,
      deletedAccount: result.deletedAccount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete user account' }, { status: 500 });
  }
}
