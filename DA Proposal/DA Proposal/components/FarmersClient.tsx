'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  FileCheck2,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Store,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { createClient } from '@/utils/supabase/client';

export interface FarmerTransaction {
  'Reference no.': string;
  PanalokardNumber?: number | string;
  'RSBSA RefNumber': string;
  'Merchant UUID'?: string;
  'Merchant Name'?: string;
  'First Name': string;
  'Last name': string;
  Municipality?: string;
  Province?: string;
  'Product Category'?: string;
  'Product Name'?: string;
  'Product Description'?: string;
  Qty?: number;
  Unit?: string;
  Amount?: number;
  'Total Amount'?: number;
  Region?: string;
  Date?: string;
}

export interface RffaBeneficiary {
  id?: string;
  Region?: string;
  Province?: string;
  CityMunicipality?: string;
  PanaloKardNo?: string;
  Card_Number?: string;
  RSBSARefNo?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  BirthDate?: string;
  DateOfCashout?: string;
  'YEAR FUNDED'?: string;
  REMARKS?: string;
  created_at?: string;
}

interface FarmersClientProps {
  initialRecords: FarmerTransaction[];
  initialCount: number;
  initialRffaRecords?: RffaBeneficiary[];
  initialRffaCount?: number;
  initialUserAccount?: any;
}

const PAGE_SIZE = 25;

