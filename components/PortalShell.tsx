'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import PortalSidebar from './PortalSidebar';
import PortalTopBar from './PortalTopBar';
import Footer from './Footer';
import ModuleAccessGuard from './ModuleAccessGuard';

interface PortalShellProps {
  children: React.ReactNode;
}

function getModuleForPath(pathname: string): { id: string; number: string; title: string; desc: string } | null {
  if (pathname.startsWith('/admin')) {
    return {
      id: 'mod-admin',
      number: 'Module 05',
      title: 'Super Admin Suite',
      desc: 'Administrative security controls, staff profiles, and account management.',
    };
  }
  if (
    pathname.startsWith('/rice/balances') ||
    pathname.startsWith('/rice/reports')
  ) {
    return {
      id: 'mod-finance',
      number: 'Module 04',
      title: 'Financial Management',
      desc: 'Government obligation budget, financial category reports, and fund balances.',
    };
  }
  if (
    pathname.startsWith('/commodity-claims') ||
    pathname.startsWith('/rice/commodity-claims') ||
    pathname.startsWith('/rice/farmers')
  ) {
    return {
      id: 'mod-beneficiary',
      number: 'Module 03',
      title: 'Beneficiaries & Field Operations',
      desc: 'RSBSA farmer registry and commodity voucher distributions.',
    };
  }
  if (
    pathname.startsWith('/rice/programs') ||
    pathname.startsWith('/rice/physical') ||
    pathname === '/rice'
  ) {
    return {
      id: 'mod-rice',
      number: 'Module 02',
      title: 'Rice Program Operations',
      desc: 'Official rice coordinating unit operations and active program registers.',
    };
  }
  return null; // Public / General pages: Module 01 (Home, About, etc.)
}

export default function PortalShell({ children }: PortalShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentAccount, setCurrentAccount] = useState<any>(null);
  const pathname = usePathname();

  // Load saved minimize preference from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('da_sidebar_minimized');
      if (saved === 'true') {
        setIsCollapsed(true);
      }
    } catch (e) {
      // localStorage unavailable or restricted
    }
  }, []);

  // Fetch current user and authoritative permissions
  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setCurrentUser(data.user);
            setCurrentAccount(data.account);
            return;
          }
        }
        setCurrentUser(null);
        setCurrentAccount(null);
      } catch (e) {
        console.error('Error fetching auth in PortalShell:', e);
      }
    };

    fetchAuth();

    const handlePermissionsUpdated = () => {
      fetchAuth();
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'da_permissions_ts') {
        fetchAuth();
      }
    };
    window.addEventListener('da_permissions_updated', handlePermissionsUpdated);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handlePermissionsUpdated);

    return () => {
      window.removeEventListener('da_permissions_updated', handlePermissionsUpdated);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handlePermissionsUpdated);
    };
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('da_sidebar_minimized', String(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  // Keyboard shortcut: Ctrl+B / Cmd+B to toggle sidebar minimize
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          handleToggleCollapse();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // When signing in or registering, the sidebar should not be visible
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/auth');

  if (isAuthPage) {
    return (
      <div className="portal-auth-shell">
        <main id="main-content" className="portal-auth-main">
          {children}
        </main>
      </div>
    );
  }

  // Evaluate module access restrictions for logged-in personnel
  const activeUser = currentUser || currentAccount;
  const activeEmail = currentUser?.email || currentAccount?.email || '';
  const userRole = (currentAccount?.role || currentUser?.user_metadata?.role || 'visitor').toLowerCase();
  const isSuperAdmin =
    userRole === 'super_admin' ||
    activeEmail === 'super.admin@car.da.gov.ph';
  const isSuperAdminOrAdmin =
    ['super_admin', 'admin'].includes(userRole) ||
    activeEmail === 'super.admin@car.da.gov.ph' ||
    activeEmail === 'admin@car.da.gov.ph';
  const targetModule = getModuleForPath(pathname);

  let accessBlockedNode: React.ReactNode = null;

  if (activeUser && targetModule) {
    // 1. Check if user is suspended
    if (currentAccount?.status === 'suspended') {
      accessBlockedNode = (
        <ModuleAccessGuard
          type="suspended"
          userEmail={activeEmail}
          userName={currentAccount?.full_name || activeEmail}
          userRole={userRole}
          moduleInfo={targetModule}
        />
      );
    }
    // 2. Module 05 is Admin/Super Admin only
    else if (targetModule.id === 'mod-admin' && !isSuperAdminOrAdmin) {
      accessBlockedNode = (
        <ModuleAccessGuard
          type="admin_only"
          userEmail={activeEmail}
          userName={currentAccount?.full_name || activeEmail}
          userRole={userRole}
          moduleInfo={targetModule}
        />
      );
    }
    // 3. Granular module limits set by Super Admin for personnel (staff, officer, admin)
    else if (!isSuperAdmin) {
      const allowed = Array.isArray(currentAccount?.allowed_modules)
        ? currentAccount.allowed_modules
        : ['mod-general'];
      if (!allowed.includes(targetModule.id)) {
        accessBlockedNode = (
          <ModuleAccessGuard
            type="restricted"
            userEmail={activeEmail}
            userName={currentAccount?.full_name || activeEmail}
            userRole={userRole}
            moduleInfo={targetModule}
            allowedModules={allowed}
          />
        );
      }
    }
  }

  return (
    <div className={`portal-shell ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Left-docked Modular Sidebar */}
      <PortalSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Mobile Drawer Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content Area */}
      <div className="portal-main-wrapper">
        <PortalTopBar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        <main id="main-content" className="portal-content-body">
          {accessBlockedNode || children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
