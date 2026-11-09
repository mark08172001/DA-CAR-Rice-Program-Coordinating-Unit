'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Wheat,
  FileText,
  Users,
  Package,
  Coins,
  LogIn,
  LogOut,
  UserPlus,
  ShieldCheck,
  Building,
  ChevronRight,
  ChevronDown,
  Layers,
  X,
  ExternalLink,
  Sparkles,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Sliders,
  UserCheck,
  BarChart3,
  Truck,
  CreditCard,
  FileBarChart,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface PortalSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  badgeType?: 'gold' | 'green' | 'muted';
  isSubItem?: boolean;
  subItems?: NavItem[];
  requireAuth?: boolean;
  requireBeneficiary?: boolean;
  requireAdmin?: boolean;
}

export default function PortalSidebar({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Auth state
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Comprehensive Presentation Export State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportToast, setReportToast] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (isGeneratingReport) return;
    try {
      setIsGeneratingReport(true);
      const { exportComprehensiveRiceReport } = await import('@/utils/reportPresentationExport');
      const filename = await exportComprehensiveRiceReport();
      setReportToast(`Report generated: ${filename}`);
      setTimeout(() => setReportToast(null), 5000);
    } catch (err: any) {
      console.error('Error generating report from sidebar:', err);
      alert('Failed to generate report: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Sub-items dropdown state (closed by default on website load/reload)
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

  const toggleSubMenu = (itemHref: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenSubMenus((prev) => ({
      ...prev,
      [itemHref]: !prev[itemHref],
    }));
  };

  const supabase = createClient();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // 1. Fetch authoritative profile and permissions from /api/auth/me
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const authData = await res.json();
          if (authData.authenticated && authData.user) {
            setUser(authData.user);
            setProfile(authData.account);
            return;
          }
        }

        // 2. Fallback: Check Supabase directly if session exists
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (sbUser) {
          setUser(sbUser);
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sbUser.id)
            .single();
          const role = prof?.role || sbUser.user_metadata?.role || (sbUser.email === 'super.admin@car.da.gov.ph' ? 'super_admin' : 'staff');
          const isSuper = role === 'super_admin' || role === 'admin' || sbUser.email === 'super.admin@car.da.gov.ph';
          if (prof) {
            setProfile({
              full_name: prof.full_name,
              role: prof.role,
              department: prof.department,
              status: prof.is_approved ? 'active' : 'pending_approval',
              allowed_modules: isSuper
                ? ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance', 'mod-admin']
                : ['mod-general'],
            });
          } else {
            setProfile({
              full_name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0],
              role: role,
              department: sbUser.user_metadata?.department || 'Rice Program Coordinating Unit',
              status: 'active',
              allowed_modules: isSuper
                ? ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance', 'mod-admin']
                : ['mod-general'],
            });
          }
          return;
        }

        // 3. Fallback: Check for da_admin_session cookie (only if no Supabase session)
        const match = document.cookie.match(/(?:^|;\s*)da_admin_session=([^;]+)/);
        if (match) {
          try {
            const admin = JSON.parse(decodeURIComponent(match[1]));
            if (admin?.email && (admin.email === 'super.admin@car.da.gov.ph' || admin.email === 'admin@car.da.gov.ph')) {
              setUser({
                id: admin.id || 'usr-001',
                email: admin.email,
                user_metadata: {
                  full_name: admin.full_name,
                  role: admin.role,
                  department: admin.department,
                },
              } as any);
              setProfile({
                full_name: admin.full_name,
                role: admin.role,
                department: admin.department,
                status: 'active',
                allowed_modules: ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance', 'mod-admin'],
              });
            }
          } catch { }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (e) {
        console.error('Error fetching user in sidebar:', e);
      }
    };

    fetchUserData();

    // Listen for live updates triggered by Super Admin actions
    const handlePermissionsUpdated = () => {
      fetchUserData();
    };
    window.addEventListener('da_permissions_updated', handlePermissionsUpdated);
    window.addEventListener('focus', handlePermissionsUpdated);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      if (!u) {
        setUser(null);
        setProfile(null);
      } else {
        fetchUserData();
      }
    });

    return () => {
      window.removeEventListener('da_permissions_updated', handlePermissionsUpdated);
      window.removeEventListener('focus', handlePermissionsUpdated);
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch { }
    document.cookie = 'da_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0';
    setUser(null);
    setProfile(null);
    router.refresh();
    window.location.href = '/';
  };

  // Navigation Links (Clean Flat Structure)
  const navItems: NavItem[] = [
    { label: 'Financial Reports', href: '/rice/reports', icon: FileText },
    { label: 'Obligation', href: '/rice/balances', icon: Coins },
    { label: 'Disbursement', href: '/rice/disbursement', icon: CreditCard },
    {
      label: 'Physical',
      href: '/rice/physical',
      icon: BarChart3,
      subItems: [
        {
          label: 'DS 2026-2027 Distribution Status',
          href: '/rice/physical/ds-2026-2027-distribution-status',
          icon: Truck,
          isSubItem: true,
        },
      ],
    },
    { label: 'Programs', href: '/rice/programs', icon: Wheat, requireAuth: true },
    { label: 'Beneficiary Directory', href: '/rice/farmers', icon: Users, requireBeneficiary: true },
    { label: 'Commodity Claims', href: '/commodity-claims', icon: Package, requireBeneficiary: true },
    { label: 'Staff Access Control', href: '/admin/users', icon: UserCheck, requireAdmin: true },
    { label: 'Profile Database', href: '/admin/profiles', icon: Users, requireAdmin: true },
  ];

  const userRole = (profile?.role || user?.user_metadata?.role || (user?.email === 'super.admin@car.da.gov.ph' ? 'super_admin' : 'staff')).toLowerCase();
  const isSuperAdmin = Boolean(user && (userRole === 'super_admin' || user?.email === 'super.admin@car.da.gov.ph'));
  const isSuperAdminOrAdmin = Boolean(user && (['super_admin', 'admin'].includes(userRole) || user?.email?.includes('admin')));
  const allowed = Array.isArray(profile?.allowed_modules) ? profile.allowed_modules : [];
  const hasBeneficiaryAccess = isSuperAdmin || allowed.includes('mod-beneficiary');
  const isSuspended = profile?.status === 'suspended';

  const visibleNavItems = navItems.filter((item) => {
    if (isSuspended) return false;
    if (item.requireAdmin) return isSuperAdminOrAdmin;
    if (item.requireBeneficiary) return hasBeneficiaryAccess;
    if (item.requireAuth) return Boolean(user);
    return true;
  });

  const isItemActive = (href: string) => {
    if (href === '/' || href === '/rice/reports') {
      return pathname === '/' || pathname === '/rice/reports';
    }
    if (href === '/rice') {
      return pathname === '/rice';
    }
    if (href.includes('#')) {
      const base = href.split('#')[0];
      return pathname === (base || '/');
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Personnel';
  const roleName = userRole.toUpperCase().replace('_', ' ');

  return (
    <aside
      className={`portal-sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'minimized' : ''}`}
      aria-label="Portal Navigation"
    >
      {/* Sidebar Header Brand */}
      <div className="sidebar-brand-box">
        <Link href="/" className="sidebar-brand" onClick={onClose} title="DA-CAR | Rice Program Coordinating Unit">
          <span className="sidebar-seal-wrapper">
            <div className="sidebar-wheat-badge">
              <img
                src="/da-logo.png"
                alt="Department of Agriculture Seal"
                width={40}
                height={40}
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
              />
            </div>
          </span>
          <div className="sidebar-brand-text">
            <span className="sidebar-republic">REPUBLIC OF THE PHILIPPINES</span>
            <strong>DA-CAR</strong>
            <span className="sidebar-portal-tag">Rice Program Coordinating Unit</span>
          </div>
        </Link>

        {/* Desktop Minimize Toggle Button */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`sidebar-minimize-btn ${isCollapsed ? 'is-collapsed' : ''}`}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
          >
            <PanelLeftClose
              size={16}
              style={{
                transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </button>
        )}

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onClose}
          className="sidebar-close-btn"
          aria-label="Close navigation sidebar"
        >
          <X size={20} />
        </button>
      </div>



      {/* Navigation Links (Clean Flat List) */}
      <div className="sidebar-modules-scroll">
        <nav className="module-nav-list" aria-label="Portal Navigation" style={{ padding: '6px 6px 14px' }}>
          {visibleNavItems.map((item, idx) => {
            const IconComponent = item.icon;
            const isActive = isItemActive(item.href);
            const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
            const isSubOpen = Boolean(openSubMenus[item.href]);
            const isFirstAdminItem = item.requireAdmin && !visibleNavItems[idx - 1]?.requireAdmin;

            return (
              <div key={item.label} className="module-item-group">
                {isFirstAdminItem && !isCollapsed && (
                  <div
                    style={{
                      padding: '14px 10px 6px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.45)',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      marginTop: 8,
                    }}
                  >
                    Administration
                  </div>
                )}
                {isFirstAdminItem && isCollapsed && (
                  <div
                    style={{
                      height: 1,
                      background: 'rgba(255, 255, 255, 0.1)',
                      margin: '10px 4px',
                    }}
                  />
                )}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`module-link ${isActive ? 'active' : ''}`}
                    title={item.label}
                    style={{
                      flex: 1,
                      paddingRight: hasSubItems && !isCollapsed ? '34px' : undefined,
                    }}
                  >
                    <span className="module-link-left">
                      <IconComponent size={isCollapsed ? 18 : 16} className="module-link-icon" />
                      <span className="module-link-title">{item.label}</span>
                    </span>

                    {!isCollapsed && item.badge && (
                      <span className={`module-badge badge-${item.badgeType || 'muted'}`}>
                        {item.badge}
                      </span>
                    )}

                    {isCollapsed && item.badge && (
                      <span className="minimized-badge-dot" title={item.badge} />
                    )}
                  </Link>

                  {hasSubItems && !isCollapsed && (
                    <button
                      type="button"
                      onClick={(e) => toggleSubMenu(item.href, e)}
                      className={`sidebar-submenu-toggle ${isSubOpen ? 'is-open' : ''}`}
                      aria-label={`Toggle ${item.label} sub-items`}
                      title={isSubOpen ? 'Collapse sub-items' : 'Expand sub-items'}
                    >
                      <ChevronDown
                        size={14}
                        className="sidebar-chevron"
                      />
                    </button>
                  )}
                </div>

                {/* Branched Menu Sub-Items Dropdown (React Bits Effect) */}
                {hasSubItems && !isCollapsed && (
                  <div
                    className="sidebar-branched-body"
                    style={{
                      display: 'grid',
                      gridTemplateRows: isSubOpen ? '1fr' : '0fr',
                      transition: 'grid-template-rows 300ms cubic-bezier(0.23, 1, 0.32, 1)',
                      position: 'relative',
                    }}
                  >
                    <div style={{ minHeight: 0, overflow: 'hidden' }}>
                      <div
                        className="sidebar-branched-tree"
                        style={{
                          position: 'relative',
                          height: 8 + item.subItems!.length * 38,
                          padding: '4px 0',
                          boxSizing: 'border-box',
                        }}
                      >
                        <svg
                          className="sidebar-branched-lines"
                          width={40}
                          height={8 + item.subItems!.length * 38}
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            overflow: 'visible',
                            pointerEvents: 'none',
                            opacity: isSubOpen ? 1 : 0,
                            transition: 'opacity 250ms ease 80ms',
                          }}
                        >
                          {/* Trunk rail line */}
                          <path
                            d={`M 19 0 V ${4 + (item.subItems!.length - 1) * 38 + 19 - 8}`}
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.22)"
                            strokeWidth={1.75}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Branch rail curves for each child */}
                          {item.subItems!.map((_, k) => {
                            const y = 4 + k * 38 + 19;
                            return (
                              <path
                                key={`branch-${k}`}
                                d={`M 19 ${y - 8} A 8 8 0 0 0 27 ${y} H 34`}
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.22)"
                                strokeWidth={1.75}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            );
                          })}
                          {/* Animated reach accent line in DA-CAR Gold */}
                          {item.subItems!.map((sub, k) => {
                            const isSubActive = pathname === sub.href;
                            const y = 4 + k * 38 + 19;
                            const pathLen = (y - 8) + (Math.PI * 8) / 2 + (34 - 19 - 8);
                            return (
                              <path
                                key={`reach-${sub.label}`}
                                d={`M 19 0 V ${y - 8} A 8 8 0 0 0 27 ${y} H 34`}
                                fill="none"
                                stroke="#fbbf24"
                                strokeWidth={1.75}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                  strokeDasharray: pathLen,
                                  strokeDashoffset: isSubActive ? 0 : pathLen,
                                  transition: 'stroke-dashoffset 400ms cubic-bezier(0.23, 1, 0.32, 1)',
                                }}
                              />
                            );
                          })}
                        </svg>

                        {/* Child sub-item links */}
                        {item.subItems!.map((sub) => {
                          const isSubActive = pathname === sub.href;
                          const SubIcon = sub.icon;
                          return (
                            <Link
                              key={sub.label}
                              href={sub.href}
                              onClick={onClose}
                              tabIndex={isSubOpen ? 0 : -1}
                              className={`module-link ${isSubActive ? 'active' : ''} module-sublink`}
                              title={sub.label}
                              style={{
                                height: 38,
                                paddingLeft: '38px',
                                display: 'flex',
                                alignItems: 'center',
                                position: 'relative',
                                background: 'transparent',
                                border: 'none',
                                boxShadow: 'none',
                              }}
                            >
                              <span className="module-link-left" style={{ alignItems: 'center', gap: 7 }}>
                                {SubIcon && (
                                  <SubIcon
                                    size={14}
                                    style={{
                                      color: isSubActive ? '#fbbf24' : 'rgba(255, 255, 255, 0.7)',
                                      flexShrink: 0,
                                      transition: 'color 0.2s ease',
                                    }}
                                  />
                                )}
                                <span
                                  className="module-link-title"
                                  style={{
                                    whiteSpace: 'normal',
                                    lineHeight: '1.25',
                                    fontSize: '12px',
                                    fontWeight: isSubActive ? 600 : 500,
                                    color: isSubActive ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
                                  }}
                                >
                                  {sub.label === 'DS 2026-2027 Distribution Status' ? (
                                    <>
                                      <span style={{ display: 'block', fontWeight: 600 }}>DS 2026-2027</span>
                                      <span style={{ display: 'block', fontSize: '11px', opacity: 0.88 }}>Distribution status</span>
                                    </>
                                  ) : (
                                    sub.label
                                  )}
                                </span>
                              </span>

                              {sub.badge && (
                                <span className={`module-badge badge-${sub.badgeType || 'muted'}`}>
                                  {sub.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                {/* Generate Report Action Button right after the 4 Core Reporting Modules */}
                {item.href === '/rice/physical' && (
                  <div
                    key="sidebar-generate-report-item"
                    style={{
                      marginTop: isCollapsed ? 6 : 8,
                      marginBottom: isCollapsed ? 8 : 10,
                      padding: isCollapsed ? 0 : '0 2px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleGenerateReport}
                      disabled={isGeneratingReport}
                      className="sidebar-generate-report-btn"
                      title="Generate report (.pptx)"
                      aria-label="Generate report"
                    >
                      <span className="sidebar-generate-report-left">
                        {isGeneratingReport ? (
                          <Loader2 size={isCollapsed ? 18 : 16} className="spin" style={{ color: '#34d399', flexShrink: 0 }} />
                        ) : (
                          <FileBarChart size={isCollapsed ? 18 : 16} style={{ color: '#34d399', flexShrink: 0 }} />
                        )}
                        <span className="sidebar-generate-report-title">
                          {isGeneratingReport ? 'Generating report...' : 'Generate report'}
                        </span>
                      </span>
                    </button>
                    {reportToast && !isCollapsed && (
                      <div
                        style={{
                          margin: '6px 2px 0',
                          padding: '6px 8px',
                          borderRadius: 6,
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(52, 211, 153, 0.35)',
                          color: '#a7f3d0',
                          fontSize: '11px',
                          lineHeight: '1.25',
                          wordBreak: 'break-all',
                        }}
                      >
                        ✓ {reportToast}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Informational Restricted Notice for outsiders */}
        {!user && !isCollapsed && (
          <div className="sidebar-restricted-box">
            <div className="sidebar-restricted-badge">
              <Lock size={12} />
              <span>Authorized Access</span>
            </div>
            <p className="sidebar-restricted-desc">
              Rice Programs, Beneficiary Registry, and Voucher Claims are restricted to authorized DA personnel.
            </p>
            <Link href="/login" onClick={onClose} className="sidebar-restricted-btn">
              <LogIn size={13} />
              <span>Sign In to Unlock</span>
            </Link>
          </div>
        )}

        {/* Minimized icon for outsiders indicating locked items */}
        {!user && isCollapsed && (
          <div className="minimized-lock-item" title="Programs & Beneficiary Registry Restricted to Authorized DA Personnel">
            <Link href="/login" onClick={onClose} className="minimized-lock-link" title="Sign In to unlock">
              <Lock size={16} />
            </Link>
          </div>
        )}
      </div>

      {/* Sidebar Footer User / Auth Module */}
      <div className="sidebar-user-footer">
        {user ? (
          <div className="sidebar-user-card" title={isCollapsed ? `${displayName} (${roleName})` : undefined}>
            <div className="sidebar-user-info">
              <span className="sidebar-user-avatar">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <div className="sidebar-user-details">
                <strong className="sidebar-user-name">{displayName}</strong>
                <span className="sidebar-user-dept">{profile?.department || 'Rice Coordinating Unit'}</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                  <span className={`sidebar-role-tag role-${roleName.toLowerCase()}`}>{roleName}</span>
                  {profile?.status === 'restricted' && (
                    <span
                      className="sidebar-role-tag"
                      style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: 10 }}
                      title="Accessibility limited to specific modules by Super Admin"
                    >
                      RESTRICTED
                    </span>
                  )}
                  {profile?.status === 'suspended' && (
                    <span
                      className="sidebar-role-tag"
                      style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', fontSize: 10 }}
                      title="Account suspended by Super Admin"
                    >
                      SUSPENDED
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="sidebar-signout-btn"
              title="Sign out of administrative portal"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="sidebar-auth-actions">
            <div className="sidebar-auth-note">
              <ShieldCheck size={14} className="sidebar-shield-icon" />
              <span>Staff & Officer Portal Access</span>
            </div>
            <div className="sidebar-auth-btns">
              <Link
                href="/login"
                className="button button-primary sidebar-btn"
                onClick={onClose}
                title="Sign In"
              >
                <LogIn size={15} />
                <span>Sign In</span>
              </Link>
              <Link
                href="/signup"
                className="button button-light sidebar-btn sidebar-btn-outline"
                onClick={onClose}
                title="Register"
              >
                <UserPlus size={15} />
                <span>Register</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
