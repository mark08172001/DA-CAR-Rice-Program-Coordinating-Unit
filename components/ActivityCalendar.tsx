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
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export interface RegionalActivity {
  id: string;
  title: string;
  description: string | null;
  category: 'Production Support' | 'Extension & Training' | 'Machinery & Equipment' | 'Irrigation Services' | 'Regional Monitoring';
  province: 'Abra' | 'Apayao' | 'Benguet' | 'Ifugao' | 'Kalinga' | 'Mountain Province' | 'Regional Office';
  location_details: string;
  start_date: string;
  end_date: string | null;
  status: 'ongoing' | 'upcoming' | 'completed';
  created_by?: string | null;
  created_at?: string;
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
  getTodayDateStr
} from '@/utils/activityStatus';

export { normalizeDateStr, computeActivityStatus, getTodayDateStr };

export default function ActivityCalendar({
  initialActivities = [],
  initialUserAccount = null,
}: ActivityCalendarProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<RegionalActivity[]>(() =>
    (initialActivities || []).map((act) => ({
      ...act,
      status: act.id?.startsWith('act-prog-')
        ? act.status
        : computeActivityStatus(act.start_date, act.end_date),
    }))
  );

  useEffect(() => {
    if (initialActivities) {
      setActivities(
        initialActivities.map((act) => ({
          ...act,
          status: act.id?.startsWith('act-prog-')
            ? act.status
            : computeActivityStatus(act.start_date, act.end_date),
        }))
      );
    }
  }, [initialActivities]);

  const [selectedProvince, setSelectedProvince] = useState<string>('All Provinces');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');

  // Current calendar month view - dynamic to current year/month
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
      if (act.id?.startsWith('act-prog-')) {
        return act;
      }
      const computed = computeActivityStatus(act.start_date, act.end_date, today);
      return act.status !== computed ? { ...act, status: computed } : act;
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
      // Province match
      if (selectedProvince !== 'All Provinces' && act.province !== selectedProvince) {
        return false;
      }

      // Specific calendar date clicked takes precedence
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

      // Default 'All Activities' tab: automatically excludes activities that moved past their date
      return act.status !== 'completed';
    });
  }, [normalizedActivities, selectedProvince, statusFilter, selectedDate]);

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
              <span className="section-kicker">Regional Agricultural Operations</span>
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
                className="button button-primary calendar-action-btn"
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
              <a
                href="/login?next=/#event-calendar"
                className="button button-outline calendar-action-btn"
                title="Sign in as DA Officer to update calendar activities"
              >
                <ShieldCheck size={16} />
                <span>Staff Sign In to Update</span>
              </a>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="calendar-filter-bar">
          <div className="status-tabs" role="tablist" aria-label="Filter activities by status">
            <button
              type="button"
              className={`status-tab ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('all'); setSelectedDate(null); }}
            >
              All Activities ({activeActivitiesCount})
            </button>
            <button
              type="button"
              className={`status-tab ${statusFilter === 'ongoing' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('ongoing'); setSelectedDate(null); }}
            >
              <span className="status-dot ongoing"></span>
              Ongoing ({ongoingCount})
            </button>
            <button
              type="button"
              className={`status-tab ${statusFilter === 'upcoming' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('upcoming'); setSelectedDate(null); }}
            >
              <span className="status-dot upcoming"></span>
              Upcoming ({upcomingCount})
            </button>
            {completedCount > 0 && (
              <button
                type="button"
                className={`status-tab ${statusFilter === 'completed' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('completed'); setSelectedDate(null); }}
              >
                <span className="status-dot completed"></span>
                Past / Completed ({completedCount})
              </button>
            )}
          </div>

          <div className="filter-dropdown-wrap">
            <Filter size={14} className="filter-icon" />
            <select
              value={selectedProvince}
              onChange={(e) => { setSelectedProvince(e.target.value); setSelectedDate(null); }}
              className="calendar-select"
              aria-label="Filter by Cordillera Province"
            >
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected date banner if filtered by day */}
        {selectedDate && (
          <div className="selected-date-banner">
            <span>
              Showing events scheduled on <strong>{selectedDate}</strong>
            </span>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="clear-date-filter"
            >
              <X size={14} /> Clear date filter
            </button>
          </div>
        )}

        {/* 2-Column Layout: Calendar Grid + Activity Stream */}
        <div className="calendar-layout-grid">
          {/* Left Column: Interactive Month Grid */}
          <div className="calendar-grid-card">
            <div className="calendar-nav-header">
              <div className="calendar-title-wrap">
                <CalendarIcon size={18} className="calendar-icon-da" />
                <h3 className="calendar-current-month">{monthName}</h3>
              </div>
              <div className="calendar-nav-buttons">
                <button
                  type="button"
                  onClick={goToToday}
                  className="today-shortcut-btn"
                  title="Return to Today"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={prevMonth}
                  className="calendar-nav-arrow"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="calendar-nav-arrow"
                  aria-label="Next month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="calendar-weekdays">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Days Cells */}
            <div className="calendar-days-matrix">
              {calendarDays.map((day, idx) => {
                const isSelected = selectedDate === day.dateStr;
                const isToday = day.dateStr === getTodayDateStr();
                const dayActivities = activityDatesMap.get(day.dateStr);

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
                    className={`calendar-day-btn ${!day.isCurrentMonth ? 'other-month' : ''
                      } ${isSelected ? 'selected' : ''} ${isToday ? 'is-today' : ''}`}
                    title={`${day.dateStr} (${dayActivities?.total || 0} activities)`}
                  >
                    <span className="day-number">{day.dayNum}</span>
                    {dayActivities && (
                      <span className="day-indicators">
                        {dayActivities.ongoing && <span className="cell-dot dot-ongoing" />}
                        {dayActivities.upcoming && <span className="cell-dot dot-upcoming" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="calendar-legend">
              <div className="legend-item">
                <span className="cell-dot dot-ongoing"></span>
                <span>Active / Ongoing Activity</span>
              </div>
              <div className="legend-item">
                <span className="cell-dot dot-upcoming"></span>
                <span>Scheduled Upcoming</span>
              </div>
              <div className="legend-item">
                <span className="legend-box today-box"></span>
                <span>Current Date</span>
              </div>
            </div>
          </div>

          {/* Right Column: Activities Cards Stream */}
          <div className="activities-stream-card">
            <div className="stream-header">
              <div className="stream-header-info">
                <h3>Regional Agricultural Docket</h3>
                <span className="stream-count-tag">
                  {filteredActivities.length} {filteredActivities.length === 1 ? 'Activity' : 'Activities'}
                </span>
              </div>
              {canAlter && (
                <span className="authorized-badge">
                  <ShieldCheck size={13} />
                  <span>Editor Mode Active</span>
                </span>
              )}
            </div>

            {filteredActivities.length === 0 ? (
              <div className="empty-activities-state">
                <CalendarDays size={40} className="empty-state-icon" />
                <h4>No regional activities found</h4>
                <p>
                  There are no scheduled activities matching your current filter criteria ({selectedProvince}, {statusFilter}).
                </p>
                <button
                  type="button"
                  onClick={() => { setSelectedProvince('All Provinces'); setStatusFilter('all'); setSelectedDate(null); }}
                  className="button button-outline"
                  style={{ marginTop: 12 }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="activities-cards-scroll">
                {filteredActivities.map((act) => {
                  const isOngoing = act.status === 'ongoing';
                  const isUpcoming = act.status === 'upcoming';

                  return (
                    <article
                      key={act.id}
                      className={`regional-activity-card ${isOngoing ? 'card-ongoing' : ''}`}
                    >
                      <div className="card-top-row">
                        <div className="card-badges">
                          <span className={`status-badge-chip ${act.status}`}>
                            {isOngoing && <span className="live-dot" />}
                            {act.status.toUpperCase()}
                          </span>
                          {act.id?.startsWith('act-prog-') && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: '#fef3c7',
                                color: '#92400e',
                                fontSize: 10.5,
                                fontWeight: 750,
                                border: '1px solid #fde68a',
                              }}
                            >
                              <Wheat size={11} />
                              BANNER PROGRAM
                            </span>
                          )}
                          <span className="category-chip">
                            <Tag size={12} />
                            {act.category}
                          </span>
                        </div>
                        <span className="province-pill">
                          <MapPin size={12} />
                          {act.province}
                        </span>
                      </div>

                      <h4
                        className="activity-card-title"
                        onClick={() => setActiveModalActivity(act)}
                        role="button"
                        tabIndex={0}
                      >
                        {act.title}
                      </h4>

                      {act.description && (
                        <p className="activity-card-desc">{act.description}</p>
                      )}

                      <div className="activity-details-row">
                        <div className="detail-item">
                          <MapPin size={14} className="detail-icon" />
                          <span>{act.location_details}</span>
                        </div>
                        <div className="detail-item">
                          <Clock size={14} className="detail-icon" />
                          <span>
                            {act.start_date}
                            {act.end_date && act.end_date !== act.start_date ? ` to ${act.end_date}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="card-footer-actions">
                        <button
                          type="button"
                          onClick={() => setActiveModalActivity(act)}
                          className="view-details-btn"
                        >
                          <span>View Details</span>
                          <ArrowRight size={13} />
                        </button>

                        {/* Administrative Alteration Controls */}
                        {canAlter && (
                          <div className="admin-quick-actions">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(act)}
                              className="admin-icon-btn edit"
                              title="Edit this activity"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteActivity(act.id)}
                              className="admin-icon-btn delete"
                              title="Delete this activity"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
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
