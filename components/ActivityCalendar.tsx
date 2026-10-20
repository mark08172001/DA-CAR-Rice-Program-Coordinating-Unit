'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Tag,
  Filter,
  Plus,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  X,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  CalendarDays,
  Lock,
  Wheat,
  Search,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import {
  PHILIPPINE_HOLIDAYS_2026,
  HOLIDAYS_BY_DATE_MAP,
  getHolidayCountdown,
} from '@/utils/holidays';

export type ActivityCategory =
  | 'Production Support'
  | 'Extension & Training'
  | 'Machinery & Equipment'
  | 'Irrigation Services'
  | 'Regional Monitoring'
  | 'Research & Dev'
  | 'Infrastructure'
  | 'Banner Rice Program';

export type ActivityProvince =
  | 'Abra'
  | 'Apayao'
  | 'Benguet'
  | 'Ifugao'
  | 'Kalinga'
  | 'Mountain Province'
  | 'Regional Office'
  | 'All Provinces';

export interface RegionalActivity {
  id: string;
  title: string;
  description: string | null;
  category: ActivityCategory;
  province: ActivityProvince;
  location_details: string;
  start_date: string;
  end_date: string | null;
  status: 'ongoing' | 'upcoming' | 'completed';
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  is_program?: boolean;
}

interface ActivityCalendarProps {
  initialActivities: RegionalActivity[];
  initialUserAccount?: any;
}

const PROVINCES = [
  'All Provinces',
  'Abra',
  'Apayao',
  'Benguet',
  'Ifugao',
  'Kalinga',
  'Mountain Province',
  'Regional Office',
] as const;

const CATEGORIES = [
  'Production Support',
  'Extension & Training',
  'Machinery & Equipment',
  'Irrigation Services',
  'Regional Monitoring',
] as const;

import {
  normalizeDateStr,
  computeActivityStatus,
  getTodayDateStr,
  getMsUntilNextMidnightPST,
  recomputeActivityStatuses,
} from '@/utils/activityStatus';

export {
  normalizeDateStr,
  computeActivityStatus,
  getTodayDateStr,
  getMsUntilNextMidnightPST,
  recomputeActivityStatuses,
};

