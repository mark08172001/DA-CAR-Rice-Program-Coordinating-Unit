import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getAccountByEmail, getEffectivePermissions } from '@/utils/adminStore';
import {
  getLocalPrograms,
  saveLocalPrograms,
  getAuthoritativePrograms,
  Program,
} from '@/utils/programsStore';

const CATEGORY_NAMES: Record<string, string> = {
  PSS: 'Production Support Services',
  ESETS: 'Extension Support, Education and Training Services',
  RD: 'Research and Development',
  INS: 'Irrigation Network Services',
};

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data } = await supabase
      .from('programs')
      .select('*')
      .order('display_order', { ascending: true });

    const merged = getAuthoritativePrograms(data);
    return NextResponse.json({ success: true, programs: merged });
  } catch (e) {
    console.error('Supabase fetch error, using local fallback:', e);
    const localData = getLocalPrograms();
    return NextResponse.json({ success: true, programs: localData });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      category,
      description = '',
      status = 'Active',
      target_beneficiaries = '',
      allotment_class = 'MOOE',
      province = 'Regional (CAR)',
      start_date = null,
      end_date = null,
      date_coverage = '',
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Program name is required' },
        { status: 400 }
      );
    }

    const validCategory = (category || 'PSS').toUpperCase();
    if (!CATEGORY_NAMES[validCategory]) {
      return NextResponse.json(
        { success: false, error: 'Invalid category. Choose PSS, ESETS, RD, or INS.' },
        { status: 400 }
      );
    }

    const category_name = CATEGORY_NAMES[validCategory];
    const newId = `prog-${validCategory.toLowerCase()}-${Date.now()}`;

    // Read current local programs to determine display_order
    const localPrograms = getLocalPrograms();
    const newDisplayOrder = localPrograms.length + 1;

    const newProgramRecord = {
      id: newId,
      category: validCategory,
      category_name,
      name: name.trim(),
      description: description.trim(),
      status: status.trim() || 'Active',
      target_beneficiaries: target_beneficiaries.trim(),
      province: province.trim() || 'Regional (CAR)',
      municipality: '',
      barangay: '',
      allotment_class: allotment_class.trim() || 'MOOE',
      start_date: start_date || null,
      end_date: end_date || null,
      date_coverage: date_coverage ? date_coverage.trim() : (start_date && end_date ? `${start_date} to ${end_date}` : 'CY 2026'),
      display_order: newDisplayOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Try persisting to Supabase
    let savedToSupabase = false;
    try {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);
      const { data, error } = await supabase
        .from('programs')
        .insert([newProgramRecord])
        .select()
        .single();

      if (!error && data) {
        savedToSupabase = true;
      }
    } catch (e) {
      console.warn('Could not insert to Supabase, continuing with local persistence:', e);
    }

    // 2. Also persist to local JSON dataset
    localPrograms.push(newProgramRecord);
    saveLocalPrograms(localPrograms);

    return NextResponse.json({
      success: true,
      program: newProgramRecord,
      savedToSupabase,
    });
  } catch (error: any) {
    console.error('Error creating program:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create program' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      category,
      description = '',
      status = 'Active',
      target_beneficiaries = '',
      allotment_class = 'MOOE',
      province = 'Regional (CAR)',
      start_date,
      end_date,
      date_coverage,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Program ID is required for updating' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Program name is required' },
        { status: 400 }
      );
    }

    const validCategory = (category || 'PSS').toUpperCase();
    const category_name = CATEGORY_NAMES[validCategory] || validCategory;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Permission enforcement: Verify that calling user has permission to edit programs
    const { data: { user } } = await supabase.auth.getUser();
    let activeEmail = user?.email;
    if (!activeEmail) {
      const adminCookie = cookieStore.get('da_admin_session')?.value;
      if (adminCookie) {
        try {
          const parsed = JSON.parse(decodeURIComponent(adminCookie));
          if (parsed?.email) activeEmail = parsed.email;
        } catch {}
      }
    }

    if (activeEmail) {
      const account = getAccountByEmail(activeEmail);
      if (account) {
        const perms = getEffectivePermissions(account);
        if (perms.can_edit_programs === false) {
          return NextResponse.json(
            {
              success: false,
              error: 'Access Denied: The administrator has revoked your permission to edit programs under /rice/programs.',
            },
            { status: 403 }
          );
        }
      }
    }

    const updatedFields: any = {
      name: name.trim(),
      category: validCategory,
      category_name,
      description: description.trim(),
      status: (status || 'Active').trim(),
      target_beneficiaries: (target_beneficiaries || '').trim(),
      allotment_class: (allotment_class || 'MOOE').trim(),
      province: (province || 'Regional (CAR)').trim(),
      ...(start_date !== undefined ? { start_date: start_date || null } : {}),
      ...(end_date !== undefined ? { end_date: end_date || null } : {}),
      ...(date_coverage !== undefined ? { date_coverage: date_coverage.trim() } : {}),
      updated_at: new Date().toISOString(),
    };

    // 1. Try updating in Supabase
    let updatedInSupabase = false;
    let updatedProgram: any = null;

    try {
      const supabase = createClient(cookieStore);
      const { data, error } = await supabase
        .from('programs')
        .update(updatedFields)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        updatedInSupabase = true;
        updatedProgram = data;
      }
    } catch (e) {
      console.warn('Could not update in Supabase, continuing with local persistence:', e);
    }

    // 2. Also update in local JSON dataset
    const localPrograms = getLocalPrograms();
    const idx = localPrograms.findIndex(
      (p: any) => String(p.id) === String(id) || (p.name && p.name.toLowerCase() === name.trim().toLowerCase())
    );

    if (idx !== -1) {
      localPrograms[idx] = {
        ...localPrograms[idx],
        ...updatedFields,
        id: localPrograms[idx].id || id,
      };
      if (!updatedProgram) updatedProgram = localPrograms[idx];
      saveLocalPrograms(localPrograms);
    } else {
      if (!updatedProgram) updatedProgram = { id, ...updatedFields };
    }

    return NextResponse.json({
      success: true,
      program: updatedProgram,
      updatedInSupabase,
    });
  } catch (error: any) {
    console.error('Error updating program:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update program' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Program ID is required for deletion' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Permission enforcement: Verify that calling user has permission to delete programs
    const { data: { user } } = await supabase.auth.getUser();
    let activeEmail = user?.email;
    if (!activeEmail) {
      const adminCookie = cookieStore.get('da_admin_session')?.value;
      if (adminCookie) {
        try {
          const parsed = JSON.parse(decodeURIComponent(adminCookie));
          if (parsed?.email) activeEmail = parsed.email;
        } catch {}
      }
    }

    if (activeEmail) {
      const account = getAccountByEmail(activeEmail);
      if (account) {
        const perms = getEffectivePermissions(account);
        if (perms.can_delete_programs === false) {
          return NextResponse.json(
            {
              success: false,
              error: 'Access Denied: The administrator has revoked your permission to delete programs under /rice/programs.',
            },
            { status: 403 }
          );
        }
      }
    }

    // 1. Try deleting from Supabase
    let deletedFromSupabase = false;
    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);

      if (!error) {
        deletedFromSupabase = true;
      }
    } catch (e) {
      console.warn('Could not delete from Supabase, continuing with local cleanup:', e);
    }

    // 2. Also remove from local JSON file
    const localPrograms = getLocalPrograms();
    const updatedPrograms = localPrograms.filter((p: any) => p.id !== id);
    saveLocalPrograms(updatedPrograms);

    return NextResponse.json({
      success: true,
      deletedId: id,
      deletedFromSupabase,
    });
  } catch (error: any) {
    console.error('Error deleting program:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete program' },
      { status: 500 }
    );
  }
}
