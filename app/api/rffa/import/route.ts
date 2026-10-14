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
        { error: 'Unauthorized. Personnel login required to import RFFA records.' },
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
        // Direct key lookup
        for (const k of keys) {
          if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '') {
            return String(r[k]).trim();
          }
        }
        // Case-insensitive / normalized lookup fallback
        const rKeys = Object.keys(r);
        for (const k of keys) {
          const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchedKey = rKeys.find(
            (orig) => orig.toLowerCase().replace(/[^a-z0-9]/g, '') === normK
          );
          if (matchedKey && r[matchedKey] !== undefined && r[matchedKey] !== null && String(r[matchedKey]).trim() !== '') {
            return String(r[matchedKey]).trim();
          }
        }
        return null;
      };

      const region = getVal('Region') || 'CAR';
      const province = getVal('Province');
      const cityMunicipality = getVal('CityMunicipality', 'City/Municipality', 'Municipality', 'Town', 'City');
      const panaloKardNo = getVal('PanaloKardNo', 'Panalokard Number', 'Panalo Kard No', 'Panalokard');
      const cardNumber = getVal('Card_Number', 'Card Number', 'CardNumber', 'Card No');
      const rsbsaRefNo = getVal('RSBSARefNo', 'RSBSA Ref No', 'RSBSA RefNumber', 'RSBSA');
      const firstName = getVal('FirstName', 'First Name', 'Firstname');
      const middleName = getVal('MiddleName', 'Middle Name', 'Middlename');
      const lastName = getVal('LastName', 'Last Name', 'Lastname');
      const birthDate = getVal('BirthDate', 'Birth Date', 'DOB', 'Date of Birth');
      const dateOfCashout = getVal('DateOfCashout', 'Date Of Cashout', 'Cashout Date', 'Payout Date', 'Date');
      const yearFunded = getVal('YEAR FUNDED', 'Year Funded', 'YearFunded', 'Year');
      const remarks = getVal('REMARKS', 'Remarks', 'Status', 'Notes');

      return {
        Region: region,
        Province: province,
        CityMunicipality: cityMunicipality,
        PanaloKardNo: panaloKardNo,
        Card_Number: cardNumber,
        RSBSARefNo: rsbsaRefNo,
        FirstName: firstName || '—',
        MiddleName: middleName,
        LastName: lastName || '—',
        BirthDate: birthDate,
        DateOfCashout: dateOfCashout,
        'YEAR FUNDED': yearFunded,
        REMARKS: remarks,
      };
    });

    const clientToUse = createAdminClient() || supabase;

    // Insert batch in chunks of 200 rows for fast and robust DB operations
    const CHUNK_SIZE = 200;
    let insertedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < cleanRows.length; i += CHUNK_SIZE) {
      const chunk = cleanRows.slice(i, i + CHUNK_SIZE);
      const { error } = await clientToUse
        .from('rffa_beneficiaries')
        .insert(chunk);

      if (error) {
        console.error('RFFA batch import chunk error:', error.message);
        errors.push(error.message);
      } else {
        insertedCount += chunk.length;
      }
    }

    if (errors.length > 0 && insertedCount === 0) {
      // Check if table missing
      if (errors[0].toLowerCase().includes('relation') || errors[0].toLowerCase().includes('does not exist')) {
        return NextResponse.json(
          {
            error: 'The "rffa_beneficiaries" table does not exist in Supabase yet. Please execute the migration SQL script (20261006_create_rffa_beneficiaries.sql) in your Supabase SQL editor first.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `Database insert failed: ${errors[0]}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedCount.toLocaleString('en-PH')} RFFA beneficiary records.`,
      importedCount: insertedCount,
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('Error in RFFA import route:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during RFFA import' },
      { status: 500 }
    );
  }
}