export default function ActivityCalendar({
  initialActivities = [],
  initialUserAccount = null,
}: ActivityCalendarProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<RegionalActivity[]>(() =>
    (initialActivities || []).map((act) => ({
      ...act,
      status: act.status === 'completed'
        ? 'completed'
        : computeActivityStatus(act.start_date, act.end_date),
    }))
  );

  useEffect(() => {
    if (initialActivities) {
      setActivities(
        initialActivities.map((act) => ({
          ...act,
          status: act.status === 'completed'
            ? 'completed'
            : computeActivityStatus(act.start_date, act.end_date),
        }))
      );
    }
  }, [initialActivities]);

  // 12:00 AM Midnight Auto-Update Mechanism
  // Automatically recomputes activity statuses at 12:00:00 AM midnight (Philippine Standard Time)
  useEffect(() => {
    let midnightTimeout: NodeJS.Timeout | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
    let lastEvaluatedDate = getTodayDateStr();

    const triggerMidnightUpdate = async () => {
      const todayStr = getTodayDateStr();
      lastEvaluatedDate = todayStr;

      // 1. Immediately recompute in-memory activity statuses with new midnight reference date
      setActivities((prev) => recomputeActivityStatuses(prev, todayStr));

      // 2. Fetch fresh activities from server API
      try {
        const res = await fetch('/api/activities');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.activities)) {
            setActivities(recomputeActivityStatuses(data.activities, todayStr));
          }
        }
      } catch (e) {
        console.error('Error auto-syncing activities at midnight:', e);
      }

      // 3. Trigger router refresh so server-rendered counters update
      try {
        router.refresh();
      } catch {}

      // 4. Schedule next midnight update
      scheduleNextMidnight();
    };

    const scheduleNextMidnight = () => {
      if (midnightTimeout) clearTimeout(midnightTimeout);
      const msUntilMidnight = getMsUntilNextMidnightPST();
      midnightTimeout = setTimeout(() => {
        triggerMidnightUpdate();
      }, msUntilMidnight);
    };

    // Initialize midnight timer
    scheduleNextMidnight();

    // Fallback interval (every 30 seconds) to guard against device sleep / wake after midnight
    fallbackInterval = setInterval(() => {
      const currentToday = getTodayDateStr();
      if (currentToday !== lastEvaluatedDate) {
        triggerMidnightUpdate();
      }
    }, 30000);

    // Tab visibility and window focus check
    const handleVisibilityOrFocus = () => {
      const currentToday = getTodayDateStr();
      if (currentToday !== lastEvaluatedDate) {
        triggerMidnightUpdate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      if (midnightTimeout) clearTimeout(midnightTimeout);
      if (fallbackInterval) clearInterval(fallbackInterval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [router]);

  const [selectedProvince, setSelectedProvince] = useState<string>('All Provinces');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Current calendar month view - dynamic to current year/month
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const selectedHoliday = selectedDate ? HOLIDAYS_BY_DATE_MAP[selectedDate] : null;

  // Auth state for administrative alteration
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentUserAccount, setCurrentUserAccount] = useState<any>(initialUserAccount || null);

  // Modals
  const [activeModalActivity, setActiveModalActivity] = useState<RegionalActivity | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form inputs
  const [formId, setFormId] = useState<string>('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<RegionalActivity['category']>('Production Support');
  const [formProvince, setFormProvince] = useState<RegionalActivity['province']>('Kalinga');
  const [formLocation, setFormLocation] = useState('');
  const [formStartDate, setFormStartDate] = useState(() => getTodayDateStr());
  const [formEndDate, setFormEndDate] = useState(() => getTodayDateStr());
  const [formStatus, setFormStatus] = useState<RegionalActivity['status']>('ongoing');

  const supabase = createClient();

  // Load auth state
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
        if (user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (prof) setUserProfile(prof);
        }
      } catch (e) {
        console.error('Error reading auth state:', e);
      }
    };
    checkUser();

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
        console.error('Error fetching auth account in calendar:', err);
      }
    };

    fetchAccountData();

    const handlePermUpdated = () => {
      fetchAccountData();
    };
    window.addEventListener('da_permissions_updated', handlePermUpdated);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'da_permissions_ts') {
        fetchAccountData();
      }
    };
    window.addEventListener('storage', handleStorage);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setCurrentUser(u);
      if (u) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', u.id)
          .single();
        if (prof) setUserProfile(prof);
      } else {
        setUserProfile(null);
      }
      fetchAccountData();
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('da_permissions_updated', handlePermUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Auto-sync outdated stored statuses in Supabase
  useEffect(() => {
    if (!activities || activities.length === 0) return;
    const today = getTodayDateStr();
    activities.forEach(async (act) => {
      if (act.id?.startsWith('act-prog-')) return;
      const computed = computeActivityStatus(act.start_date, act.end_date, today);
      if (act.status !== computed) {
        try {
          await supabase
            .from('regional_activities')
            .update({ status: computed })
            .eq('id', act.id);
        } catch (err) {
          console.warn('Auto-sync status failed for activity', act.id, err);
        }
      }
    });
  }, [activities]);

  // Dynamically normalized activities list against today's date
  const normalizedActivities = useMemo(() => {
    const today = getTodayDateStr();
    return activities.map((act) => {
      const computed = computeActivityStatus(act.start_date, act.end_date, today);
      const effective = act.status === 'completed' && computed !== 'ongoing' ? 'completed' : computed;
      return act.status !== effective ? { ...act, status: effective } : act;
    });
  }, [activities]);

  // Counts
  const ongoingCount = useMemo(
    () => normalizedActivities.filter((a) => a.status === 'ongoing').length,
    [normalizedActivities]
  );
  const upcomingCount = useMemo(
    () => normalizedActivities.filter((a) => a.status === 'upcoming').length,
    [normalizedActivities]
  );
  const completedCount = useMemo(
    () => normalizedActivities.filter((a) => a.status === 'completed').length,
    [normalizedActivities]
  );
  const activeActivitiesCount = useMemo(
    () => ongoingCount + upcomingCount,
    [ongoingCount, upcomingCount]
  );

  // Filter activities
  const filteredActivities = useMemo(() => {
    return normalizedActivities.filter((act) => {
      // Search query filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          (act.title || '').toLowerCase().includes(q) ||
          (act.description || '').toLowerCase().includes(q) ||
          (act.location_details || '').toLowerCase().includes(q) ||
          (act.province || '').toLowerCase().includes(q) ||
          (act.category || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Province match
      if (selectedProvince !== 'All Provinces' && act.province !== selectedProvince) {
        return false;
      }

      // Specific calendar date clicked takes precedence:
      if (selectedDate) {
        const start = normalizeDateStr(act.start_date);
        const end = normalizeDateStr(act.end_date) || start;
        if (selectedDate < start || selectedDate > end) {
          return false;
        }
        if (statusFilter !== 'all' && act.status !== statusFilter) {
          return false;
        }
        return true;
      }

      // Status filter when no specific calendar date is selected:
      if (statusFilter === 'ongoing') {
        return act.status === 'ongoing';
      }
      if (statusFilter === 'upcoming') {
        return act.status === 'upcoming';
      }
      if (statusFilter === 'completed') {
        return act.status === 'completed';
      }

      // Default 'All Activities' tab: do not show completed activities on regional agricultural docket
      return act.status !== 'completed';
    }).sort((a, b) => {
      return (a.start_date || '').localeCompare(b.start_date || '');
    });
  }, [normalizedActivities, selectedProvince, statusFilter, selectedDate, searchQuery]);

  // Calendar calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(getTodayDateStr());
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const m = month === 11 ? 1 : month + 2;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // Map dates to activities for fast dot indicator lookup
  const activityDatesMap = useMemo(() => {
    const map = new Map<string, { ongoing: boolean; upcoming: boolean; completed: boolean; total: number }>();
    normalizedActivities.forEach((act) => {
      if (!act.start_date) return;
      const startStr = normalizeDateStr(act.start_date);
      const endStr = normalizeDateStr(act.end_date) || startStr;
      const [sy, sm, sd] = startStr.split('-').map(Number);
      const [ey, em, ed] = endStr.split('-').map(Number);
      if (!sy || !sm || !sd) return;

      const start = new Date(sy, sm - 1, sd);
      const end = (!ey || !em || !ed) ? new Date(start) : new Date(ey, em - 1, ed);

      // Iterate dates from start to end (cap at 365 days)
      const cur = new Date(start);
      let count = 0;
      while (cur <= end && count < 365) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const dStr = `${y}-${m}-${d}`;

        const entry = map.get(dStr) || { ongoing: false, upcoming: false, completed: false, total: 0 };
        if (act.status === 'ongoing') entry.ongoing = true;
        if (act.status === 'upcoming') entry.upcoming = true;
        if (act.status === 'completed') entry.completed = true;
        entry.total += 1;
        map.set(dStr, entry);

        cur.setDate(cur.getDate() + 1);
        count++;
      }
    });
    return map;
  }, [normalizedActivities]);

  // Form open handlers
  const handleOpenCreate = () => {
    const defaultDate = selectedDate || getTodayDateStr();
    setFormMode('create');
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Production Support');
    setFormProvince('Kalinga');
    setFormLocation('');
    setFormStartDate(defaultDate);
    setFormEndDate(defaultDate);
    setFormStatus(computeActivityStatus(defaultDate, defaultDate));
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (act: RegionalActivity) => {
    if (act.id?.startsWith('act-prog-')) {
      router.push('/rice/programs');
      return;
    }
    const effectiveStatus = computeActivityStatus(act.start_date, act.end_date);
    setFormMode('edit');
    setFormId(act.id);
    setFormTitle(act.title);
    setFormDescription(act.description || '');
    setFormCategory(act.category);
    setFormProvince(act.province);
    setFormLocation(act.location_details);
    setFormStartDate(act.start_date);
    setFormEndDate(act.end_date || act.start_date);
    setFormStatus(effectiveStatus);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleDeleteActivity = async (id: string) => {
    if (id.startsWith('act-prog-')) {
      alert('This activity is a Rice Banner Program intervention. Please manage it under Rice Coordinating Unit -> Programs Register.');
      router.push('/rice/programs');
      return;
    }
    if (!confirm('Are you sure you want to delete this regional activity? This will remove it from the public calendar.')) {
      return;
    }
    try {
      const res = await fetch('/api/activities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Could not delete activity.');
        return;
      }
      setActivities((prev) => prev.filter((a) => a.id !== id));
      if (activeModalActivity?.id === id) {
        setActiveModalActivity(null);
      }
      router.refresh();
    } catch (e: any) {
      alert('Error deleting activity: ' + e.message);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    const start = formStartDate;
    const end = formEndDate && formEndDate >= formStartDate ? formEndDate : formStartDate;
    const computedStatus = computeActivityStatus(start, end);

    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      category: formCategory,
      province: formProvince,
      location_details: formLocation.trim(),
      start_date: start,
      end_date: end,
      status: computedStatus,
    };

    try {
      if (formMode === 'create') {
        const res = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (!res.ok) {
          setFormError(data.error || 'Error saving regional activity.');
          setFormSubmitting(false);
          return;
        }

        if (data.activity) {
          const saved = {
            ...(data.activity as RegionalActivity),
            status: computeActivityStatus(data.activity.start_date, data.activity.end_date),
          };
          setActivities((prev) => [saved, ...prev]);
        }
      } else {
        const res = await fetch('/api/activities', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: formId, ...payload }),
        });
        const data = await res.json();

        if (!res.ok) {
          setFormError(data.error || 'Error updating regional activity.');
          setFormSubmitting(false);
          return;
        }

        if (data.activity) {
          const saved = {
            ...(data.activity as RegionalActivity),
            status: computeActivityStatus(data.activity.start_date, data.activity.end_date),
          };
          setActivities((prev) => prev.map((a) => (a.id === formId ? saved : a)));
        }
      }

      setIsFormOpen(false);
      setFormSubmitting(false);
      router.refresh();
    } catch (err: any) {
      setFormError(err.message || 'Error saving regional activity.');
      setFormSubmitting(false);
    }
  };

  const effectiveUser = currentUser || currentUserAccount;
  const isSuspended = currentUserAccount?.status === 'suspended';
  const isSuperAdmin =
    currentUserAccount?.role === 'super_admin' ||
    currentUser?.email === 'super.admin@car.da.gov.ph' ||
    currentUserAccount?.email === 'super.admin@car.da.gov.ph';

  // Permission check: if can_add_activities is explicitly false, power is removed
  const hasAddActivityPower = currentUserAccount?.permissions
    ? currentUserAccount.permissions.can_add_activities !== false
    : (isSuperAdmin ? true : false);

  const canAlter = Boolean(effectiveUser) && !isSuspended && (isSuperAdmin || hasAddActivityPower);
  const isExplicitlyRevoked = Boolean(effectiveUser) && !isSuperAdmin && (!hasAddActivityPower || isSuspended);

  return (
    <section className="section" id="event-calendar" aria-label="Regional Activities and Event Calendar">
      <div className="page-container">
        {/* Section Header */}
        <div className="section-heading">
          <div>
            <div className="section-kicker-row">
              <span className="section-kicker">REGIONAL AGRICULTURAL OPERATIONS</span>
              <span className="calendar-live-badge">
                <span className="pulse-indicator"></span>
                {ongoingCount} Ongoing Across Cordillera
              </span>
            </div>
            <h2>Regional activities & field calendar</h2>
            <p>
              Real-time monitoring of seed voucher verifications, agroecology workshops, irrigation audits, and farm mechanization across the six Cordillera provinces.
            </p>
          </div>

          <div className="calendar-header-actions">
            {canAlter ? (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="calendar-add-btn"
                title="Add or update regional activities"
              >
                <Plus size={16} />
                <span>Add Regional Activity</span>
              </button>
            ) : isExplicitlyRevoked ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  fontSize: 12.5,
                  color: '#991b1b',
                  fontWeight: 600,
                }}
                title="The Super Admin has removed your account's power to add activities in the calendar"
              >
                <Lock size={15} style={{ color: '#dc2626' }} />
                <span>Adding activities restricted by Super Admin</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="calendar-add-btn"
                title="Add regional activity"
              >
                <Plus size={16} />
                <span>Add Regional Activity</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar (Matching Screenshot) */}
        <div className="calendar-filter-bar-clean">
          <div className="status-pills-clean" role="tablist" aria-label="Filter activities by status">
            <button
              type="button"
              className={`status-pill-clean ${statusFilter === 'all' && !selectedDate ? 'active' : ''}`}
              onClick={() => { setStatusFilter('all'); setSelectedDate(null); }}
            >
              <span>All Activities</span>
              <span className="pill-count">{activeActivitiesCount}</span>
            </button>
            <button
              type="button"
              className={`status-pill-clean ${statusFilter === 'ongoing' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('ongoing'); setSelectedDate(null); }}
            >
              <span className="status-dot ongoing"></span>
              <span>Ongoing</span>
              <span className="pill-count-subtle">{ongoingCount}</span>
            </button>
            <button
              type="button"
              className={`status-pill-clean ${statusFilter === 'upcoming' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('upcoming'); setSelectedDate(null); }}
            >
              <span className="status-dot upcoming"></span>
              <span>Upcoming</span>
              <span className="pill-count-subtle">{upcomingCount}</span>
            </button>
            <button
              type="button"
              className={`status-pill-clean ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('completed'); setSelectedDate(null); }}
            >
              <span className="status-dot completed"></span>
              <span>Completed</span>
              <span className="pill-count-subtle">{completedCount}</span>
            </button>
          </div>

          <div className="filter-controls-right">
            <div className="calendar-search-box">
              <Search size={14} className="calendar-search-icon" />
              <input
                type="text"
                placeholder="Search municipality or PAP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="calendar-search-input"
              />
            </div>

            <div className="calendar-select-box">
              <Filter size={13} className="calendar-filter-funnel" />
              <select
                value={selectedProvince}
                onChange={(e) => { setSelectedProvince(e.target.value); setSelectedDate(null); }}
                className="calendar-province-select"
                aria-label="Filter by Cordillera Province"
              >
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 2-Column Layout: Calendar Grid + Activity Docket */}
        <div className="calendar-layout-grid-clean">
          {/* Left Column: Interactive Month Grid Card */}
          <div className="calendar-grid-card-clean">
            <div className="calendar-month-header-clean">
              <div className="calendar-month-title">
                <CalendarIcon size={16} className="calendar-icon-green" />
                <h3>{monthName}</h3>
              </div>
              <div className="calendar-month-actions">
                <button
                  type="button"
                  onClick={goToToday}
                  className={`calendar-btn-today ${selectedDate === getTodayDateStr() ? 'active' : ''}`}
                  title="Jump to today"
                >
                  Today ({new Date().getDate()})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className={`calendar-btn-allmonth ${!selectedDate ? 'active' : ''}`}
                  title="Show all activities in month"
                >
                  All Month
                </button>
              </div>
            </div>

            {/* Weekdays Header */}
            <div className="calendar-weekdays-clean">
              <span>SUN</span>
              <span>MON</span>
              <span>TUE</span>
              <span>WED</span>
              <span>THU</span>
              <span>FRI</span>
              <span>SAT</span>
            </div>

            {/* Days Matrix */}
            <div className="calendar-days-matrix-clean">
              {calendarDays.map((day, idx) => {
                const isSelected = selectedDate === day.dateStr;
                const isToday = day.dateStr === getTodayDateStr();
                const dayActivities = activityDatesMap.get(day.dateStr);
                const dayHoliday = HOLIDAYS_BY_DATE_MAP[day.dateStr];
                const holidayNote = dayHoliday ? ` • 🇵🇭 ${dayHoliday.name} (${dayHoliday.type})` : '';

                return (
                  <button
                    key={`${day.dateStr}-${idx}`}
                    type="button"
                    onClick={() => {
                      if (selectedDate === day.dateStr) {
                        setSelectedDate(null);
                      } else {
                        setSelectedDate(day.dateStr);
                        if (!day.isCurrentMonth) {
                          const [y, m] = day.dateStr.split('-').map(Number);
                          setViewDate(new Date(y, m - 1, 1));
                        }
                      }
                    }}
                    className={`calendar-day-cell ${!day.isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isToday && !isSelected ? 'is-today' : ''}`}
                    title={`${day.dateStr} (${dayActivities?.total || 0} activities)${holidayNote}`}
                  >
                    <span className="day-cell-number">{day.dayNum}</span>
                    {(dayActivities || dayHoliday) && (
                      <span className="day-cell-dots">
                        {dayActivities?.ongoing && <span className="cell-dot dot-ongoing" />}
                        {dayActivities?.upcoming && <span className="cell-dot dot-upcoming" />}
                        {dayActivities?.completed && <span className="cell-dot dot-completed" />}
                        {dayHoliday && <span className="cell-dot dot-holiday" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend (Matching Screenshot: 2x2 Clean Layout) */}
            <div className="calendar-legend-clean">
              <div className="legend-clean-item">
                <span className="cell-dot dot-ongoing"></span>
                <span>Ongoing (Oct 17–20)</span>
              </div>
              <div className="legend-clean-item">
                <span className="cell-dot dot-upcoming"></span>
                <span>Upcoming (Oct 26–27)</span>
              </div>
              <div className="legend-clean-item">
                <span className="cell-dot dot-completed"></span>
                <span>Completed ({completedCount})</span>
              </div>
              <div className="legend-clean-item">
                <span className="cell-dot dot-holiday"></span>
                <span>Holiday (Oct 31)</span>
              </div>
            </div>
          </div>

          {/* Right Column: Docket Stream */}
          <div className="activities-stream-card-clean">
            <div className="stream-header-clean">
              <div className="stream-title-group">
                <h3>Regional Agricultural Docket</h3>
                <span className="stream-shown-pill">
                  {filteredActivities.length} {filteredActivities.length === 1 ? 'Activity Shown' : 'Activities Shown'}
                </span>
              </div>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="stream-filter-pill"
                  title="Clear date filter to show all activities"
                >
                  <span>
                    Filtered by: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="stream-filter-clear">× Show All ({activeActivitiesCount})</span>
                </button>
              )}
            </div>

            {/* Selected Holiday Banner if viewed day is a holiday */}
            {selectedHoliday && (
              <div className="calendar-holiday-selected-card">
                <div className="holiday-card-badge">
                  <span>🇵🇭 {selectedHoliday.type}</span>
                  <span className="holiday-countdown-chip">
                    {getHolidayCountdown(selectedHoliday.date, getTodayDateStr())}
                  </span>
                </div>
                <h4>{selectedHoliday.name}</h4>
                <p>{selectedHoliday.description}</p>
                <span className="holiday-note">
                  Official public holiday / non-working day observed across the Cordillera Administrative Region.
                </span>
              </div>
            )}

            {filteredActivities.length === 0 ? (
              <div className="empty-activities-state">
                <CalendarDays size={40} className="empty-state-icon" />
                <h4>No regional activities found</h4>
                <p>
                  There are no scheduled activities matching your current filter criteria ({selectedProvince}, {statusFilter}{searchQuery ? `, "${searchQuery}"` : ''}).
                </p>
                <button
                  type="button"
                  onClick={() => { setSelectedProvince('All Provinces'); setStatusFilter('all'); setSelectedDate(null); setSearchQuery(''); }}
                  className="button button-outline"
                  style={{ marginTop: 12 }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="activities-stream-cards-clean">
                {filteredActivities.map((act) => {
                  const isOngoing = act.status === 'ongoing';
                  const programCode =
                    act.category === 'Irrigation Services' ? 'INS RICE' :
                    act.category === 'Production Support' ? 'PROD RICE' :
                    act.category === 'Extension & Training' ? 'EXT RICE' :
                    act.category === 'Machinery & Equipment' ? 'MECH RICE' :
                    act.category === 'Regional Monitoring' ? 'REG RICE' : 'RCU RICE';

                  return (
                    <article
                      key={act.id}
                      className={`activity-card-clean ${isOngoing ? 'card-ongoing' : ''} ${act.status === 'completed' ? 'card-completed' : ''}`}
                    >
                      <div className="card-top-clean">
                        <div className="card-badges-clean">
                          <span className={`status-tag-clean ${act.status}`}>
                            <span className="status-tag-dot" />
                            {act.status.toUpperCase()}
                          </span>
                          <span className="prog-code-tag">{programCode}</span>
                          <span className="cat-name-tag">• {act.category}</span>
                        </div>
                      </div>

                      <h4
                        className="card-title-clean"
                        onClick={() => setActiveModalActivity(act)}
                        role="button"
                        tabIndex={0}
                      >
                        {act.title}
                      </h4>

                      {act.description && (
                        <p className="card-desc-clean">
                          "{act.description}"
                        </p>
                      )}

                      <div className="card-bottom-clean">
                        <div className="card-meta-clean">
                          <span className="meta-info-clean">
                            <MapPin size={13} className="meta-icon" />
                            <span>{act.location_details || act.province}</span>
                          </span>
                          <span className="meta-info-clean">
                            <Clock size={13} className="meta-icon" />
                            <span>
                              {act.start_date}
                              {act.end_date && act.end_date !== act.start_date ? ` to ${act.end_date}` : ''}
                            </span>
                          </span>
                        </div>

                        <div className="card-actions-clean">
                          <button
                            type="button"
                            onClick={() => setActiveModalActivity(act)}
                            className="view-details-clean-btn"
                          >
                            <span>View Details</span>
                            <ArrowRight size={13} />
                          </button>

                          {canAlter && (
                            <div className="admin-actions-clean">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(act)}
                                className="admin-action-btn edit"
                                title="Edit this activity"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteActivity(act.id)}
                                className="admin-action-btn delete"
                                title="Delete this activity"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {activeModalActivity && (
        <div className="calendar-modal-backdrop" onClick={() => setActiveModalActivity(null)}>
          <div className="calendar-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-meta">
                <span className={`status-badge-chip ${activeModalActivity.status}`}>
                  {activeModalActivity.status === 'ongoing' && <span className="live-dot" />}
                  {activeModalActivity.status === 'completed' && <span className="completed-dot" />}
                  {activeModalActivity.status.toUpperCase()}
                </span>
                <span className="category-chip">
                  {activeModalActivity.category}
                </span>
                <span className="province-pill">
                  <MapPin size={12} />
                  {activeModalActivity.province}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalActivity(null)}
                className="modal-close-btn"
                aria-label="Close activity details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <h3 className="modal-activity-title">{activeModalActivity.title}</h3>
              {activeModalActivity.description && (
                <p className="modal-activity-description">{activeModalActivity.description}</p>
              )}

              <div className="modal-specs-grid">
                <div className="spec-card">
                  <span className="spec-label">Location</span>
                  <strong className="spec-value">{activeModalActivity.location_details}</strong>
                  <span className="spec-sub">{activeModalActivity.province}, Cordillera</span>
                </div>

                <div className="spec-card">
                  <span className="spec-label">Schedule Duration</span>
                  <strong className="spec-value">{activeModalActivity.start_date}</strong>
                  <span className="spec-sub">
                    {activeModalActivity.end_date ? `Through ${activeModalActivity.end_date}` : 'Single Day Activity'}
                  </span>
                </div>

                <div className="spec-card">
                  <span className="spec-label">Program Intervention</span>
                  <strong className="spec-value">{activeModalActivity.category}</strong>
                  <span className="spec-sub">Department of Agriculture RFO-CAR</span>
                </div>

                <div className="spec-card">
                  <span className="spec-label">Operational Status</span>
                  <strong className="spec-value" style={{ textTransform: 'capitalize' }}>
                    {activeModalActivity.status}
                  </strong>
                  <span className="spec-sub">Live monitoring record</span>
                </div>
              </div>

              {activeModalActivity.id?.startsWith('act-prog-') ? (
                <div className="modal-admin-bar">
                  <Link
                    href="/rice/programs"
                    className="button button-primary"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Wheat size={15} /> Manage in Rice Programs Register
                  </Link>
                </div>
              ) : canAlter ? (
                <div className="modal-admin-bar">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = activeModalActivity;
                      setActiveModalActivity(null);
                      handleOpenEdit(cur);
                    }}
                    className="button button-primary"
                  >
                    <Edit3 size={15} /> Edit This Activity
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteActivity(activeModalActivity.id)}
                    className="button button-outline delete-btn"
                  >
                    <Trash2 size={15} /> Delete Activity
                  </button>
                </div>
              ) : isExplicitlyRevoked ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#991b1b',
                    marginTop: 14,
                  }}
                >
                  <Lock size={14} style={{ color: '#dc2626' }} />
                  <span>Modifying activities restricted for this account by Super Admin</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ACTIVITY MODAL (ALTER WEBSITE) */}
      {isFormOpen && (
        <div className="calendar-modal-backdrop" onClick={() => !formSubmitting && setIsFormOpen(false)}>
          <div className="calendar-modal-card calendar-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-activity-title">
                  {formMode === 'create' ? 'Add Regional Activity' : 'Edit Regional Activity'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                  Alter website event docket and calendar in real-time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !formSubmitting && setIsFormOpen(false)}
                className="modal-close-btn"
                disabled={formSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="auth-alert auth-alert-error" style={{ margin: '0 24px 16px' }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="activity-form-body">
              <div className="form-group">
                <label htmlFor="act-title">Activity Title *</label>
                <input
                  id="act-title"
                  type="text"
                  required
                  placeholder="e.g. Hybrid Rice Seed & Fertilizer Voucher Verification"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  disabled={formSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="act-desc">Description / Purpose</label>
                <textarea
                  id="act-desc"
                  rows={3}
                  placeholder="Describe the operational goals, target farmer cooperatives, or verification guidelines..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  disabled={formSubmitting}
                />
              </div>

              <div className="auth-grid-2">
                <div className="form-group">
                  <label htmlFor="act-cat">Intervention Category *</label>
                  <select
                    id="act-cat"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    disabled={formSubmitting}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="act-prov">Province *</label>
                  <select
                    id="act-prov"
                    value={formProvince}
                    onChange={(e) => setFormProvince(e.target.value as any)}
                    disabled={formSubmitting}
                  >
                    <option value="Abra">Abra</option>
                    <option value="Apayao">Apayao</option>
                    <option value="Benguet">Benguet</option>
                    <option value="Ifugao">Ifugao</option>
                    <option value="Kalinga">Kalinga</option>
                    <option value="Mountain Province">Mountain Province</option>
                    <option value="Regional Office">Regional Office</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="act-loc">Specific Location Details *</label>
                <input
                  id="act-loc"
                  type="text"
                  required
                  placeholder="e.g. Tabuk City Gymnasium, Rizal Multi-Purpose Center"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  disabled={formSubmitting}
                />
              </div>

              <div className="auth-grid-3">
                <div className="form-group">
                  <label htmlFor="act-start">Start Date *</label>
                  <input
                    id="act-start"
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setFormStartDate(newStart);
                      const validEnd = (!formEndDate || formEndDate < newStart) ? newStart : formEndDate;
                      if (!formEndDate || formEndDate < newStart) {
                        setFormEndDate(newStart);
                      }
                      setFormStatus(computeActivityStatus(newStart, validEnd));
                    }}
                    disabled={formSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="act-end">End Date</label>
                  <input
                    id="act-end"
                    type="date"
                    min={formStartDate}
                    value={formEndDate}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      setFormEndDate(newEnd);
                      setFormStatus(computeActivityStatus(formStartDate, newEnd));
                    }}
                    disabled={formSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="act-status">Status *</label>
                  <select
                    id="act-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    disabled={formSubmitting}
                  >
                    <option value="ongoing">🟢 Ongoing (Active Today)</option>
                    <option value="upcoming">📅 Upcoming (Scheduled)</option>
                    <option value="completed">✓ Completed (Past)</option>
                  </select>
                </div>
              </div>

              <div className="modal-form-actions">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="button button-outline"
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Saving...' : formMode === 'create' ? 'Publish Activity' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
