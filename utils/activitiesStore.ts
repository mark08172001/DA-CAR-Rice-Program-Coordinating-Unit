import fs from 'fs';
import path from 'path';

export interface RegionalActivity {
  id: string;
  title: string;
  description: string | null;
  category: 'Production Support' | 'Extension & Training' | 'Research & Dev' | 'Infrastructure' | 'Banner Rice Program';
  province: 'Abra' | 'Apayao' | 'Benguet' | 'Ifugao' | 'Kalinga' | 'Mountain Province' | 'All Provinces';
  location_details: string;
  start_date: string;
  end_date: string;
  status: 'ongoing' | 'upcoming' | 'completed';
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities_data.json');

function ensureDataFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(ACTIVITIES_FILE)) {
      fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error ensuring activities_data.json:', err);
  }
}

export function getLocalActivities(): RegionalActivity[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(ACTIVITIES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (err) {
    console.error('Error reading activities_data.json:', err);
  }
  return [];
}

export function saveLocalActivities(activities: RegionalActivity[]): void {
  ensureDataFile();
  try {
    fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify(activities, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing activities_data.json:', err);
  }
}

export function addLocalActivity(activity: RegionalActivity): RegionalActivity {
  const current = getLocalActivities();
  const index = current.findIndex((a) => a.id === activity.id);
  if (index >= 0) {
    current[index] = { ...current[index], ...activity, updated_at: new Date().toISOString() };
  } else {
    current.unshift({
      ...activity,
      created_at: activity.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  saveLocalActivities(current);
  return activity;
}

export function updateLocalActivity(id: string, updates: Partial<RegionalActivity>): RegionalActivity | null {
  const current = getLocalActivities();
  const index = current.findIndex((a) => a.id === id);
  if (index < 0) return null;
  current[index] = { ...current[index], ...updates, updated_at: new Date().toISOString() };
  saveLocalActivities(current);
  return current[index];
}

export function deleteLocalActivity(id: string): boolean {
  const current = getLocalActivities();
  const filtered = current.filter((a) => a.id !== id);
  const deleted = filtered.length !== current.length;
  if (deleted) {
    saveLocalActivities(filtered);
  }
  return deleted;
}

export function getAuthoritativeActivities(dbActivities?: RegionalActivity[] | null): RegionalActivity[] {
  const local = getLocalActivities();
  if (!dbActivities || dbActivities.length === 0) {
    return local;
  }

  const map = new Map<string, RegionalActivity>();
  for (const a of dbActivities) {
    map.set(a.id, a);
  }
  for (const l of local) {
    map.set(l.id, l);
  }

  return Array.from(map.values()).sort((a, b) =>
    (a.start_date || '').localeCompare(b.start_date || '')
  );
}
