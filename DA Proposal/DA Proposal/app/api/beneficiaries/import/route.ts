import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAccountByEmail, getEffectivePermissions } from '@/utils/adminStore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    const adminSessionCookie = cookieStore.get('da_admin_session')?.value;

    let activeEmail = user?.email;
    if (!activeEmail && adminSessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(adminSessionCookie));
        if (parsed?.email) activeEmail = parsed.email;
      } catch {}
    }

    if (!activeEmail) {
      return NextResponse.json(
        { error: 'Unauthorized. Personnel login required to import records.' },
        { status: 401 }
      );
    }

    const account = getAccountByEmail(activeEmail);
    const userRole = (account?.role || user?.user_metadata?.role || '').toLowerCase();
    const isSuperAdmin = userRole === 'super_admin' || activeEmail === 'super.admin@car.da.gov.ph';

    if (account?.status === 'suspended') {
      return NextResponse.json(
        { error: 'Access Denied: Your account has been suspended by the Super Admin.' },
        { status: 403 }
      );
    }

    // 2. Check Module 03 (Beneficiaries) Access
    const allowedModules = isSuperAdmin
      ? ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance', 'mod-admin']
      : (account?.allowed_modules || ['mod-general']);

    if (!allowedModules.includes('mod-beneficiary')) {
      return NextResponse.json(
        { error: 'Access Denied: Your account does not have access to Module 03 (Beneficiaries & Field Services).' },
        { status: 403 }
      );
    }

    // 3. Check Granular Action Power: can_import_beneficiaries
    const effectivePerms = getEffectivePermissions(account);
    if (!isSuperAdmin && effectivePerms.can_import_beneficiaries === false) {
      return NextResponse.json(
        { error: 'Access Denied: Your power to import beneficiary records has been removed by the Super Admin.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No data rows provided for import.' },
        { status: 400 }
      );
    }

    // Standardize column mappings from CSV/Excel
    const cleanRows = rows.map((r: any) => {
      const getVal = (...keys: string[]) => {
        for (const k of keys) {
          if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '') {
            return String(r[k]).trim();
          }
        }
        return null;
      };

      const getNum = (...keys: string[]) => {
        const v = getVal(...keys);
        if (v === null) return 0;
        const cleaned = v.replace(/[₱,$\s]/g, '');
        const n = parseFloat(cleaned);
        return isNaN(n) ? 0 : n;
      };

      const refNo = getVal('Reference no.', 'Reference no', 'Reference', 'Reference No.', 'Ref No');
      const rsbsa = getVal('RSBSA RefNumber', 'RSBSA Ref Number', 'RSBSA Ref', 'RSBSA');
      const firstName = getVal('First Name', 'FirstName', 'First name');
      const lastName = getVal('Last name', 'LastName', 'Last Name');
      const municipality = getVal('Municipality', 'Town');
      const province = getVal('Province');
      const panalokard = getVal('PanalokardNumber', 'Panalokard Number', 'Panalokard');
      const merchantUuid = getVal('Merchant UUID', 'Merchant UUID');
      const merchantName = getVal('Merchant Name', 'MerchantName', 'Merchant');
      const productCategory = getVal('Product Category', 'Category');
      const productName = getVal('Product Name', 'ProductName', 'Product');
      const productDesc = getVal('Product Description', 'Description');
      const unit = getVal('Unit');
      const region = getVal('Region') || 'CAR';
      const date = getVal('Date', 'Transaction Date');
      const qty = getNum('Qty', 'Quantity');
      const amount = getNum('Amount', 'Unit Price');
      const totalAmount = getNum('Total Amount', 'Total', 'TotalAmount') || (qty * amount);

      return {
        'Reference no.': refNo || `IMC-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        PanalokardNumber: panalokard,
        'RSBSA RefNumber': rsbsa,
        'Merchant UUID': merchantUuid,
        'Merchant Name': merchantName,
        'First Name': firstName || 'Unknown',
        'Last name': lastName || 'Beneficiary',
        Municipality: municipality,
        Province: province,
        'Product Category': productCategory || 'Intervention Voucher',
        'Product Name': productName,
        'Product Description': productDesc,
        Qty: qty,
        Unit: unit,
        Amount: amount,
        'Total Amount': totalAmount,
        Region: region,
        Date: date || new Date().toISOString().split('T')[0],
      };
    });

    const clientToUse = createAdminClient() || supabase;

    // Upsert batch in chunks of 200 rows for fast and robust DB operations
    const CHUNK_SIZE = 200;
    let insertedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < cleanRows.length; i += CHUNK_SIZE) {
      const chunk = cleanRows.slice(i, i + CHUNK_SIZE);
      const { error } = await clientToUse
        .from('farmer_serve_transactions')
        .upsert(chunk, { onConflict: '"Reference no."' });

      if (error) {
        console.error('Batch import chunk error:', error.message);
        errors.push(error.message);
      } else {
        insertedCount += chunk.length;
      }
    }

    if (errors.length > 0 && insertedCount === 0) {
      return NextResponse.json(
        { error: `Database insert failed: ${errors[0]}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedCount} IMC beneficiary records.`,
      importedCount: insertedCount,
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('Error in IMC import route:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during import' },
      { status: 500 }
    );
  }
}