export default function FarmersClient({
  initialRecords,
  initialCount,
  initialRffaRecords = [],
  initialRffaCount = 0,
  initialUserAccount = null,
}: FarmersClientProps) {
  // 3 buttons: IMC, INKIND, RFFA
  const [activeTab, setActiveTab] = useState<'IMC' | 'INKIND' | 'RFFA'>('IMC');

  const [records, setRecords] = useState<FarmerTransaction[]>(initialRecords);
  const [totalCount, setTotalCount] = useState<number>(initialCount);

  // RFFA Records state
  const [rffaRecords, setRffaRecords] = useState<RffaBeneficiary[]>(initialRffaRecords);
  const [rffaTotalCount, setRffaTotalCount] = useState<number>(initialRffaCount);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  // User account and permission state
  const [currentUserAccount, setCurrentUserAccount] = useState<any>(initialUserAccount || null);

  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const json = await res.json();
          if (json.authenticated && json.account) {
            setCurrentUserAccount(json.account);
          } else {
            setCurrentUserAccount(null);
          }
        }
      } catch (err) {
        console.error('Error fetching auth account in FarmersClient:', err);
      }
    };

    fetchAccountData();

    const handlePermUpdated = () => {
      fetchAccountData();
    };
    window.addEventListener('da_permissions_updated', handlePermUpdated);
    return () => {
      window.removeEventListener('da_permissions_updated', handlePermUpdated);
    };
  }, []);

  const isSuspended = currentUserAccount?.status === 'suspended';
  const isSuperAdmin =
    currentUserAccount?.role === 'super_admin' ||
    currentUserAccount?.email === 'super.admin@car.da.gov.ph';

  const allowedModules: string[] = isSuperAdmin
    ? ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance', 'mod-admin']
    : (currentUserAccount?.allowed_modules || ['mod-general']);

  const hasModuleAccess = isSuperAdmin || allowedModules.includes('mod-beneficiary');
  const hasImportPower = currentUserAccount?.permissions
    ? currentUserAccount.permissions.can_import_beneficiaries !== false
    : (['super_admin', 'admin', 'officer'].includes(currentUserAccount?.role || ''));

  const canImport = hasModuleAccess && !isSuspended && (isSuperAdmin || hasImportPower);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [sortField, setSortField] = useState<string>('Date');
  const [sortAscending, setSortAscending] = useState<boolean>(false);

  // Detail Modal state
  const [selectedItem, setSelectedItem] = useState<FarmerTransaction | null>(null);
  const [selectedRffaItem, setSelectedRffaItem] = useState<RffaBeneficiary | null>(null);

  // IMC Import Modal state
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<string>('');
  const [importPercent, setImportPercent] = useState<number>(0);
  const [importResult, setImportResult] = useState<{ success?: boolean; message?: string; count?: number } | null>(null);

  // RFFA Import Modal state
  const [isRffaImportOpen, setIsRffaImportOpen] = useState<boolean>(false);
  const [rffaImporting, setRffaImporting] = useState<boolean>(false);
  const [rffaImportProgress, setRffaImportProgress] = useState<string>('');
  const [rffaImportPercent, setRffaImportPercent] = useState<number>(0);
  const [rffaImportResult, setRffaImportResult] = useState<{ success?: boolean; message?: string; count?: number } | null>(null);

  // Export Modal state
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exportScope, setExportScope] = useState<'all' | 'page'>('all');
  const [exporting, setExporting] = useState<boolean>(false);

  const handleCsvImport = async (file: File) => {
    if (!canImport) {
      setImportResult({
        success: false,
        message: 'Access Denied: Your account does not have permission to import beneficiary records. This power has been restricted by the Super Admin.',
      });
      return;
    }

    setImporting(true);
    setImportProgress('Reading CSV file...');
    setImportPercent(0);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

      if (lines.length < 2) {
        throw new Error('CSV file must contain a header row and at least one data row.');
      }

      // Robust CSV row splitter accounting for quoted commas
      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let curr = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(curr.trim().replace(/^["']|["']$/g, ''));
            curr = '';
          } else {
            curr += char;
          }
        }
        result.push(curr.trim().replace(/^["']|["']$/g, ''));
        return result;
      };

      const headers = parseCsvLine(lines[0]).map((h) => h.trim());
      const parsedRows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
        const rowObj: Record<string, string> = {};
        headers.forEach((hdr, idx) => {
          rowObj[hdr] = values[idx] || '';
        });
        parsedRows.push(rowObj);
      }

      if (parsedRows.length === 0) {
        throw new Error('No valid record rows found in the CSV file.');
      }

      // Batch send to API in chunks of 500 rows to prevent HTTP body limit and JSON truncations
      const BATCH_SIZE = 500;
      const totalBatches = Math.ceil(parsedRows.length / BATCH_SIZE);
      let totalImported = 0;

      for (let b = 0; b < totalBatches; b++) {
        const startIdx = b * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, parsedRows.length);
        const chunk = parsedRows.slice(startIdx, endIdx);
        const pct = Math.round(((b + 1) / totalBatches) * 100);

        setImportPercent(pct);
        setImportProgress(`Batch ${b + 1}/${totalBatches} (${startIdx + 1}–${endIdx} of ${parsedRows.length.toLocaleString()})`);

        const res = await fetch('/api/beneficiaries/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: chunk }),
        });

        const textResponse = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(textResponse);
        } catch {
          throw new Error(`Server returned an invalid response on batch ${b + 1}.`);
        }

        if (!res.ok) {
          throw new Error(data.error || `Failed to import batch ${b + 1}.`);
        }

        totalImported += (data.importedCount ?? chunk.length);
      }

      setImportResult({
        success: true,
        message: `Successfully imported all ${totalImported.toLocaleString('en-PH')} beneficiary records into Supabase.`,
        count: totalImported,
      });

      // Refresh current page view
      fetchPage(1, activeSearch, selectedProvince, selectedMunicipality, sortField, sortAscending);
    } catch (err: any) {
      console.error('Import error:', err);
      setImportResult({
        success: false,
        message: err.message || 'An error occurred during import.',
      });
    } finally {
      setImporting(false);
      setImportProgress('');
    }
  };

  const handleRffaCsvImport = async (file: File) => {
    if (!canImport) {
      setRffaImportResult({
        success: false,
        message: 'Access Denied: Your account does not have permission to import beneficiary records. This power has been restricted by the Super Admin.',
      });
      return;
    }

    setRffaImporting(true);
    setRffaImportProgress('Reading CSV file...');
    setRffaImportPercent(0);
    setRffaImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

      if (lines.length < 2) {
        throw new Error('CSV file must contain a header row and at least one data row.');
      }

      // Robust CSV row splitter accounting for quoted commas
      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let curr = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(curr.trim().replace(/^["']|["']$/g, ''));
            curr = '';
          } else {
            curr += char;
          }
        }
        result.push(curr.trim().replace(/^["']|["']$/g, ''));
        return result;
      };

      const headers = parseCsvLine(lines[0]).map((h) => h.trim());
      const parsedRows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
        const rowObj: Record<string, string> = {};
        headers.forEach((hdr, idx) => {
          rowObj[hdr] = values[idx] || '';
        });
        parsedRows.push(rowObj);
      }

      if (parsedRows.length === 0) {
        throw new Error('No valid record rows found in the CSV file.');
      }

      // Batch send to API in chunks of 500 rows
      const BATCH_SIZE = 500;
      const totalBatches = Math.ceil(parsedRows.length / BATCH_SIZE);
      let totalImported = 0;

      for (let b = 0; b < totalBatches; b++) {
        const startIdx = b * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, parsedRows.length);
        const chunk = parsedRows.slice(startIdx, endIdx);
        const pct = Math.round(((b + 1) / totalBatches) * 100);

        setRffaImportPercent(pct);
        setRffaImportProgress(`Batch ${b + 1}/${totalBatches} (${startIdx + 1}–${endIdx} of ${parsedRows.length.toLocaleString()})`);

        const res = await fetch('/api/rffa/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: chunk }),
        });

        const textResponse = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(textResponse);
        } catch {
          throw new Error(`Server returned an invalid response on batch ${b + 1}.`);
        }

        if (!res.ok) {
          throw new Error(data.error || `Failed to import batch ${b + 1}.`);
        }

        totalImported += (data.importedCount ?? chunk.length);
      }

      setRffaImportResult({
        success: true,
        message: `Successfully imported all ${totalImported.toLocaleString('en-PH')} RFFA beneficiary records into Supabase.`,
        count: totalImported,
      });

      // Refresh current RFFA page view
      fetchPage(1, activeSearch, selectedProvince, selectedMunicipality, sortField, sortAscending, 'RFFA');
    } catch (err: any) {
      console.error('RFFA import error:', err);
      setRffaImportResult({
        success: false,
        message: err.message || 'An error occurred during RFFA import.',
      });
    } finally {
      setRffaImporting(false);
      setRffaImportProgress('');
    }
  };

  const executeExport = async () => {
    try {
      setExporting(true);

      if (exportScope === 'page') {
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `DA-CAR_${activeTab}_Beneficiaries_Page${currentPage}_${dateStr}`;

        let exportRows: any[] = [];
        if (activeTab === 'IMC') {
          exportRows = records.map((r, i) => ({
            '#': (currentPage - 1) * PAGE_SIZE + i + 1,
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
        } else if (activeTab === 'RFFA') {
          exportRows = rffaRecords.map((r, i) => ({
            '#': (currentPage - 1) * PAGE_SIZE + i + 1,
            'Region': r.Region || 'CAR',
            'Province': r.Province || '',
            'City/Municipality': r.CityMunicipality || '',
            'PanaloKard No.': r.PanaloKardNo || '',
            'Card Number': r.Card_Number || '',
            'RSBSA Ref No.': r.RSBSARefNo || '',
            'First Name': r.FirstName || '',
            'Middle Name': r.MiddleName || '',
            'Last Name': r.LastName || '',
            'Birth Date': r.BirthDate || '',
            'Date of Cashout': r.DateOfCashout || '',
            'Year Funded': r['YEAR FUNDED'] || '',
            'Remarks': r.REMARKS || '',
          }));
        } else if (activeTab === 'INKIND') {
          exportRows = [
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
          exportRows = [
            {
              '#': 1,
              'Disbursement Date': '2026-09-22',
              'Voucher No.': 'RFFA-2026-00912',
              'Beneficiary Name': 'Santiago Alvarez',
              'RSBSA No.': '14-01-08-004-000210',
              'Municipality': 'Tayum',
              'Province': 'Abra',
              'Disbursement Channel': 'DBP Digital Cash Card',
              'Grant Amount (₱)': 5000,
              'Status': 'Credited / Claimed',
            }
          ];
        }

        if (exportRows.length === 0) {
          exportRows = [{ 'Message': 'No records currently on this page.' }];
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportRows);

        // Auto-fit column widths
        const colWidths = Object.keys(exportRows[0] || {}).map((key) => {
          const maxLen = Math.max(
            key.length,
            ...exportRows.slice(0, 100).map((r) => String(r[key] || '').length)
          );
          return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
        });
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, `${activeTab} Records`.substring(0, 31));

        if (exportFormat === 'csv') {
          XLSX.writeFile(wb, `${filename}.csv`, { bookType: 'csv' });
        } else {
          XLSX.writeFile(wb, `${filename}.xlsx`, { bookType: 'xlsx' });
        }
      } else {
        // Full dataset download via backend route
        const params = new URLSearchParams({
          tab: activeTab,
          format: exportFormat,
          scope: 'all',
          search: activeSearch,
          province: selectedProvince,
          municipality: selectedMunicipality,
          sortField: sortField,
          sortAsc: String(sortAscending),
        });

        const url = `/api/beneficiaries/export?${params.toString()}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setTimeout(() => {
        setExporting(false);
        setIsExportOpen(false);
      }, 700);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Failed to export records: ' + (err.message || 'Unknown error'));
      setExporting(false);
    }
  };

  // Fetch data function
  const fetchPage = async (
    page: number,
    search: string,
    prov: string,
    muni: string,
    sort: string,
    asc: boolean,
    tab: 'IMC' | 'INKIND' | 'RFFA' = activeTab
  ) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      if (tab === 'RFFA') {
        let query = supabase
          .from('rffa_beneficiaries')
          .select('*', { count: 'exact' });

        if (prov) {
          query = query.ilike('Province', `%${prov}%`);
        }
        if (muni) {
          query = query.ilike('CityMunicipality', `%${muni}%`);
        }
        if (search.trim()) {
          const s = search.trim();
          query = query.or(
            `"FirstName".ilike.%${s}%,"LastName".ilike.%${s}%,"MiddleName".ilike.%${s}%,"RSBSARefNo".ilike.%${s}%,"PanaloKardNo".ilike.%${s}%,"Card_Number".ilike.%${s}%`
          );
        }

        const sortColumn =
          sort === 'Date'
            ? 'DateOfCashout'
            : sort === 'name' || sort === 'Last name'
            ? 'LastName'
            : sort === 'Municipality'
            ? 'CityMunicipality'
            : sort;

        query = query.order(sortColumn, { ascending: asc, nullsFirst: false }).range(from, to);

        const { data, count, error } = await query;

        if (!error && data) {
          setRffaRecords(data as RffaBeneficiary[]);
          if (count !== null) setRffaTotalCount(count);
        } else if (error) {
          console.warn('rffa_beneficiaries query note:', error.message);
        }
      } else if (tab === 'IMC') {
        let query = supabase
          .from('farmer_serve_transactions')
          .select('*', { count: 'exact' });

        if (prov) {
          query = query.eq('Province', prov);
        }
        if (muni) {
          query = query.eq('Municipality', muni);
        }
        if (search.trim()) {
          const s = search.trim();
          query = query.or(
            `"First Name".ilike.%${s}%,"Last name".ilike.%${s}%,"RSBSA RefNumber".ilike.%${s}%,"Reference no.".ilike.%${s}%,"Merchant Name".ilike.%${s}%`
          );
        }

        // Column name mapping for sorting
        const sortColumn = sort === 'name' ? 'Last name' : sort;
        query = query.order(sortColumn, { ascending: asc, nullsFirst: false }).range(from, to);

        const { data, count, error } = await query;

        if (!error && data) {
          setRecords(data as FarmerTransaction[]);
          if (count !== null) setTotalCount(count);
        } else if (error) {
          console.error('Error fetching farmer transactions:', error.message);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (newTab: 'IMC' | 'INKIND' | 'RFFA') => {
    setActiveTab(newTab);
    setCurrentPage(1);
    fetchPage(1, activeSearch, selectedProvince, selectedMunicipality, sortField, sortAscending, newTab);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchTerm);
    setCurrentPage(1);
    fetchPage(1, searchTerm, selectedProvince, selectedMunicipality, sortField, sortAscending);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setActiveSearch('');
    setSelectedProvince('');
    setSelectedMunicipality('');
    setCurrentPage(1);
    fetchPage(1, '', '', '', sortField, sortAscending);
  };

  const handleSortChange = (field: string) => {
    const newAsc = sortField === field ? !sortAscending : false;
    setSortField(field);
    setSortAscending(newAsc);
    setCurrentPage(1);
    fetchPage(1, activeSearch, selectedProvince, selectedMunicipality, field, newAsc);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rffaTotalPages = Math.max(1, Math.ceil(rffaTotalCount / PAGE_SIZE));
  const activeTotalPages = activeTab === 'RFFA' ? rffaTotalPages : totalPages;
  const activeTotalCount = activeTab === 'RFFA' ? rffaTotalCount : totalCount;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > activeTotalPages) return;
    setCurrentPage(newPage);
    fetchPage(newPage, activeSearch, selectedProvince, selectedMunicipality, sortField, sortAscending);
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  const formatCurrency = (val: number | string | undefined) => {
    if (val === undefined || val === null) return '—';
    return '₱' + Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <>
      {/* Top Statistics Bar */}
      <div className="summary-grid">
        <article className="summary-card">
          <div className="summary-top">
            <span>{activeTab === 'RFFA' ? 'Total RFFA Beneficiaries' : 'Total Beneficiary Transactions'}</span>
            <Users className="summary-icon" size={20} />
          </div>
          <div className="summary-value">{activeTotalCount.toLocaleString('en-PH')}</div>
          <span className="allocation-card-note">
            {activeTab === 'RFFA' ? 'Live RFFA payroll records' : 'Live served farmer records'}
          </span>
        </article>
        <article className="summary-card">
          <div className="summary-top">
            <span>Current Page</span>
            <FileCheck2 className="summary-icon" size={20} />
          </div>
          <div className="summary-value">
            {currentPage} / {activeTotalPages.toLocaleString('en-PH')}
          </div>
          <span className="allocation-card-note">{PAGE_SIZE} rows per view</span>
        </article>
        <article className="summary-card">
          <div className="summary-top">
            <span>Active Province</span>
            <MapPin className="summary-icon" size={20} />
          </div>
          <div className="summary-value">{selectedProvince || 'All Provinces'}</div>
          <span className="allocation-card-note">Cordillera Region</span>
        </article>
        <article className="summary-card">
          <div className="summary-top">
            <span>Active Search</span>
            <Search className="summary-icon" size={20} />
          </div>
          <div className="summary-value" style={{ fontSize: 16, textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {activeSearch ? `"${activeSearch}"` : 'All Beneficiaries'}
          </div>
          <span className="allocation-card-note">{activeSearch ? 'Filtered results' : 'No active query'}</span>
        </article>
      </div>

      {/* Search and Filters Toolbar */}
      <section className="surface" style={{ marginTop: 24, padding: '16px 20px' }}>
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div className="field record-search-field" style={{ flex: '1 1 320px', minWidth: 260 }}>
            <label htmlFor="farmer-search">Search Beneficiaries</label>
            <input
              className="input"
              id="farmer-search"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === 'RFFA'
                  ? 'Search by Farmer Name, RSBSA Ref No., PanaloKard, or Card Number...'
                  : 'Search by Farmer Name, RSBSA Ref No., Reference No., or Merchant...'
              }
            />
          </div>

          <div className="field" style={{ flex: '0 1 180px', minWidth: 150 }}>
            <label htmlFor="filter-province">Province</label>
            <select
              className="select"
              id="filter-province"
              value={selectedProvince}
              onChange={(e) => {
                setSelectedProvince(e.target.value);
                setCurrentPage(1);
                fetchPage(1, activeSearch, e.target.value, selectedMunicipality, sortField, sortAscending);
              }}
            >
              <option value="">All Provinces</option>
              <option value="ABRA">ABRA</option>
              <option value="APAYAO">APAYAO</option>
              <option value="BENGUET">BENGUET</option>
              <option value="IFUGAO">IFUGAO</option>
              <option value="KALINGA">KALINGA</option>
              <option value="MOUNTAIN PROVINCE">MOUNTAIN PROVINCE</option>
            </select>
          </div>

          <div className="field" style={{ flex: '0 1 170px', minWidth: 140 }}>
            <label htmlFor="filter-sort">Sort By</label>
            <select
              className="select"
              id="filter-sort"
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value);
                setCurrentPage(1);
                fetchPage(1, activeSearch, selectedProvince, selectedMunicipality, e.target.value, sortAscending);
              }}
            >
              <option value="Date">Date</option>
              <option value="Last name">Farmer Name</option>
              <option value="Municipality">Municipality</option>
              <option value="Total Amount">Total Amount</option>
              <option value="Qty">Quantity</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 1 }}>
            <button className="button button-primary" type="submit" disabled={loading} style={{ minHeight: 38, padding: '0 16px' }}>
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />} Search
            </button>
            {(activeSearch || selectedProvince || selectedMunicipality) && (
              <button className="button button-outline" type="button" onClick={handleClearFilters} style={{ minHeight: 38, padding: '0 12px' }}>
                Clear
              </button>
            )}
          </div>
        </form>
      </section>

      {/* 3 Sub-Directory Buttons: IMC, INKIND, RFFA */}
      <section className="surface" style={{ marginTop: 24, padding: '16px 20px', background: '#fcfdfa', borderBottom: '2px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <span className="section-kicker" style={{ color: 'var(--green-700)' }}>
              Beneficiary Program Sub-Directory
            </span>
            <h3 style={{ margin: '3px 0 0', fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--green-950)' }}>
              {activeTab === 'IMC' && 'Intervention Monitoring Card (IMC) / Vouchers Table'}
              {activeTab === 'INKIND' && 'In-Kind Seed & Input Distribution Table'}
              {activeTab === 'RFFA' && 'Rice Farmers Financial Assistance (RFFA) Table'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              {activeTab === 'IMC' && 'Showing electronic fertilizer and seed discount voucher redemption records.'}
              {activeTab === 'INKIND' && 'Showing direct certified seeds, bio-fertilizers, and mechanization distributions.'}
              {activeTab === 'RFFA' && 'Showing direct cash assistance and subsidy transfers for registered rice farmers.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className={`button ${activeTab === 'IMC' ? 'button-primary' : 'button-outline'}`}
              style={{ fontWeight: 700, padding: '0 20px', minHeight: 40 }}
              onClick={() => handleTabChange('IMC')}
            >
              IMC
            </button>
            <button
              type="button"
              className={`button ${activeTab === 'INKIND' ? 'button-primary' : 'button-outline'}`}
              style={{ fontWeight: 700, padding: '0 20px', minHeight: 40 }}
              onClick={() => handleTabChange('INKIND')}
            >
              INKIND
            </button>
            <button
              type="button"
              className={`button ${activeTab === 'RFFA' ? 'button-primary' : 'button-outline'}`}
              style={{ fontWeight: 700, padding: '0 20px', minHeight: 40 }}
              onClick={() => handleTabChange('RFFA')}
            >
              RFFA
            </button>
          </div>
        </div>
      </section>

      {/* Dynamic Table for IMC */}
      {activeTab === 'IMC' && (
        <section className="surface" style={{ marginTop: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>IMC Voucher Redemption Table</strong>
              <span>
                {loading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Loader2 className="animate-spin" size={12} /> Loading data from Supabase...
                  </span>
                ) : (
                  `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, totalCount).toLocaleString('en-PH')} of ${totalCount.toLocaleString('en-PH')} records`
                )}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="button button-outline"
                style={{ padding: '0 14px', minHeight: 34, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => setIsExportOpen(true)}
              >
                <Download size={14} />
                <span>Export</span>
              </button>
              {canImport ? (
                <button
                  type="button"
                  className="button button-primary"
                  style={{ padding: '0 14px', minHeight: 34, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => {
                    setImportResult(null);
                    setIsImportOpen(true);
                  }}
                >
                  <Upload size={14} />
                  <span>Import IMC Beneficiaries</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="button button-outline"
                  disabled
                  style={{
                    padding: '0 14px',
                    minHeight: 34,
                    fontSize: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    opacity: 0.65,
                    cursor: 'not-allowed',
                    color: '#991b1b',
                    borderColor: '#fecaca',
                    background: '#fef2f2',
                  }}
                  title="Importing beneficiary records has been restricted for your account by the Super Admin"
                >
                  <Lock size={13} style={{ color: '#dc2626' }} />
                  <span>Import Restricted</span>
                </button>
              )}
              <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 9px', borderRadius: 3, background: '#eef4ec', color: 'var(--green-900)' }}>
                IMC PROGRAM
              </span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table" aria-label="IMC Beneficiary Records">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference No.</th>
                  <th>
                    <button className="sort-button" type="button" onClick={() => handleSortChange('Last name')}>
                      Farmer Name {sortField === 'Last name' ? (sortAscending ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                    </button>
                  </th>
                  <th>RSBSA Ref No.</th>
                  <th>
                    <button className="sort-button" type="button" onClick={() => handleSortChange('Municipality')}>
                      Municipality {sortField === 'Municipality' ? (sortAscending ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                    </button>
                  </th>
                  <th>Voucher Product Description</th>
                  <th className="numeric">Qty & Unit</th>
                  <th className="numeric">
                    <button className="sort-button" type="button" onClick={() => handleSortChange('Total Amount')}>
                      Claimed Amount {sortField === 'Total Amount' ? (sortAscending ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                    </button>
                  </th>
                  <th>Accredited Merchant</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="empty-state" style={{ minHeight: 180 }}>
                        <span className="empty-icon">
                          <Eye size={20} />
                        </span>
                        <h3>No IMC voucher transactions found.</h3>
                        <p>Try clearing your search or filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((item, idx) => {
                    const farmerName = `${item['First Name'] || ''} ${item['Last name'] || ''}`.trim() || '—';
                    const product = item['Product Description'] || item['Product Name'] || '—';
                    const qtyUnit = item.Qty !== undefined ? `${item.Qty} ${item.Unit || ''}` : '—';
                    return (
                      <tr key={item['Reference no.'] || idx}>
                        <td style={{ whiteSpace: 'nowrap' }}>{item.Date || '—'}</td>
                        <td>
                          <strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{item['Reference no.']}</strong>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--green-950)' }}>{farmerName}</strong>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>
                          {item['RSBSA RefNumber'] || '—'}
                        </td>
                        <td>
                          {item.Municipality || '—'}, {item.Province || ''}
                        </td>
                        <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={product}>
                          {product}
                        </td>
                        <td className="numeric">{qtyUnit}</td>
                        <td className="numeric">
                          <strong>{formatCurrency(item['Total Amount'] ?? item.Amount)}</strong>
                        </td>
                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item['Merchant Name']}>
                          {item['Merchant Name'] || '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="table-action"
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            style={{ cursor: 'pointer' }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, totalCount).toLocaleString('en-PH')} of {totalCount.toLocaleString('en-PH')} records
            </span>
            <div className="pagination">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => handlePageChange(currentPage - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={15} />
              </button>
              <span style={{ padding: '0 8px', fontSize: 12 }}>
                Page {currentPage} of {totalPages.toLocaleString('en-PH')}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages || loading}
                onClick={() => handlePageChange(currentPage + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Dynamic Table for INKIND */}
      {activeTab === 'INKIND' && (
        <section className="surface" style={{ marginTop: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>In-Kind Distribution Records Table</strong>
              <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--muted)' }}>
                Direct physical agricultural seed and equipment distribution records
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="button button-outline"
                style={{ padding: '0 14px', minHeight: 34, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => setIsExportOpen(true)}
              >
                <Download size={14} />
                <span>Export</span>
              </button>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 3, background: '#fef3c7', color: '#92400e' }}>
                INKIND PROGRAM
              </span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table" aria-label="In-Kind Beneficiary Records">
              <thead>
                <tr>
                  <th>Distribution Date</th>
                  <th>Batch / Release No.</th>
                  <th>Recipient Farmer</th>
                  <th>RSBSA No.</th>
                  <th>Province & Municipality</th>
                  <th>Input Category</th>
                  <th className="numeric">Allocated Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state" style={{ minHeight: 180 }}>
                      <span className="empty-icon">
                        <Package size={20} />
                      </span>
                      <h3>No In-Kind distribution records in this view yet.</h3>
                      <p>In-kind certified seed deliveries, biofertilizers, and machinery handovers will populate once linked to the database table.</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Dynamic Table for RFFA */}
      {activeTab === 'RFFA' && (
        <section className="surface" style={{ marginTop: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <strong>Rice Farmers Financial Assistance (RFFA) Table</strong>
              <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--muted)' }}>
                {loading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Loader2 className="animate-spin" size={12} /> Loading data from Supabase...
                  </span>
                ) : (
                  `Showing ${(currentPage - 1) * PAGE_SIZE + (rffaRecords.length > 0 ? 1 : 0)}–${Math.min(currentPage * PAGE_SIZE, rffaTotalCount).toLocaleString('en-PH')} of ${rffaTotalCount.toLocaleString('en-PH')} records`
                )}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="button button-outline"
                style={{ padding: '0 14px', minHeight: 34, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => setIsExportOpen(true)}
              >
                <Download size={14} />
                <span>Export</span>
              </button>
              {canImport ? (
                <button
                  type="button"
                  className="button button-primary"
                  style={{ padding: '0 14px', minHeight: 34, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => {
                    setRffaImportResult(null);
                    setIsRffaImportOpen(true);
                  }}
                >
                  <Upload size={14} />
                  <span>Import RFFA Beneficiaries</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="button button-outline"
                  disabled
                  style={{
                    padding: '0 14px',
                    minHeight: 34,
                    fontSize: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    opacity: 0.65,
                    cursor: 'not-allowed',
                    color: '#991b1b',
                    borderColor: '#fecaca',
                    background: '#fef2f2',
                  }}
                  title="Importing beneficiary records has been restricted for your account by the Super Admin"
                >
                  <Lock size={13} style={{ color: '#dc2626' }} />
                  <span>Import Restricted</span>
                </button>
              )}
              <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 9px', borderRadius: 3, background: '#e0f2fe', color: '#0369a1' }}>
                RFFA PROGRAM
              </span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table" aria-label="RFFA Financial Assistance Records">
              <thead>
                <tr>
                  <th>Date of Cashout</th>
                  <th>RSBSA Ref No.</th>
                  <th>
                    <button className="sort-button" type="button" onClick={() => handleSortChange('Last name')}>
                      Beneficiary Name {sortField === 'Last name' ? (sortAscending ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                    </button>
                  </th>
                  <th>
                    <button className="sort-button" type="button" onClick={() => handleSortChange('Municipality')}>
                      City / Municipality {sortField === 'Municipality' ? (sortAscending ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                    </button>
                  </th>
                  <th>PanaloKard No.</th>
                  <th>Card Number</th>
                  <th>Birth Date</th>
                  <th>Year Funded</th>
                  <th>Remarks</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rffaRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="empty-state" style={{ minHeight: 200, padding: '32px 20px', textAlign: 'center' }}>
                        <span className="empty-icon" style={{ margin: '0 auto 12px' }}>
                          <DollarSign size={24} />
                        </span>
                        <h3 style={{ fontSize: 16, marginBottom: 6 }}>No RFFA beneficiary records found</h3>
                        <p style={{ maxWidth: 480, margin: '0 auto 16px', fontSize: 13, color: 'var(--muted)' }}>
                          Click &quot;Import RFFA Beneficiaries&quot; above to upload your CSV file containing cash subsidy and financial aid payroll disbursements.
                        </p>
                        <button
                          type="button"
                          className="button button-primary"
                          style={{ padding: '0 18px', minHeight: 36, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          onClick={() => {
                            setRffaImportResult(null);
                            setIsRffaImportOpen(true);
                          }}
                        >
                          <Upload size={14} />
                          <span>Import RFFA Beneficiaries</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rffaRecords.map((item, idx) => {
                    const fullName = [item.LastName, item.FirstName, item.MiddleName].filter(Boolean).join(', ') || '—';
                    return (
                      <tr key={item.id || item.RSBSARefNo || idx}>
                        <td style={{ whiteSpace: 'nowrap' }}>{item.DateOfCashout || '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>
                          {item.RSBSARefNo || '—'}
                        </td>
                        <td>
                          <strong style={{ color: 'var(--green-950)' }}>{fullName}</strong>
                        </td>
                        <td>
                          {item.CityMunicipality || '—'}, {item.Province || ''}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {item.PanaloKardNo || '—'}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {item.Card_Number || '—'}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                          {item.BirthDate || '—'}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, padding: '2px 7px', borderRadius: 3, background: '#f0fdf4', color: '#166534', fontSize: 11 }}>
                            {item['YEAR FUNDED'] || '—'}
                          </span>
                        </td>
                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.REMARKS}>
                          {item.REMARKS || '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="table-action"
                            type="button"
                            onClick={() => setSelectedRffaItem(item)}
                            style={{ cursor: 'pointer' }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + (rffaRecords.length > 0 ? 1 : 0)}–${Math.min(currentPage * PAGE_SIZE, rffaTotalCount).toLocaleString('en-PH')} of ${rffaTotalCount.toLocaleString('en-PH')} records
            </span>
            <div className="pagination">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => handlePageChange(currentPage - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={15} />
              </button>
              <span style={{ padding: '0 8px', fontSize: 12 }}>
                Page {currentPage} of {rffaTotalPages.toLocaleString('en-PH')}
              </span>
              <button
                type="button"
                disabled={currentPage >= rffaTotalPages || loading}
                onClick={() => handlePageChange(currentPage + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Transaction Details Modal */}
      {selectedItem && (
        <div className="detail-backdrop" onClick={() => setSelectedItem(null)}>
          <section
            className="detail-dialog"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 640 }}
          >
            <div className="dialog-head">
              <div>
                <span className="section-kicker">Beneficiary Record Details</span>
                <h2>{selectedItem['Reference no.']}</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="detail-body">
              <div className="detail-grid">
                <div className="detail-field">
                  <span>Farmer Full Name</span>
                  <strong>{`${selectedItem['First Name'] || ''} ${selectedItem['Last name'] || ''}`.trim()}</strong>
                </div>
                <div className="detail-field">
                  <span>RSBSA Reference No.</span>
                  <strong style={{ fontFamily: 'monospace' }}>{selectedItem['RSBSA RefNumber']}</strong>
                </div>
                <div className="detail-field">
                  <span>Panalokard Number</span>
                  <strong>{selectedItem.PanalokardNumber || '—'}</strong>
                </div>
                <div className="detail-field">
                  <span>Transaction Date</span>
                  <strong>{selectedItem.Date || '—'}</strong>
                </div>
                <div className="detail-field">
                  <span>Municipality</span>
                  <strong>{selectedItem.Municipality || '—'}</strong>
                </div>
                <div className="detail-field">
                  <span>Province & Region</span>
                  <strong>{selectedItem.Province || '—'} ({selectedItem.Region || 'CAR'})</strong>
                </div>
                <div className="detail-field">
                  <span>Product Category</span>
                  <strong>{selectedItem['Product Category'] || '—'}</strong>
                </div>
                <div className="detail-field">
                  <span>Product Code / Name</span>
                  <strong>{selectedItem['Product Name'] || '—'}</strong>
                </div>
                <div className="detail-field" style={{ gridColumn: 'span 2' }}>
                  <span>Product Description</span>
                  <strong>{selectedItem['Product Description'] || '—'}</strong>
                </div>
                <div className="detail-field">
                  <span>Quantity & Unit</span>
                  <strong>{selectedItem.Qty} {selectedItem.Unit}</strong>
                </div>
                <div className="detail-field">
                  <span>Unit Amount</span>
                  <strong>{formatCurrency(selectedItem.Amount)}</strong>
                </div>
                <div className="detail-field">
                  <span>Total Transaction Amount</span>
                  <strong style={{ color: 'var(--green-700)', fontSize: 16 }}>
                    {formatCurrency(selectedItem['Total Amount'] ?? selectedItem.Amount)}
                  </strong>
                </div>
                <div className="detail-field">
                  <span>Merchant UUID</span>
                  <strong style={{ fontFamily: 'monospace' }}>{selectedItem['Merchant UUID'] || '—'}</strong>
                </div>
                <div className="detail-field" style={{ gridColumn: 'span 2' }}>
                  <span>Merchant Name</span>
                  <strong>{selectedItem['Merchant Name'] || '—'}</strong>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* CSV Import Modal for IMC Beneficiaries */}
      {isImportOpen && (
        <div className="detail-backdrop" onClick={() => !importing && setIsImportOpen(false)}>
          <section
            className="detail-dialog"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 580 }}
          >
            <div className="dialog-head">
              <div>
                <span className="section-kicker">Data Import Suite</span>
                <h2>Import IMC Beneficiaries (CSV)</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => !importing && setIsImportOpen(false)}
                aria-label="Close import dialog"
                disabled={importing}
              >
                <X size={18} />
              </button>
            </div>

            <div className="detail-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                Upload your CSV file containing IMC farmer service and voucher redemption records. Columns will automatically be mapped and stored into Supabase.
              </p>

              {/* Supported Columns Guide */}
              <div style={{ background: '#f5f8f4', border: '1px solid #dbe6da', borderRadius: 4, padding: '12px 14px', marginBottom: 18, fontSize: 11.5 }}>
                <strong style={{ color: 'var(--green-950)', display: 'block', marginBottom: 6 }}>
                  Expected Column Headers:
                </strong>
                <code style={{ fontSize: 11, color: '#2a5a3a', wordBreak: 'break-all', display: 'block', lineHeight: 1.5 }}>
                  Reference no., PanalokardNumber, RSBSA RefNumber, Merchant UUID, Merchant Name, First Name, Last name, Municipality, Province, Product Category, Product Name, Product Description, Qty, Unit, Amount, Total Amount, Region, Date
                </code>
              </div>

              {/* Drop / Upload Zone */}
              <div
                style={{
                  border: '2px dashed #b9cbb9',
                  borderRadius: 6,
                  padding: '28px 20px',
                  textAlign: 'center',
                  background: '#fafcfa',
                  cursor: importing ? 'not-allowed' : 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onClick={() => {
                  if (!importing) {
                    const el = document.getElementById('imc-file-input') as HTMLInputElement;
                    el?.click();
                  }
                }}
              >
                <FileSpreadsheet size={36} style={{ color: 'var(--green-800)', margin: '0 auto 10px' }} />
                <strong style={{ display: 'block', fontSize: 14, color: 'var(--green-950)', marginBottom: 4 }}>
                  Click to select CSV file
                </strong>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Supports CSV files exported from Excel or official DA registers
                </span>
                <input
                  id="imc-file-input"
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleCsvImport(file);
                      e.target.value = '';
                    }
                  }}
                  disabled={importing}
                />
              </div>

              {/* Loading indicator with progress bar */}
              {importing && (
                <div style={{ marginTop: 18, background: '#f5f9f4', padding: '12px 14px', borderRadius: 6, border: '1px solid #d6e8d4' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, fontSize: 12.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green-950)', fontWeight: 600 }}>
                      <Loader2 className="animate-spin" size={15} style={{ color: 'var(--green-800)' }} />
                      <span>{importPercent < 100 ? 'Importing records...' : 'Finalizing import...'}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--green-900)' }}>{importPercent}%</span>
                  </div>
                  <div style={{ width: '100%', height: 7, background: '#e2ede0', borderRadius: 99, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(5, importPercent)}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #1b4d36, #2d7a54)',
                        transition: 'width 0.25s ease-out',
                        borderRadius: 99,
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>
                    {importProgress}
                  </div>
                </div>
              )}

              {/* Import Result Notification */}
              {importResult && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '12px 14px',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    background: importResult.success ? '#eef7ed' : '#fdf2f2',
                    border: `1px solid ${importResult.success ? '#cce4c8' : '#f8d2d2'}`,
                    color: importResult.success ? '#1b4d36' : '#991b1b',
                    fontSize: 12.5,
                  }}
                >
                  {importResult.success ? (
                    <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  ) : (
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  )}
                  <div>
                    <strong>{importResult.success ? 'Import Completed' : 'Import Error'}</strong>
                    <div style={{ marginTop: 2 }}>{importResult.message}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="button button-outline"
                onClick={() => !importing && setIsImportOpen(false)}
                disabled={importing}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* RFFA Record Details Modal */}
      {selectedRffaItem && (
        <div className="detail-backdrop" onClick={() => setSelectedRffaItem(null)}>
          <section
            className="detail-dialog"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 640 }}
          >
            <div className="dialog-head">
              <div>
                <span className="section-kicker">RFFA Beneficiary Payroll Details</span>
                <h2>{selectedRffaItem.RSBSARefNo || 'RFFA Record'}</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setSelectedRffaItem(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="detail-body">
              <div className="detail-grid">
                <div className="detail-field">
                  <span>Full Beneficiary Name</span>
                  <strong>
                    {[selectedRffaItem.LastName, selectedRffaItem.FirstName, selectedRffaItem.MiddleName]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </strong>
                </div>
                <div className="detail-field">
                  <span>RSBSA Reference No.</span>
                  <strong style={{ fontFamily: 'monospace' }}>{selectedRffaItem.RSBSARefNo || '—'}</strong>
                </div>
                <div className="detail-field">
                  <span>PanaloKard Number</span>
                  <strong>{selectedRffaItem.PanaloKardNo || '—'}</strong>
                </div>
                <div className="detail-field">
                  <span>Card Number</span>
                  <strong style={{ fontFamily: 'monospace' }}>{selectedRffaItem.Card_Number || '—'}</strong>
                </div>
                <div className="detail-field">
                  <span>Date of Cashout</span>
                  <strong>{selectedRffaItem.DateOfCashout || '—'}</strong>
                </div>
                <div className="detail-field">
                  <span>Birth Date</span>
                  <strong>{selectedRffaItem.BirthDate || '—'}</strong>
                </div>
                <div className="detail-field">
                  <span>City / Municipality</span>
                  <strong>{selectedRffaItem.CityMunicipality || '—'}</strong>
                </div>
                <div className="detail-field">
                  <span>Province & Region</span>
                  <strong>{selectedRffaItem.Province || '—'} ({selectedRffaItem.Region || 'CAR'})</strong>
                </div>
                <div className="detail-field">
                  <span>Year Funded</span>
                  <strong style={{ color: 'var(--green-700)' }}>{selectedRffaItem['YEAR FUNDED'] || '—'}</strong>
                </div>
                <div className="detail-field">
                  <span>Program</span>
                  <strong>Rice Farmers Financial Assistance (RFFA)</strong>
                </div>
                <div className="detail-field" style={{ gridColumn: 'span 2' }}>
                  <span>Remarks</span>
                  <strong>{selectedRffaItem.REMARKS || '—'}</strong>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* CSV Import Modal for RFFA Beneficiaries */}
      {isRffaImportOpen && (
        <div className="detail-backdrop" onClick={() => !rffaImporting && setIsRffaImportOpen(false)}>
          <section
            className="detail-dialog"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 620 }}
          >
            <div className="dialog-head">
              <div>
                <span className="section-kicker">Data Import Suite</span>
                <h2>Import RFFA Beneficiaries (CSV)</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => !rffaImporting && setIsRffaImportOpen(false)}
                aria-label="Close import dialog"
                disabled={rffaImporting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="detail-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                Upload your CSV file containing Rice Farmers Financial Assistance (RFFA) payroll and disbursement records. Columns will automatically be mapped and stored into Supabase.
              </p>

              {/* Supported Columns Guide matching the official template */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 4, padding: '12px 14px', marginBottom: 18, fontSize: 11.5 }}>
                <strong style={{ color: '#0369a1', display: 'block', marginBottom: 6 }}>
                  Expected Column Headers (from official RFFA file):
                </strong>
                <code style={{ fontSize: 11, color: '#075985', wordBreak: 'break-all', display: 'block', lineHeight: 1.5 }}>
                  Region, Province, CityMunicipality, PanaloKardNo, Card_Number, RSBSARefNo, FirstName, MiddleName, LastName, BirthDate, DateOfCashout, YEAR FUNDED, REMARKS
                </code>
              </div>

              {/* Drop / Upload Zone */}
              <div
                style={{
                  border: '2px dashed #93c5fd',
                  borderRadius: 6,
                  padding: '28px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: rffaImporting ? 'not-allowed' : 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onClick={() => {
                  if (!rffaImporting) {
                    const el = document.getElementById('rffa-file-input') as HTMLInputElement;
                    el?.click();
                  }
                }}
              >
                <FileSpreadsheet size={36} style={{ color: '#0284c7', margin: '0 auto 10px' }} />
                <strong style={{ display: 'block', fontSize: 14, color: '#0f172a', marginBottom: 4 }}>
                  Click to select RFFA CSV file
                </strong>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Supports CSV files exported from Excel or official DA RFFA payroll registers
                </span>
                <input
                  id="rffa-file-input"
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleRffaCsvImport(file);
                      e.target.value = '';
                    }
                  }}
                  disabled={rffaImporting}
                />
              </div>

              {/* Loading indicator with progress bar */}
              {rffaImporting && (
                <div style={{ marginTop: 18, background: '#f0f9ff', padding: '12px 14px', borderRadius: 6, border: '1px solid #bae6fd' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, fontSize: 12.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0369a1', fontWeight: 600 }}>
                      <Loader2 className="animate-spin" size={15} style={{ color: '#0284c7' }} />
                      <span>{rffaImportPercent < 100 ? 'Importing RFFA records...' : 'Finalizing import...'}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#0369a1' }}>{rffaImportPercent}%</span>
                  </div>
                  <div style={{ width: '100%', height: 7, background: '#e0f2fe', borderRadius: 99, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(5, rffaImportPercent)}%`,
                        height: '100%',
                        background: '#0284c7',
                        transition: 'width 0.25s ease-out',
                        borderRadius: 99,
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: '#0369a1', textAlign: 'right' }}>
                    {rffaImportProgress}
                  </div>
                </div>
              )}

              {/* Import Result Notification */}
              {rffaImportResult && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '12px 14px',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    background: rffaImportResult.success ? '#eef7ed' : '#fdf2f2',
                    border: `1px solid ${rffaImportResult.success ? '#cce4c8' : '#f8d2d2'}`,
                    color: rffaImportResult.success ? '#1b4d36' : '#991b1b',
                    fontSize: 12.5,
                  }}
                >
                  {rffaImportResult.success ? (
                    <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  ) : (
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  )}
                  <div>
                    <strong>{rffaImportResult.success ? 'Import Completed' : 'Import Note'}</strong>
                    <div style={{ marginTop: 2 }}>{rffaImportResult.message}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="button button-outline"
                onClick={() => !rffaImporting && setIsRffaImportOpen(false)}
                disabled={rffaImporting}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Export Modal for Beneficiary Records */}
      {isExportOpen && (
        <div className="detail-backdrop" onClick={() => !exporting && setIsExportOpen(false)}>
          <section
            className="detail-dialog"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520 }}
          >
            <div className="dialog-head">
              <div>
                <span className="section-kicker">Data Export Suite</span>
                <h2>Export {activeTab} Records</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => !exporting && setIsExportOpen(false)}
                aria-label="Close export dialog"
                disabled={exporting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="detail-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                Choose your preferred file format and data range. Both formats include complete DA-CAR column headers.
              </p>

              {/* Format Selection Cards */}
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--green-950)', marginBottom: 8 }}>
                1. Choose File Format
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {/* Excel Option */}
                <div
                  onClick={() => setExportFormat('xlsx')}
                  style={{
                    border: `2px solid ${exportFormat === 'xlsx' ? 'var(--green-800)' : '#dbe6da'}`,
                    background: exportFormat === 'xlsx' ? '#f5fbf4' : '#fff',
                    borderRadius: 6,
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <FileSpreadsheet size={20} style={{ color: 'var(--green-800)' }} />
                    <strong style={{ fontSize: 13, color: 'var(--green-950)' }}>Excel (.xlsx)</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>
                    Formatted workbook with auto-fit columns for Microsoft Excel.
                  </p>
                </div>

                {/* CSV Option */}
                <div
                  onClick={() => setExportFormat('csv')}
                  style={{
                    border: `2px solid ${exportFormat === 'csv' ? 'var(--green-800)' : '#dbe6da'}`,
                    background: exportFormat === 'csv' ? '#f5fbf4' : '#fff',
                    borderRadius: 6,
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <FileText size={20} style={{ color: '#0369a1' }} />
                    <strong style={{ fontSize: 13, color: 'var(--green-950)' }}>CSV (.csv)</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>
                    Standard comma-separated text file, universal software support.
                  </p>
                </div>
              </div>

              {/* Data Scope Selection */}
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--green-950)', marginBottom: 8 }}>
                2. Choose Data Range
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #e1e9e0',
                    background: exportScope === 'page' ? '#f7fbf6' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="exportScope"
                    checked={exportScope === 'page'}
                    onChange={() => setExportScope('page')}
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <strong style={{ fontSize: 12.5, color: 'var(--green-950)' }}>
                      Current Page View ({records.length} records)
                    </strong>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      Instantly downloads only the records currently shown on Page {currentPage}.
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #e1e9e0',
                    background: exportScope === 'all' ? '#f7fbf6' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="exportScope"
                    checked={exportScope === 'all'}
                    onChange={() => setExportScope('all')}
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <strong style={{ fontSize: 12.5, color: 'var(--green-950)' }}>
                      All Matching Records ({totalCount.toLocaleString('en-PH')} records)
                    </strong>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      Exports the entire matching dataset based on your active search and filters.
                    </div>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setIsExportOpen(false)}
                  disabled={exporting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={executeExport}
                  disabled={exporting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {exporting ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>Generating File...</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      <span>Download {exportFormat === 'xlsx' ? 'Excel (.xlsx)' : 'CSV (.csv)'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
