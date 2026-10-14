'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  ShieldCheck,
  Calendar,
  LogIn,
  LayoutDashboard,
  ExternalLink,
  Wheat,
  Clock
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface PortalTopBarProps {
  onToggleSidebar: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function PortalTopBar({
  onToggleSidebar,
  isCollapsed = false,
  onToggleCollapse,
}: PortalTopBarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (sbUser) {
          setUser(sbUser);
          return;
        }

        // Check for da_admin_session cookie
        const match = document.cookie.match(/(?:^|;\s*)da_admin_session=([^;]+)/);
        if (match) {
          try {
            const admin = JSON.parse(decodeURIComponent(match[1]));
            if (admin?.email) {
              setUser(admin);
            }
          } catch { }
        }
      } catch (e) {
        console.error('Error checking user in topbar:', e);
      }
    };
    checkUser();

    // Format current date in Philippine Standard Time
    const now = new Date();
    const formatted = now.toLocaleDateString('en-PH', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    setCurrentTime(formatted);
  }, []);

  // Determine current active module name based on pathname
  let currentModuleName = 'Executive Portal';
  let currentPageTitle = 'Home';

  if (pathname === '/') {
    currentModuleName = 'Module 01: General Portal';
    currentPageTitle = 'Portal';
  } else if (pathname.startsWith('/rice/balances')) {
    currentModuleName = 'Module 04: Financial Management';
    currentPageTitle = 'Obligation & Disbursement';
  } else if (pathname.startsWith('/commodity-claims') || pathname.startsWith('/rice/commodity-claims')) {
    currentModuleName = 'Module 03: Beneficiaries & Field';
    currentPageTitle = 'Commodity Claims';
  } else if (pathname.startsWith('/rice/farmers')) {
    currentModuleName = 'Module 03: Beneficiaries & Field';
    currentPageTitle = 'Beneficiary Directory';
  } else if (pathname.startsWith('/rice/programs')) {
    currentModuleName = 'Module 02: Rice Coordinating Unit';
    currentPageTitle = 'Programs Register';
  } else if (pathname.startsWith('/rice/physical')) {
    currentModuleName = 'Module 02: Rice Coordinating Unit';
    currentPageTitle = 'Physical Targets & Accomplishment';
  } else if (pathname.startsWith('/rice/reports')) {
    currentModuleName = 'Module 04: Financial Management';
    currentPageTitle = 'Financial Reports';
  } else if (pathname.startsWith('/rice')) {
    currentModuleName = 'Module 02: Rice Coordinating Unit';
    currentPageTitle = 'Operations Dashboard';
  } else if (pathname === '/about') {
    currentModuleName = 'Module 01: General Portal';
    currentPageTitle = 'About Coordinating Unit';
  } else if (pathname === '/provinces') {
    currentModuleName = 'Module 01: General Portal';
    currentPageTitle = 'CAR Provinces Directory';
  } else if (pathname === '/market-prices') {
    currentModuleName = 'Module 01: General Portal';
    currentPageTitle = 'Market Prices';
  } else if (pathname === '/weather') {
    currentModuleName = 'Module 01: General Portal';
    currentPageTitle = 'Agricultural Weather';
  } else if (pathname === '/login') {
    currentModuleName = 'Personnel Authentication';
    currentPageTitle = 'Sign In';
  } else if (pathname === '/signup') {
    currentModuleName = 'Personnel Registration';
    currentPageTitle = 'Account Registration';
  } else if (pathname.startsWith('/admin/users')) {
    currentModuleName = 'Module 05: Super Admin Suite';
    currentPageTitle = 'Staff Access Control & Accounts';
  } else if (pathname.startsWith('/admin/profiles')) {
    currentModuleName = 'Module 05: Super Admin Suite';
    currentPageTitle = 'PostgreSQL Profile Database & Users';
  } else if (pathname.startsWith('/admin')) {
    currentModuleName = 'Module 05: Super Admin Suite';
    currentPageTitle = 'Administrative Overview';
  }

  return (
    <header className="portal-topbar">
      <div className="portal-topbar-inner">
        {/* Left side: Hamburger (on mobile) + Minimize button (on desktop) + Breadcrumb title */}
        <div className="topbar-left">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="topbar-hamburger-btn mobile-only"
            aria-label="Toggle Navigation Sidebar Drawer"
          >
            <Menu size={22} />
          </button>

          <div className="topbar-breadcrumb">
            <span className="breadcrumb-module">{currentModuleName}</span>
            <span className="breadcrumb-divider">/</span>
            <strong className="breadcrumb-page">{currentPageTitle}</strong>
          </div>
        </div>

        {/* Right side: Live System Status, Date & Quick Links */}
        <div className="topbar-right">
          <div className="topbar-meta-item time-badge">
            <Clock size={13} />
            <span>{currentTime || 'October 2026'}</span>
          </div>

          <div className="topbar-meta-item status-indicator-badge">
            <span className="status-indicator-dot"></span>
            <span>DA-CAR Online</span>
          </div>

          {user ? (
            (user.role === 'super_admin' || user.email?.includes('super.admin') || user.user_metadata?.role === 'super_admin') ? (
              <Link
                href="/admin"
                className="topbar-quick-link"
                style={{
                  border: '1px solid rgba(22, 163, 74, 0.4)',
                  background: 'rgba(22, 163, 74, 0.08)',
                  color: '#166534',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                title="Super Administrator Suite"
              >
                <ShieldCheck size={14} style={{ color: '#15803d' }} />
                <span>Super Admin</span>
              </Link>
            ) : (
              <Link href="/#event-calendar" className="topbar-quick-link" title="Manage Activities">
                <Calendar size={14} />
                <span>Calendar Manager</span>
              </Link>
            )
          ) : (
            <Link href="/login" className="topbar-login-pill">
              <LogIn size={13} />
              <span>Staff Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
