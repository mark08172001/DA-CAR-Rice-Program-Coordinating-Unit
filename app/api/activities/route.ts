import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';
import { getAccountByEmail, getEffectivePermissions } from '@/utils/adminStore';
import {
  RegionalActivity,
  getAuthoritativeActivities,
  addLocalActivity,
  updateLocalActivity,
  deleteLocalActivity,
} from '@/utils/activitiesStore';

export const dynamic = 'force-dynamic';

async function getCallerIdentity(cookieStore: any, supabase: any) {
  let activeEmail: string | undefined = undefined;
  let userId: string | null = null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      activeEmail = user.email;
      userId = user.id;
    }
  } catch {}

  if (!activeEmail) {
    const adminSessionCookie = cookieStore.get('da_admin_session')?.value;
    if (adminSessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(adminSessionCookie));
        if (parsed?.email) {
          activeEmail = parsed.email;
          userId = parsed.id || 'usr-001';
        }
      } catch {}
    }
  }

  if (!activeEmail) {
    return { authenticated: false, email: null, isSuperAdmin: false, canAddActivities: false, isSuspended: false, userId: null };
  }

  const account = getAccountByEmail(activeEmail);
  const isSuperAdmin =
    activeEmail === 'super.admin@car.da.gov.ph' ||
    account?.role === 'super_admin';

  if (account?.status === 'suspended') {
    return { authenticated: true, email: activeEmail, isSuperAdmin: false, canAddActivities: false, isSuspended: true, userId };
  }

  const effectivePerms = isSuperAdmin
    ? { can_add_activities: true }
    : (account ? getEffectivePermissions(account) : { can_add_activities: true });

  const canAddActivities = isSuperAdmin || effectivePerms.can_add_activities !== false;

  return {
    authenticated: true,
    email: activeEmail,
    isSuperAdmin,
    canAddActivities,
    isSuspended: false,
    userId,
  };
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const db = createAdminClient() ?? supabase;

    let dbActivities: RegionalActivity[] = [];
    try {
      const { data, error } = await db
        .from('regional_activities')
        .select('*')
        .order('start_date', { ascending: true });
      if (!error && Array.isArray(data)) {
        dbActivities = data as RegionalActivity[];
      }
    } catch {}

    const authoritative = getAuthoritativeActivities(dbActivities);
    return NextResponse.json({ activities: authoritative });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching activities' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const caller = await getCallerIdentity(cookieStore, supabase);

    if (!caller.authenticated) {
      return NextResponse.json({ error: 'Authentication required to create activities.' }, { status: 401 });
    }

    if (caller.isSuspended) {
      return NextResponse.json({ error: 'Access Denied: Your account is suspended.' }, { status: 403 });
    }

    if (!caller.canAddActivities) {
      return NextResponse.json(
        { error: 'Access Denied: The Super Administrator has revoked your permission to add or modify activities in the Regional Calendar (Module 01).' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, category, province, location_details, start_date, end_date, status } = body;

    if (!title || !start_date) {
      return NextResponse.json({ error: 'Title and start date are required.' }, { status: 400 });
    }

    const isValidUuid = (id: string | null) =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    const id = `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newActivity: RegionalActivity = {
      id,
      title: title.trim(),
      description: description?.trim() || null,
      category: category || 'Production Support',
      province: province || 'Kalinga',
      location_details: location_details?.trim() || '',
      start_date,
      end_date: end_date || start_date,
      status: status || 'ongoing',
      created_by: isValidUuid(caller.userId) ? caller.userId : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Attempt DB insert
    try {
      const db = createAdminClient() ?? supabase;
      const { data, error } = await db
        .from('regional_activities')
        .insert({
          ...newActivity,
          id: undefined, // Let db generate if uuid, or use if string
        })
        .select()
        .maybeSingle();

      if (!error && data) {
        newActivity.id = data.id;
      }
    } catch (e) {
      console.warn('DB insert fallback note:', e);
    }

    // Save in authoritative local store
    addLocalActivity(newActivity);

    return NextResponse.json({ success: true, activity: newActivity });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating activity' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const caller = await getCallerIdentity(cookieStore, supabase);

    if (!caller.authenticated) {
      return NextResponse.json({ error: 'Authentication required to update activities.' }, { status: 401 });
    }

    if (caller.isSuspended) {
      return NextResponse.json({ error: 'Access Denied: Your account is suspended.' }, { status: 403 });
    }

    if (!caller.canAddActivities) {
      return NextResponse.json(
        { error: 'Access Denied: The Super Administrator has revoked your permission to add or modify activities in the Regional Calendar (Module 01).' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, title, description, category, province, location_details, start_date, end_date, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Activity ID is required.' }, { status: 400 });
    }

    const payload: Partial<RegionalActivity> = {};
    if (title !== undefined) payload.title = title.trim();
    if (description !== undefined) payload.description = description?.trim() || null;
    if (category !== undefined) payload.category = category;
    if (province !== undefined) payload.province = province;
    if (location_details !== undefined) payload.location_details = location_details?.trim() || '';
    if (start_date !== undefined) payload.start_date = start_date;
    if (end_date !== undefined) payload.end_date = end_date;
    if (status !== undefined) payload.status = status;

    // Attempt DB update
    try {
      const db = createAdminClient() ?? supabase;
      await db.from('regional_activities').update(payload).eq('id', id);
    } catch {}

    const updated = updateLocalActivity(id, payload);

    return NextResponse.json({ success: true, activity: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating activity' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const caller = await getCallerIdentity(cookieStore, supabase);

    if (!caller.authenticated) {
      return NextResponse.json({ error: 'Authentication required to delete activities.' }, { status: 401 });
    }

    if (caller.isSuspended) {
      return NextResponse.json({ error: 'Access Denied: Your account is suspended.' }, { status: 403 });
    }

    if (!caller.canAddActivities) {
      return NextResponse.json(
        { error: 'Access Denied: The Super Administrator has revoked your permission to delete activities from the Regional Calendar (Module 01).' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Activity ID is required.' }, { status: 400 });
    }

    // Attempt DB delete
    try {
      const db = createAdminClient() ?? supabase;
      await db.from('regional_activities').delete().eq('id', id);
    } catch {}

    deleteLocalActivity(id);

    return NextResponse.json({ success: true, message: 'Activity deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error deleting activity' }, { status: 500 });
  }
}
