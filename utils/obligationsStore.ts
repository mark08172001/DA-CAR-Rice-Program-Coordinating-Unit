import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { ObligationBalanceRow, DEFAULT_OBLIGATIONS } from '@/utils/obligationsTypes';

export type { ObligationBalanceRow };
export { DEFAULT_OBLIGATIONS };

export interface SheetMeta {
  name: string;
  count: number;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'obligations_data.json');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function ensureValidUUID(id: string | undefined): string {
  if (id && UUID_REGEX.test(id)) return id;
  return randomUUID();
}

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    }
  } catch (e) {
    console.error('Error ensuring obligations data file:', e);
  }
}

function getSupabaseClient() {
  const admin = createAdminClient();
  if (admin) return admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    return createSupabaseClient(url, key);
  }
  return null;
}

/**
 * Read all rows from local JSON file
 */
function readLocalRows(): ObligationBalanceRow[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((r) => ({
        ...r,
        sheet_name: r.sheet_name || 'Main Registry',
      }));
    }
  } catch (e) {
    console.error('Error reading local obligations file:', e);
  }
  return [];
}

/**
 * Write all rows to local JSON file
 */
function writeLocalRows(rows: ObligationBalanceRow[]): void {
  ensureDataFile();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(rows, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing local obligations file:', e);
  }
}

/**
 * Get list of all available Sheet Tabs / Tables
 */
export async function getAllSheets(): Promise<SheetMeta[]> {
  const allRows = await getAllObligationsAcrossSheets();
  const map = new Map<string, { count: number; updatedAt: string }>();

  for (const r of allRows) {
    const name = r.sheet_name || 'Main Registry';
    const entry = map.get(name) || { count: 0, updatedAt: r.updated_at || r.created_at || new Date().toISOString() };
    entry.count += 1;
    if (r.updated_at && r.updated_at > entry.updatedAt) {
      entry.updatedAt = r.updated_at;
    }
    map.set(name, entry);
  }

  if (map.size === 0) {
    return [{ name: 'Main Registry', count: 0, updatedAt: new Date().toISOString() }];
  }

  return Array.from(map.entries()).map(([name, val]) => ({
    name,
    count: val.count,
    updatedAt: val.updatedAt,
  }));
}

/**
 * Read all rows across all sheets
 */
export async function getAllObligationsAcrossSheets(): Promise<ObligationBalanceRow[]> {
  return readLocalRows();
}

/**
 * Read obligations for a specific sheet/table
 */
export async function getObligations(sheetName: string = 'Main Registry'): Promise<ObligationBalanceRow[]> {
  const localRows = readLocalRows().filter((r) => (r.sheet_name || 'Main Registry') === sheetName);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Supabase / PostgREST limits single queries to 1000 rows.
      // Loop ranges to fetch all rows for complete datasets (e.g. 2,000+ SAAODB lines).
      let allSupabaseRows: ObligationBalanceRow[] = [];
      let from = 0;
      const step = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('obligations_and_balances')
          .select('*')
          .eq('sheet_name', sheetName)
          .order('created_at', { ascending: true })
          .range(from, from + step - 1);

        if (error || !data || data.length === 0) break;
        allSupabaseRows = allSupabaseRows.concat(data as ObligationBalanceRow[]);
        if (data.length < step) break;
        from += step;
      }

      if (allSupabaseRows.length > 0) {
        return allSupabaseRows;
      }
    } catch {
      // fallback to local
    }
  }

  return localRows;
}

/**
 * Save and OVERWRITE obligations for a specific sheet.
 * In Supabase: Deletes existing records for that sheet_name and inserts the updated rows with valid UUIDs.
 * In Local JSON: Replaces all records for that sheet_name.
 */
export async function saveObligations(
  rows: ObligationBalanceRow[],
  sheetName: string = 'Main Registry'
): Promise<void> {
  const normalizedRows = rows.map((r) => ({
    ...r,
    id: ensureValidUUID(r.id),
    sheet_name: sheetName,
    updated_at: new Date().toISOString(),
  }));

  // 1. Update local JSON file
  const localAll = readLocalRows();
  const filtered = localAll.filter((r) => (r.sheet_name || 'Main Registry') !== sheetName);
  const updatedLocal = [...normalizedRows, ...filtered];
  writeLocalRows(updatedLocal);

  // 2. Overwrite in Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Attempt delete by sheet_name
      const delRes = await supabase.from('obligations_and_balances').delete().eq('sheet_name', sheetName);
      if (delRes.error && delRes.error.code === 'PGRST204') {
        // If sheet_name column not yet in Supabase schema cache, delete by IDs of this sheet
        const oldIds = localAll
          .filter((r) => (r.sheet_name || 'Main Registry') === sheetName)
          .map((r) => r.id)
          .filter((id) => UUID_REGEX.test(id));
        if (oldIds.length > 0) {
          await supabase.from('obligations_and_balances').delete().in('id', oldIds);
        }
      }

      // Insert fresh rows in chunks of 400 for fast batch processing
      if (normalizedRows.length > 0) {
        const CHUNK = 400;
        for (let i = 0; i < normalizedRows.length; i += CHUNK) {
          const slice = normalizedRows.slice(i, i + CHUNK);
          const insRes = await supabase.from('obligations_and_balances').insert(slice);
          if (insRes.error && insRes.error.code === 'PGRST204') {
            // Fallback: omit sheet_name if remote database doesn't have the column yet
            const withoutSheet = slice.map(({ sheet_name, ...rest }) => rest);
            await supabase.from('obligations_and_balances').insert(withoutSheet);
          }
        }
      }
    } catch (e) {
      console.warn('Note: Could not sync obligations to Supabase table:', e);
    }
  }
}

