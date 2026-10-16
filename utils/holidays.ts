export interface PhilippineHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'Regular Holiday' | 'Special Non-Working Day';
  description?: string;
}

export const PHILIPPINE_HOLIDAYS_2026: PhilippineHoliday[] = [
  // Full Year 2026 Philippine Official Holidays
  {
    date: '2026-01-01',
    name: "New Year's Day",
    type: 'Regular Holiday',
    description: 'First day of the year nationwide regular holiday.',
  },
  {
    date: '2026-02-17',
    name: 'Chinese New Year (Spring Festival)',
    type: 'Special Non-Working Day',
    description: 'Traditional celebration of the Lunar New Year.',
  },
  {
    date: '2026-02-25',
    name: 'EDSA People Power Revolution Anniversary',
    type: 'Special Non-Working Day',
    description: 'Commemoration of the peaceful revolution that restored Philippine democracy.',
  },
  {
    date: '2026-04-02',
    name: 'Maundy Thursday (Huwebes Santo)',
    type: 'Regular Holiday',
    description: 'Holy Week religious observance.',
  },
  {
    date: '2026-04-03',
    name: 'Good Friday (Biyernes Santo)',
    type: 'Regular Holiday',
    description: 'Holy Week solemn religious observance.',
  },
  {
    date: '2026-04-04',
    name: 'Black Saturday (Sabado de Gloria)',
    type: 'Special Non-Working Day',
    description: 'Holy Week observance leading up to Easter.',
  },
  {
    date: '2026-04-09',
    name: 'Araw ng Kagitingan (Day of Valor)',
    type: 'Regular Holiday',
    description: 'Honoring Filipino and American soldiers during the Fall of Bataan.',
  },
  {
    date: '2026-05-01',
    name: 'Labor Day (Araw ng Paggawa)',
    type: 'Regular Holiday',
    description: 'Honoring the contributions of Filipino laborers and workers.',
  },
  {
    date: '2026-06-12',
    name: 'Independence Day (Araw ng Kasarinlan)',
    type: 'Regular Holiday',
    description: 'Commemorating Philippine independence from Spanish colonial rule in 1898.',
  },
  {
    date: '2026-08-21',
    name: 'Ninoy Aquino Day',
    type: 'Special Non-Working Day',
    description: 'Commemorating the martyrdom of Senator Benigno "Ninoy" Aquino Jr.',
  },
  {
    date: '2026-08-31',
    name: 'National Heroes Day (Araw ng mga Bayani)',
    type: 'Regular Holiday',
    description: 'Remembering all known and unsung heroes of the Filipino nation.',
  },

  // Remaining Holidays of 2026 (From Oct 16, 2026 onward)
  {
    date: '2026-10-31',
    name: "All Saints' Day Eve",
    type: 'Special Non-Working Day',
    description: 'Special non-working day for family preparations ahead of All Saints’ Day.',
  },
  {
    date: '2026-11-01',
    name: "All Saints' Day (Todos Los Santos)",
    type: 'Special Non-Working Day',
    description: 'Nationwide observance honoring saints, departed ancestors, and relatives.',
  },
  {
    date: '2026-11-02',
    name: "All Souls' Day (Araw ng mga Patay)",
    type: 'Special Non-Working Day',
    description: 'Solemn traditional day of prayer and remembrance for departed souls.',
  },
  {
    date: '2026-11-30',
    name: 'Bonifacio Day (Araw ni Bonifacio)',
    type: 'Regular Holiday',
    description: 'Commemorating the birth anniversary of Katipunan Supremo Andres Bonifacio.',
  },
  {
    date: '2026-12-08',
    name: 'Feast of the Immaculate Conception of Mary',
    type: 'Special Non-Working Day',
    description: 'Principal Catholic patroness feast of the Philippines (Republic Act No. 10966).',
  },
  {
    date: '2026-12-24',
    name: 'Christmas Eve (Bisperas ng Pasko)',
    type: 'Special Non-Working Day',
    description: 'Eve of Christmas dedicated to family gatherings and Noche Buena.',
  },
  {
    date: '2026-12-25',
    name: 'Christmas Day (Araw ng Pasko)',
    type: 'Regular Holiday',
    description: 'Major nationwide regular holiday celebrating the birth of Jesus Christ.',
  },
  {
    date: '2026-12-30',
    name: 'Rizal Day (Araw ng Kabayanihan ni Rizal)',
    type: 'Regular Holiday',
    description: 'Commemorating the martyrdom of national hero Dr. Jose Rizal in 1896.',
  },
  {
    date: '2026-12-31',
    name: "Last Day of the Year (New Year's Eve)",
    type: 'Special Non-Working Day',
    description: 'Nationwide special non-working day in preparation for the New Year.',
  },
];

export const HOLIDAYS_BY_DATE_MAP: Record<string, PhilippineHoliday> =
  PHILIPPINE_HOLIDAYS_2026.reduce((acc, h) => {
    acc[h.date] = h;
    return acc;
  }, {} as Record<string, PhilippineHoliday>);

/**
 * Returns remaining 2026 holidays on or after the specified reference date.
 */
export function getRemaining2026Holidays(referenceDateStr = '2026-10-16'): PhilippineHoliday[] {
  return PHILIPPINE_HOLIDAYS_2026.filter((h) => h.date >= referenceDateStr);
}

/**
 * Calculates human-readable countdown string from today to the holiday date.
 */
export function getHolidayCountdown(holidayDateStr: string, todayDateStr: string): string {
  const [hy, hm, hd] = holidayDateStr.split('-').map(Number);
  const [ty, tm, td] = todayDateStr.split('-').map(Number);

  const holidayDate = new Date(hy, hm - 1, hd);
  const todayDate = new Date(ty, tm - 1, td);

  const diffTime = holidayDate.getTime() - todayDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1) return `In ${diffDays} days`;
  return 'Past';
}
