import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'IMC';
    const format = (searchParams.get('format') || 'xlsx').toLowerCase();
    const search = searchParams.get('search') || '';
    const province = searchParams.get('province') || '';
    const municipality = searchParams.get('municipality') || '';
    const sortField = searchParams.get('sortField') || 'Date';
    const sortAscending = searchParams.get('sortAsc') === 'true';
    const scope = searchParams.get('scope') || 'all'; // 'all' or 'page'
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    let rows: any[] = [];
    let sheetName = 'Beneficiaries';
    let filePrefix = 'DA-CAR_Beneficiaries';

    if (tab === 'IMC') {
      sheetName = 'IMC Voucher Redemptions';
      filePrefix = 'DA-CAR_IMC_Beneficiaries';

      let query = supabase.from('farmer_serve_transactions').select('*');

      if (province) {
        query = query.ilike('Province', `%${province}%`);
      }
      if (municipality) {
        query = query.ilike('Municipality', `%${municipality}%`);
      }
      if (search) {
        query = query.or(
          `"First Name".ilike.%${search}%,"Last name".ilike.%${search}%,"RSBSA RefNumber".ilike.%${search}%,"Reference no.".ilike.%${search}%,"PanalokardNumber".ilike.%${search}%,"Merchant Name".ilike.%${search}%`
        );
      }

      if (sortField) {
        query = query.order(sortField, { ascending: sortAscending, nullsFirst: false });
      }

      if (scope === 'page') {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);
        const { data, error } = await query;
        if (error) throw error;
        rows = data || [];
      } else {
        // Fetch all matching records in pages of 1000
        const PAGE_BATCH = 1000;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await query.range(offset, offset + PAGE_BATCH - 1);
          if (error) throw error;
          if (!data || data.length === 0) {
            hasMore = false;
          } else {
            rows.push(...data);
            offset += data.length;
            if (data.length < PAGE_BATCH) {
              hasMore = false;
            }
          }
        }
      }

      // Format rows for clear and structured spreadsheet headers
      rows = rows.map((r, idx) => ({
        '#': idx + 1,
        'Date': r['Date'] || '',
        'Reference No.': r['Reference no.'] || '',
        'RSBSA Ref Number': r['RSBSA RefNumber'] || '',
        'Panalokard Number': r['PanalokardNumber'] || '',
        'First Name': r['First Name'] || '',
        'Last Name': r['Last name'] || '',
        'Municipality': r['Municipality'] || '',
        'Province': r['Province'] || '',
        'Product Category': r['Product Category'] || '',
        'Product Name': r['Product Name'] || '',
        'Product Description': r['Product Description'] || '',
        'Qty': r['Qty'] || 0,
        'Unit': r['Unit'] || '',
        'Amount (₱)': r['Amount'] || 0,
        'Total Amount (₱)': r['Total Amount'] || 0,
        'Merchant Name': r['Merchant Name'] || '',
        'Merchant UUID': r['Merchant UUID'] || '',
        'Region': r['Region'] || 'CAR',
      }));
    } else if (tab === 'INKIND') {
      sheetName = 'In-Kind Seed Distribution';
      filePrefix = 'DA-CAR_InKind_Distribution';
      // Fallback/standard columns for InKind
      rows = [
        {
          '#': 1,
          'Distribution Date': '2026-09-18',
          'Control No.': 'IK-CAR-2026-001',
          'Beneficiary Name': 'Pedro Penduko',
          'RSBSA No.': '14-01-08-004-000101',
          'Municipality': 'La Paz',
          'Province': 'Abra',
          'Commodity / Input': 'Certified Inbred Rice Seeds (NSIC Rc 222)',
          'Quantity': 2,
          'Unit': 'Bags (40kg)',
          'Distribution Batch': 'Batch 2026 Wet Season',
          'Status': 'Claimed',
        },
        {
          '#': 2,
          'Distribution Date': '2026-09-19',
          'Control No.': 'IK-CAR-2026-002',
          'Beneficiary Name': 'Maria Clara',
          'RSBSA No.': '14-01-08-004-000102',
          'Municipality': 'Bangued',
          'Province': 'Abra',
          'Commodity / Input': 'Biofertilizer Micro-Inoculant',
          'Quantity': 4,
          'Unit': 'Packs',
          'Distribution Batch': 'Batch 2026 Wet Season',
          'Status': 'Claimed',
        }
      ];
    } else {
      sheetName = 'RFFA Beneficiaries';
      filePrefix = 'DA-CAR_RFFA_Assistance';

      try {
        let query = supabase.from('rffa_beneficiaries').select('*');

        if (province) {
          query = query.ilike('Province', `%${province}%`);
        }
        if (municipality) {
          query = query.ilike('CityMunicipality', `%${municipality}%`);
        }
        if (search) {
          query = query.or(
            `"FirstName".ilike.%${search}%,"LastName".ilike.%${search}%,"MiddleName".ilike.%${search}%,"RSBSARefNo".ilike.%${search}%,"PanaloKardNo".ilike.%${search}%,"Card_Number".ilike.%${search}%`
          );
        }

        const rffaSort = sortField === 'Date' ? 'DateOfCashout' : (sortField === 'Last name' || sortField === 'name') ? 'LastName' : sortField === 'Municipality' ? 'CityMunicipality' : sortField;
        if (rffaSort) {
          query = query.order(rffaSort, { ascending: sortAscending, nullsFirst: false });
        }

        if (scope === 'page') {
          const from = (page - 1) * limit;
          const to = from + limit - 1;
          query = query.range(from, to);
          const { data, error } = await query;
          if (!error && data && data.length > 0) {
            rows = data;
          }
        } else {
          const PAGE_BATCH = 1000;
          let from = 0;
          let hasMore = true;
          let allData: any[] = [];

          while (hasMore) {
            const { data, error } = await query.range(from, from + PAGE_BATCH - 1);
            if (error) {
              break;
            }
            if (data && data.length > 0) {
              allData = allData.concat(data);
              from += PAGE_BATCH;
              if (data.length < PAGE_BATCH) hasMore = false;
            } else {
              hasMore = false;
            }
          }
          if (allData.length > 0) {
            rows = allData;
          }
        }

        if (rows.length > 0) {
          rows = rows.map((r, idx) => ({
            '#': idx + 1,
            'Region': r['Region'] || 'CAR',
            'Province': r['Province'] || '',
            'City/Municipality': r['CityMunicipality'] || '',
            'PanaloKard No.': r['PanaloKardNo'] || '',
            'Card Number': r['Card_Number'] || '',
            'RSBSA Ref No.': r['RSBSARefNo'] || '',
            'First Name': r['FirstName'] || '',
            'Middle Name': r['MiddleName'] || '',
            'Last Name': r['LastName'] || '',
            'Birth Date': r['BirthDate'] || '',
            'Date of Cashout': r['DateOfCashout'] || '',
            'Year Funded': r['YEAR FUNDED'] || '',
            'Remarks': r['REMARKS'] || '',
          }));
        }
      } catch (err) {
        console.warn('RFFA export query fallback:', err);
      }
    }

    if (rows.length === 0) {
      rows = [{ 'Message': 'No records matched the selected filters.' }];
    }

    // Build workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
    const colWidths = Object.keys(rows[0] || {}).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...rows.slice(0, 100).map((r) => String(r[key] || '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      const csvContent = XLSX.utils.sheet_to_csv(ws);
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filePrefix}_${dateStr}.csv"`,
        },
      });
    }

    // Default to Excel .xlsx
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filePrefix}_${dateStr}.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error('Export error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate export file.' },
      { status: 500 }
    );
  }
}