/**
 * Insert or replace rows for a sheet
 */
export async function insertObligations(
  newRows: ObligationBalanceRow[],
  sheetName: string = 'Main Registry',
  mode: 'append' | 'replace' = 'replace'
): Promise<ObligationBalanceRow[]> {
  let existing = await getObligations(sheetName);

  let updated: ObligationBalanceRow[];
  if (mode === 'replace') {
    updated = newRows.map((r) => ({ ...r, sheet_name: sheetName }));
  } else {
    const map = new Map<string, ObligationBalanceRow>();
    existing.forEach((r) => map.set(r.id, r));
    newRows.forEach((r) => map.set(r.id, { ...r, sheet_name: sheetName }));
    updated = Array.from(map.values());
  }

  await saveObligations(updated, sheetName);
  return updated;
}

/**
 * Update an existing obligation row
 */
export async function updateObligation(
  id: string,
  updates: Partial<ObligationBalanceRow>,
  sheetName: string = 'Main Registry'
): Promise<ObligationBalanceRow | null> {
  const list = await getObligations(sheetName);
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  const current = list[idx];
  const updatedRow: ObligationBalanceRow = {
    ...current,
    ...updates,
    sheet_name: sheetName,
    updated_at: new Date().toISOString(),
  };

  // Recalculate official government formulas
  const adjustedAllotment = Number(updatedRow.adjusted_allotment) || 0;
  const totalObligation = Number(updatedRow.total_obligation) || 0;
  const earmark = Number(updatedRow.earmark) || 0;
  const disbursement = Number(updatedRow.disbursement) || 0;

  updatedRow.adjusted_allotment = adjustedAllotment;
  updatedRow.total_obligation = totalObligation;
  updatedRow.earmark = earmark;
  updatedRow.disbursement = disbursement;

  // Formula 1: UNOBLIGATED ALLOTMENT = ADJUSTED ALLOTMENT - TOTAL OBLIGATION
  updatedRow.unobligated_allotment = adjustedAllotment - totalObligation;
  // Formula 2: UNALLOCATED ALLOTMENT = UNOBLIGATED ALLOTMENT - EARMARK
  updatedRow.unallocated_allotment = updatedRow.unobligated_allotment - earmark;
  // Formula 3: UNPAID = TOTAL OBLIGATION - DISBURSEMENT
  updatedRow.unpaid = Math.max(0, totalObligation - disbursement);

  list[idx] = updatedRow;
  await saveObligations(list, sheetName);

  return updatedRow;
}

/**
 * Delete rows by ID in a sheet
 */
export async function deleteObligations(ids: string[], sheetName: string = 'Main Registry'): Promise<ObligationBalanceRow[]> {
  const list = await getObligations(sheetName);
  const set = new Set(ids);
  const remaining = list.filter((r) => !set.has(r.id));

  await saveObligations(remaining, sheetName);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('obligations_and_balances').delete().in('id', ids);
    } catch { }
  }

  return remaining;
}

/**
 * Delete an entire sheet / table
 */
export async function deleteSheet(sheetName: string): Promise<void> {
  // Update local
  const localAll = readLocalRows();
  const remaining = localAll.filter((r) => (r.sheet_name || 'Main Registry') !== sheetName);
  writeLocalRows(remaining);

  // Update Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('obligations_and_balances').delete().eq('sheet_name', sheetName);
    } catch (e) {
      console.warn('Error deleting sheet from Supabase:', e);
    }
  }
}

/**
 * Rename a sheet
 */
export async function renameSheet(oldName: string, newName: string): Promise<void> {
  if (!newName.trim() || oldName === newName) return;

  const localAll = readLocalRows();
  const updated = localAll.map((r) => {
    if ((r.sheet_name || 'Main Registry') === oldName) {
      return { ...r, sheet_name: newName, updated_at: new Date().toISOString() };
    }
    return r;
  });
  writeLocalRows(updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('obligations_and_balances')
        .update({ sheet_name: newName, updated_at: new Date().toISOString() })
        .eq('sheet_name', oldName);
    } catch (e) {
      console.warn('Error renaming sheet in Supabase:', e);
    }
  }
}

/**
 * Reset obligations for a sheet to empty
 */
export async function resetObligations(sheetName: string = 'Main Registry'): Promise<ObligationBalanceRow[]> {
  await saveObligations([], sheetName);
  return [];
}
