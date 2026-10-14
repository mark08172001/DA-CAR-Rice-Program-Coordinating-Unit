import fs from 'fs';
import path from 'path';
import { RegionalActivity } from '@/components/ActivityCalendar';

export interface Program {
  id?: string | number;
  category?: string;
  category_name?: string;
  name: string;
  description?: string;
  status?: string;
  target_beneficiaries?: string;
  province?: string;
  municipality?: string;
  barangay?: string;
  allotment_class?: string;
  start_date?: string;
  end_date?: string;
  date_coverage?: string;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

const JSON_DATA_PATH = path.join(process.cwd(), 'data', 'rice_programs_data.json');

export function getLocalPrograms(): Program[] {
  try {
    if (fs.existsSync(JSON_DATA_PATH)) {
      const content = fs.readFileSync(JSON_DATA_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading local programs json:', err);
  }
  return [];
}

export function saveLocalPrograms(programs: Program[]): void {
  try {
    fs.writeFileSync(JSON_DATA_PATH, JSON.stringify(programs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local programs json:', err);
  }
}

/**
 * Returns merged programs ensuring user-edited statuses and properties
 * stored locally in rice_programs_data.json take authoritative precedence
 * over stale or un-updated database reads.
 */
export function getAuthoritativePrograms(supabasePrograms?: any[] | null): Program[] {
  const localList = getLocalPrograms();
  if (!supabasePrograms || supabasePrograms.length === 0) {
    return localList;
  }

  const localById = new Map<string, Program>();
  const localByName = new Map<string, Program>();

  localList.forEach((lp) => {
    if (lp.id) localById.set(String(lp.id), lp);
    if (lp.name) localByName.set(lp.name.trim().toLowerCase(), lp);
  });

  const merged: Program[] = supabasePrograms.map((sp) => {
    const lp =
      localById.get(String(sp.id)) ||
      (sp.name ? localByName.get(sp.name.trim().toLowerCase()) : null);

    if (!lp) return sp;

    // Local changes (such as status, name, description) reflect latest user modifications
    return {
      ...sp,
      ...lp,
      status: lp.status || sp.status || 'Active',
      updated_at: lp.updated_at || sp.updated_at,
    };
  });

  // Include any newly added local programs that aren't yet in Supabase
  const spIdSet = new Set(supabasePrograms.map((sp) => String(sp.id)));
  localList.forEach((lp) => {
    if (lp.id && !spIdSet.has(String(lp.id))) {
      merged.push(lp);
    }
  });

  return merged.sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
}

/**
 * Converts a Rice Banner Program intervention into a RegionalActivity
 * representation for the Regional Agricultural Docket & Calendar.
 */
export function programToRegionalActivity(program: Program): RegionalActivity {
  const pillarToCategory: Record<string, RegionalActivity['category']> = {
    PSS: 'Production Support',
    ESETS: 'Extension & Training',
    INS: 'Irrigation Services',
    RD: 'Regional Monitoring',
  };

  const catKey = (program.category || 'PSS').toUpperCase();
  const category = pillarToCategory[catKey] || 'Production Support';

  const validProvinces = [
    'Abra',
    'Apayao',
    'Benguet',
    'Ifugao',
    'Kalinga',
    'Mountain Province',
  ];
  let province: RegionalActivity['province'] = 'Regional Office';
  if (program.province) {
    const match = validProvinces.find((p) =>
      program.province!.toLowerCase().includes(p.toLowerCase())
    );
    if (match) province = match as RegionalActivity['province'];
  }

  const rawStatus = (program.status || 'Active').toLowerCase();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

  let status: 'ongoing' | 'upcoming' | 'completed' = 'ongoing';
  let start_date = `${currentYear}-${currentMonth}-01`;
  let end_date: string | null = `${currentYear}-12-31`;

  if (['active', 'ongoing', 'in progress', 'in-progress', 'current'].includes(rawStatus)) {
    status = 'ongoing';
    start_date = `${currentYear}-${currentMonth}-01`;
    end_date = `${currentYear}-12-31`;
  } else if (['planned', 'upcoming'].includes(rawStatus)) {
    status = 'upcoming';
    const nextMonthNum = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2;
    const nextYear = now.getMonth() + 2 > 12 ? currentYear + 1 : currentYear;
    start_date = `${nextYear}-${String(nextMonthNum).padStart(2, '0')}-01`;
    end_date = `${nextYear}-${String(nextMonthNum).padStart(2, '0')}-28`;
  } else if (['completed', 'done', 'finished'].includes(rawStatus)) {
    status = 'completed';
    start_date = `${currentYear}-01-01`;
    end_date = `${currentYear}-${currentMonth}-01`;
  }

  // Prioritize explicit date coverage from the program intervention
  if (program.start_date) {
    start_date = program.start_date;
  }
  if (program.end_date) {
    end_date = program.end_date;
  }

  return {
    id: `act-prog-${program.id || program.name.replace(/\s+/g, '-').toLowerCase()}`,
    title: `[${program.category || 'PSS'}] ${program.name}`,
    description:
      program.description ||
      `Official rice banner intervention under ${program.category_name || program.category || 'PSS'} (${program.allotment_class || 'MOOE'}). Coverage: ${program.province || 'Regional (CAR)'}.`,
    category,
    province,
    location_details: `${program.province || 'Regional (CAR)'} · ${program.allotment_class || 'MOOE'}`,
    start_date,
    end_date,
    status,
    created_at: program.created_at || new Date().toISOString(),
  };
}
