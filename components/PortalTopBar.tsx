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
  let currentModuleName = 'Public Portal';
  let currentPageTitle = 'Overview';

  if (pathname === '/') {
    currentModuleName = 'Public Portal';
    currentPageTitle = 'Overview';
  } else if (pathname.startsWith('/rice/balances')) {
    currentModuleName = 'Financial Management';
    currentPageTitle = 'Obligation & Disbursement';
  } else if (pathname.startsWith('/commodity-claims') || pathname.startsWith('/rice/commodity-claims')) {
    currentModuleName = 'Beneficiaries & Field';
    currentPageTitle = 'Commodity Claims';
  } else if (pathname.startsWith('/rice/farmers')) {
    currentModuleName = 'Beneficiaries & Field';
    currentPageTitle = 'Beneficiary Directory';
  } else if (pathname.startsWith('/rice/programs')) {
    currentModuleName = 'Rice Coordinating Unit';
    currentPageTitle = 'Programs Register';
  } else if (pathname.startsWith('/rice/physical/ds-2026-2027-distribution-status')) {
    currentModuleName = 'Rice Coordinating Unit';
    currentPageTitle = 'DS 2026-2027 Distribution Status';
  } else if (pathname.startsWith('/rice/physical')) {
    currentModuleName = 'Rice Coordinating Unit';
    currentPageTitle = 'Physical Targets & Accomplishment';
  } else if (pathname.startsWith('/rice/reports')) {
    currentModuleName = 'Financial Management';
    currentPageTitle = 'Financial Reports';
  } else if (pathname.startsWith('/rice')) {
    currentModuleName = 'Rice Coordinating Unit';
    currentPageTitle = 'Operations Dashboard';
  } else if (pathname === '/about') {
    currentModuleName = 'Public Portal';
    currentPageTitle = 'About Coordinating Unit';
  } else if (pathname === '/provinces') {
    currentModuleName = 'Public Portal';
    currentPageTitle = 'CAR Provinces Directory';
  } else if (pathname === '/market-prices') {
    currentModuleName = 'Public Portal';
    currentPageTitle = 'Market Prices';
  } else if (pathname === '/weather') {
    currentModuleName = 'Public Portal';
    currentPageTitle = 'Agricultural Weather';
  } else if (pathname === '/login') {
    currentModuleName = 'Authentication';
    currentPageTitle = 'Staff Sign In';
  } else if (pathname === '/signup') {
    currentModuleName = 'Registration';
    currentPageTitle = 'Account Registration';
  } else if (pathname.startsWith('/admin')) {
    currentModuleName = 'Admin Suite';
    currentPageTitle = 'Super Administrator';
  }

  return (
    <header className="portal-topbar">
        <div className="portal-topbar-inner">
          {/* Left side: Hamburger (on mobile) + Breadcrumb */}
          <div className="topbar-left">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="topbar-hamburger-btn mobile-only"
              aria-label="Toggle Navigation Sidebar Drawer"
            >
              <Menu size={20} />
            </button>

            <nav className="topbar-breadcrumb" aria-label="Breadcrumb">
              <span className="breadcrumb-module">{currentModuleName}</span>
              <span className="breadcrumb-divider">/</span>
              <span className="breadcrumb-page">{currentPageTitle}</span>
            </nav>
          </div>

          {/* Right side: 'Why This Works', Live Date Pill, Staff Sign In */}
          <div className="topbar-right">

            <div className="topbar-date-pill">
              <span className="topbar-date-dot"></span>
              <span>{currentTime || 'Mon, Oct 19, 2026'}</span>
            </div>

            {user ? (
              (user.role === 'super_admin' || user.email?.includes('super.admin') || user.user_metadata?.role === 'super_admin') ? (
                <Link
                  href="/admin"
                  className="topbar-staff-btn"
                  title="Super Administrator Suite"
                >
                  <ShieldCheck size={14} style={{ color: '#4ade80' }} />
                  <span>Super Admin</span>
                  <span className="topbar-arrow">➔</span>
                </Link>
              ) : (
                <Link href="/rice" className="topbar-staff-btn" title="Operations Portal">
                  <LayoutDashboard size={14} style={{ color: '#4ade80' }} />
                  <span>Operations</span>
                  <span className="topbar-arrow">➔</span>
                </Link>
              )
            ) : (
              <Link href="/login" className="topbar-staff-btn">
                <span>Staff Sign In</span>
                <span className="topbar-arrow">➔</span>
              </Link>
            )}
          </div>
        </div>
      </header>
  );
}
