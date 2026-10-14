import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getLoginLogs, getAuditLogs, recordUserLogin, recordGenericAuditLog, getAccountByEmail, clearAuditLogs, clearLoginLogs } from '@/utils/adminStore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const localAccount = getAccountByEmail(user.email || '');
    const userRole = localAccount?.role || profile?.role || 'staff';

    if (!['super_admin', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Access Denied: Super Admin or Administrator privileges required to view security logs.' },
        { status: 403 }
      );
    }

    const loginLogs = getLoginLogs();
    const auditLogs = getAuditLogs();

    return NextResponse.json({
      login_logs: loginLogs,
      audit_logs: auditLogs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, email, fullName, role, ipAddress, userAgent, location, actionType, severity, details, targetUser } = body;

    if (type === 'login') {
      const res = recordUserLogin(
        email,
        fullName || '',
        role || 'staff',
        ipAddress || '120.28.184.45 (Baguio RFO)',
        userAgent || 'Web Browser',
        location || 'Cordillera Region'
      );
      return NextResponse.json({ success: true, result: res });
    }

    if (type === 'audit') {
      recordGenericAuditLog(
        email || 'system',
        role || 'STAFF',
        actionType || 'SYSTEM_CONFIG',
        severity || 'INFO',
        details || 'Action logged',
        targetUser
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to record log event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const localAccount = getAccountByEmail(user.email || '');
    const userRole = localAccount?.role || 'staff';

    if (!['super_admin', 'admin'].includes(userRole) && !user.email?.includes('admin')) {
      return NextResponse.json({ error: 'Super Admin or Administrator privileges required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const target = searchParams.get('type') || 'audit';

    if (target === 'audit' || target === 'all') {
      clearAuditLogs();
    }
    if (target === 'login' || target === 'all') {
      clearLoginLogs();
    }

    return NextResponse.json({ success: true, message: 'Logs cleared successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to clear logs' }, { status: 500 });
  }
}
