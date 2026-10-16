export function normalizeDateStr(dateVal?: string | null): string {
  if (!dateVal) return '';
  return dateVal.split('T')[0].trim();
}

/**
 * Returns today's date formatted as YYYY-MM-DD in Philippine Standard Time (Asia/Manila).
 * This ensures that calendar activities roll over strictly at 12:00:00 AM midnight PST.
 */
export function getTodayDateStr(timeZone = 'Asia/Manila'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Calculates milliseconds remaining until the next 12:00:00 AM midnight in Philippine Standard Time (Asia/Manila).
 * Adds a small 1-second buffer to ensure the date has fully turned over.
 */
export function getMsUntilNextMidnightPST(): number {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).formatToParts(now);

    const map: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== 'literal') {
        map[p.type] = parseInt(p.value, 10);
      }
    }

    const hour = map.hour === 24 ? 0 : (map.hour || 0);
    const minute = map.minute || 0;
    const second = map.second || 0;

    const elapsedSecondsToday = hour * 3600 + minute * 60 + second;
    const totalSecondsInDay = 86400;
    let secondsUntilMidnight = totalSecondsInDay - elapsedSecondsToday;

    if (secondsUntilMidnight <= 0) {
      secondsUntilMidnight = 86400;
    }

    // 1-second safety buffer so timer resolves at 00:00:01 AM
    return secondsUntilMidnight * 1000 + 1000;
  } catch {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 1, 0);
    return Math.max(1000, next.getTime() - now.getTime());
  }
}

/**
 * Computes whether an activity is 'ongoing', 'upcoming', or 'completed'
 * based on the start and end dates relative to today (12:00 AM midnight PST).
 */
export function computeActivityStatus(
  startDate: string,
  endDate?: string | null,
  referenceDateStr?: string
): 'ongoing' | 'upcoming' | 'completed' {
  const today = referenceDateStr || getTodayDateStr();
  const start = normalizeDateStr(startDate);
  const rawEnd = normalizeDateStr(endDate);
  const end = rawEnd && rawEnd >= start ? rawEnd : start;

  if (!start) return 'upcoming';

  if (end < today) {
    return 'completed';
  }
  if (start <= today && today <= end) {
    return 'ongoing';
  }
  return 'upcoming';
}

/**
 * Recomputes statuses of an array of activities based on the current 12 AM midnight reference date.
 */
export function recomputeActivityStatuses<T extends { start_date: string; end_date?: string | null; status?: any }>(
  activities: T[],
  referenceDateStr?: string
): T[] {
  const today = referenceDateStr || getTodayDateStr();
  return activities.map((act) => ({
    ...act,
    status: act.status === 'completed' && normalizeDateStr(act.end_date || act.start_date) < today
      ? 'completed'
      : computeActivityStatus(act.start_date, act.end_date, today),
  }));
}
