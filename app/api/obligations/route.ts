import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getAccountByEmail, getEffectivePermissions } from '@/utils/adminStore';
import {
  getObligations,
  saveObligations,
  insertObligations,
  updateObligation,
  deleteObligations,
  resetObligations,
  getAllSheets,
  deleteSheet,
  renameSheet,
  ObligationBalanceRow,
} from '@/utils/obligationsStore';

export const dynamic = 'force-dynamic';

async function getObligationCaller(cookieStore: any, supabase: any) {
  let activeEmail: string | undefined = undefined;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) activeEmail = user.email;
  } catch {}

  if (!activeEmail) {
    const adminSessionCookie = cookieStore.get('da_admin_session')?.value;
    if (adminSessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(adminSessionCookie));
        if (parsed?.email) activeEmail = parsed.email;
      } catch {}
    }
  }

  if (!activeEmail) {
    return { authenticated: false, isSuperAdmin: false, canEditBudget: false, isSuspended: false };
  }

  const account = getAccountByEmail(activeEmail);
  const isSuperAdmin =
    activeEmail === 'super.admin@car.da.gov.ph' ||
    account?.role === 'super_admin';

  if (account?.status === 'suspended') {
    return { authenticated: true, email: activeEmail, isSuperAdmin: false, canEditBudget: false, isSuspended: true };
  }

  const effectivePerms = isSuperAdmin
    ? { can_edit_budget: true }
    : (account ? getEffectivePermissions(account) : { can_edit_budget: false });

  const canEditBudget = isSuperAdmin || effectivePerms.can_edit_budget !== false;

  return {
    authenticated: true,
    email: activeEmail,
    isSuperAdmin,
    canEditBudget,
    isSuspended: false,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetParam = searchParams.get('sheet') || 'Main Registry';

    const sheets = await getAllSheets();
    const rows = await getObligations(sheetParam);

    // Summary calculations: respect Grand Total row if present to avoid double-counting subtotals
    const grandTotalRow = rows.find(
      (r) =>
        (r.fund || '').toLowerCase().includes('grand total') ||
        (r.description || '').toLowerCase().includes('grand total') ||
        (r.pap || '').toLowerCase().includes('grand total') ||
        (r.rc || '').toLowerCase().includes('grand total') ||
        (r.source || '').toLowerCase().includes('grand total')
    );

    let totalAppropriations = 0;
    let totalAdjustedAllotment = 0;
    let totalObligation = 0;
    let totalUnobligated = 0;
    let totalEarmark = 0;
    let totalUnallocated = 0;
    let totalDisbursement = 0;
    let totalUnpaid = 0;

    if (grandTotalRow) {
      totalAppropriations = Number(grandTotalRow.appropriations) || 0;
      totalAdjustedAllotment = Number(grandTotalRow.adjusted_allotment) || 0;
      totalObligation = Number(grandTotalRow.total_obligation) || 0;
      totalUnobligated = Number(grandTotalRow.unobligated_allotment) || (totalAdjustedAllotment - totalObligation);
      totalEarmark = Number(grandTotalRow.earmark) || 0;
      totalUnallocated = Number(grandTotalRow.unallocated_allotment) || (totalUnobligated - totalEarmark);
      totalDisbursement = Number(grandTotalRow.disbursement) || 0;
      totalUnpaid = Number(grandTotalRow.unpaid) || Math.max(0, totalObligation - totalDisbursement);
    } else {
      const nonTotalRows = rows.filter(
        (r) =>
          !(r.fund || '').toLowerCase().includes('total') &&
          !(r.pap || '').toLowerCase().includes('total') &&
          !(r.rc || '').toLowerCase().includes('total') &&
          !(r.class || '').toLowerCase().includes('total') &&
          !(r.source || '').toLowerCase().includes('total')
      );
      const targetRows = nonTotalRows.length > 0 ? nonTotalRows : rows;

      totalAppropriations = targetRows.reduce((s, r) => s + (Number(r.appropriations) || 0), 0);
      totalAdjustedAllotment = targetRows.reduce((s, r) => s + (Number(r.adjusted_allotment) || 0), 0);
      totalObligation = targetRows.reduce((s, r) => s + (Number(r.total_obligation) || 0), 0);
      totalUnobligated = totalAdjustedAllotment - totalObligation;
      totalEarmark = targetRows.reduce((s, r) => s + (Number(r.earmark) || 0), 0);
      totalUnallocated = totalUnobligated - totalEarmark;
      totalDisbursement = targetRows.reduce((s, r) => s + (Number(r.disbursement) || 0), 0);
      totalUnpaid = Math.max(0, totalObligation - totalDisbursement);
    }

    const obligationRate = totalAdjustedAllotment > 0 ? (totalObligation / totalAdjustedAllotment) * 100 : 0;
    const disbursementRate = totalObligation > 0 ? (totalDisbursement / totalObligation) * 100 : 0;

    return NextResponse.json({
      success: true,
      currentSheet: sheetParam,
      sheets,
      rows,
      summary: {
        totalRows: rows.length,
        totalAppropriations,
        totalAdjustedAllotment,
        totalObligation,
        totalUnobligated,
        totalEarmark,
        totalUnallocated,
        totalDisbursement,
        totalUnpaid,
        obligationRate,
        disbursementRate,
      },
    });
  } catch (error: any) {
    console.error('Error fetching obligations:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const caller = await getObligationCaller(cookieStore, supabase);

    if (caller.isSuspended) {
      return NextResponse.json({ success: false, error: 'Access Denied: Your personnel account is suspended.' }, { status: 403 });
    }

    if (!caller.isSuperAdmin && !caller.canEditBudget) {
      return NextResponse.json(
        { success: false, error: 'Access Denied: The Super Administrator has revoked your permission to modify financial obligations and ledger balances (Module 02).' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rows, sheetName = 'Main Registry', mode = 'replace' } = body;

    if (!rows || (!Array.isArray(rows) && typeof rows !== 'object')) {
      return NextResponse.json({ success: false, error: 'Invalid payload: rows required' }, { status: 400 });
    }

    const rowsArray: any[] = Array.isArray(rows) ? rows : [rows];

    // Robust helper to extract value by normalized key matching
    const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const getVal = (r: any, ...keys: string[]) => {
      const targets = keys.map(norm);
      for (const t of targets) {
        for (const k of Object.keys(r)) {
          if (norm(k) === t) {
            const v = r[k];
            if (v !== undefined && v !== null && String(v).trim() !== '') {
              return v;
            }
          }
        }
      }
      return undefined;
    };

    const getNum = (r: any, ...keys: string[]) => {
      const v = getVal(r, ...keys);
      if (v === undefined || v === null) return 0;
      let str = String(v).trim();
      if (str === '' || str === '-' || str === '—' || str.includes('#DIV') || str === 'NaN') return 0;
      const isNegative = (str.startsWith('(') && str.endsWith(')')) || str.startsWith('-');
      str = str.replace(/[₱,$\s()]/g, '');
      const n = parseFloat(str);
      if (isNaN(n)) return 0;
      return isNegative ? -Math.abs(n) : n;
    };

    const cleanedRows: ObligationBalanceRow[] = rowsArray.map((r, i) => {
      const fund = String(getVal(r, 'FUND', 'fund', 'Fund Cluster', 'Fund Source') || '').trim();
      const pap = String(getVal(r, 'PAP', 'pap', 'PPA', 'Program') || '').trim();
      const source = String(getVal(r, 'SOURCE', 'source', 'Source of Funds') || '').trim();
      const allotmentClass = String(getVal(r, 'CLASS', 'class', 'Allotment Class', 'Object Class') || '').trim().toUpperCase();
      const rc = String(getVal(r, 'RC', 'rc', 'Responsibility Center', 'Station', 'Province') || '').trim();
      const objCode = String(getVal(r, 'OBJ CODE', 'obj_code', 'OBJCODE', 'Object Code', 'UACS') || '').trim();
      const description = String(getVal(r, 'DESCRIPTION', 'description', 'Particulars', 'Purpose') || '').trim();

      const appropriations = getNum(r, 'APPROPRIATIONS', 'appropriations', 'Appropriation');
      const adjustedAllotment = getNum(r, 'ADJUSTED ALLOTMENT', 'adjusted_allotment', 'Adjusted Allotment', 'Allotment Received', 'Allotment');
      const totalObligation = getNum(r, 'TOTAL OBLIGATION', 'total_obligation', 'Total Obligation', 'Obligated Amount', 'Obligation');
      const earmark = getNum(r, 'EARMARK', 'earmark', 'Earmarks');
      const disbursement = getNum(r, 'DISBURSEMENT', 'disbursement', 'Disbursements', 'Disbursed Amount', 'Paid');

      // Check for explicit precomputed columns or compute official formulas
      const rawUnobligated = getVal(r, 'UNOBLIGATED ALLOTMENT', 'unobligated_allotment', 'Unobligated');
      const unobligated = rawUnobligated !== undefined ? getNum(r, 'UNOBLIGATED ALLOTMENT', 'unobligated_allotment') : (adjustedAllotment - totalObligation);

      const rawUnallocated = getVal(r, 'UNALLOCATED ALLOTMENT', 'unallocated_allotment', 'Unallocated');
      const unallocated = rawUnallocated !== undefined ? getNum(r, 'UNALLOCATED ALLOTMENT', 'unallocated_allotment') : (unobligated - earmark);

      const rawUnpaid = getVal(r, 'UNPAID', 'unpaid', 'Unpaid Obligations');
      const unpaid = rawUnpaid !== undefined ? getNum(r, 'UNPAID', 'unpaid') : Math.max(0, totalObligation - disbursement);

      return {
        id: r.id || `ob-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        sheet_name: sheetName,
        row_order: r.row_order !== undefined ? Number(r.row_order) : i + 1,
        fund,
        pap,
        source,
        class: allotmentClass,
        rc,
        obj_code: objCode,
        description,
        appropriations,
        adjusted_allotment: adjustedAllotment,
        total_obligation: totalObligation,
        unobligated_allotment: unobligated,
        earmark,
        unallocated_allotment: unallocated,
        disbursement,
        unpaid,
        created_at: r.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const updated = await insertObligations(cleanedRows, sheetName, mode);
    const sheets = await getAllSheets();

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${cleanedRows.length} rows to sheet "${sheetName}" (${mode})`,
      currentSheet: sheetName,
      sheets,
      rows: updated,
    });
  } catch (error: any) {
    console.error('Error inserting obligations:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const caller = await getObligationCaller(cookieStore, supabase);

    if (caller.isSuspended) {
      return NextResponse.json({ success: false, error: 'Access Denied: Your personnel account is suspended.' }, { status: 403 });
    }

    if (!caller.isSuperAdmin && !caller.canEditBudget) {
      return NextResponse.json(
        { success: false, error: 'Access Denied: The Super Administrator has revoked your permission to modify financial obligations and ledger balances (Module 02).' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, updates, sheetName = 'Main Registry' } = body;

    if (!id || !updates) {
      return NextResponse.json({ success: false, error: 'Row id and updates required' }, { status: 400 });
    }

    const updatedRow = await updateObligation(id, updates, sheetName);
    if (!updatedRow) {
      return NextResponse.json({ success: false, error: 'Row not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, row: updatedRow });
  } catch (error: any) {
    console.error('Error updating obligation:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const caller = await getObligationCaller(cookieStore, supabase);

    if (caller.isSuspended) {
      return NextResponse.json({ success: false, error: 'Access Denied: Your personnel account is suspended.' }, { status: 403 });
    }

    if (!caller.isSuperAdmin && !caller.canEditBudget) {
      return NextResponse.json(
        { success: false, error: 'Access Denied: The Super Administrator has revoked your permission to modify or delete financial ledger balances (Module 02).' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ids, sheetName = 'Main Registry', deleteEntireSheet = false } = body;

    if (deleteEntireSheet) {
      await deleteSheet(sheetName);
      const sheets = await getAllSheets();
      const nextSheet = sheets[0]?.name || 'Main Registry';
      const rows = await getObligations(nextSheet);

      return NextResponse.json({
        success: true,
        message: `Deleted sheet "${sheetName}"`,
        sheets,
        currentSheet: nextSheet,
        rows,
      });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Array of ids required' }, { status: 400 });
    }

    const remaining = await deleteObligations(ids, sheetName);
    const sheets = await getAllSheets();

    return NextResponse.json({
      success: true,
      message: `Deleted ${ids.length} obligation records from "${sheetName}"`,
      sheets,
      rows: remaining,
    });
  } catch (error: any) {
    console.error('Error deleting obligations:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { renameAction, oldName, newName, sheetName = 'Main Registry' } = body;

    if (renameAction && oldName && newName) {
      await renameSheet(oldName, newName);
      const sheets = await getAllSheets();
      const rows = await getObligations(newName);

      return NextResponse.json({
        success: true,
        message: `Renamed sheet to "${newName}"`,
        sheets,
        currentSheet: newName,
        rows,
      });
    }

    const defaultData = await resetObligations(sheetName);
    const sheets = await getAllSheets();

    return NextResponse.json({
      success: true,
      message: `Cleared records for sheet "${sheetName}"`,
      sheets,
      currentSheet: sheetName,
      rows: defaultData,
    });
  } catch (error: any) {
    console.error('Error handling PATCH obligations:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
