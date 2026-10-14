export function normalizeDateStr(dateVal?: string | null): string {
  if (!dateVal) return '';
  return dateVal.split('T')[0].trim();
}

export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
