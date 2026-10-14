import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { registerOrUpdateUser, recordGenericAuditLog } from '@/utils/adminStore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName, department, role } = await request.json();

    if (!email || !fullName) {
      return NextResponse.json({ error: 'Email and full name are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = ['admin', 'officer', 'staff'].includes(role) ? role : 'staff';

    // 1. Register in admin store with actual Supabase user ID if available
    const account = registerOrUpdateUser(
      cleanEmail,
      fullName.trim(),
      department || 'Rice Program Coordinating Unit',
      cleanRole as any,
      userId
    );

    // 2. Sync directly into Supabase profiles table (pending approval)
    let dbSynced = false;
    let dbError: string | null = null;
    try {
      const cookieStore = await cookies();
      const db = createAdminClient() ?? createClient(cookieStore);
      if (userId) {
        const { error } = await db.from('profiles').upsert(
          {
            id: userId,
            full_name: fullName.trim(),
            email: cleanEmail,
            department: department || 'Rice Program Coordinating Unit',
            role: cleanRole,
            is_approved: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
        if (error) {
          dbError = error.message;
          console.warn('Profiles sync note:', error.message);
        } else {
          dbSynced = true;
        }
      }
    } catch (e: any) {
      dbError = e?.message || 'Error communicating with Supabase';
      console.warn('Supabase sync catch:', e);
    }

    // 3. Record in audit logs
    recordGenericAuditLog(
      cleanEmail,
      cleanRole.toUpperCase(),
      'SYSTEM_CONFIG',
      'NOTICE',
      `New personnel registration submitted and pending Super Admin approval: ${fullName.trim()} (${cleanEmail}) under ${department || 'Rice Program Coordinating Unit'}.`,
      cleanEmail
    );

    return NextResponse.json({ success: true, account, dbSynced, dbError });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Registration error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Check and clear stale auth records if re-registering
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    try {
      await supabase.rpc('delete_user_account', { user_email: cleanEmail });
    } catch (rpcErr) {
      console.warn('RPC delete note during stale cleanup:', rpcErr);
    }

    const admin = createAdminClient();
    if (admin) {
      try {
        const { data: prof } = await admin.from('profiles').select('id').eq('email', cleanEmail).maybeSingle();
        if (prof?.id) {
          await admin.auth.admin.deleteUser(prof.id);
        }
      } catch (adminErr) {
        console.warn('Admin deleteUser note:', adminErr);
      }
      await admin.from('profiles').delete().eq('email', cleanEmail);
    }

    return NextResponse.json({ success: true, cleared: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error clearing stale account' }, { status: 500 });
  }
}
