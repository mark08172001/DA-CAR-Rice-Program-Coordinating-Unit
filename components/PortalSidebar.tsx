'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Calendar,
  Info,
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
  Truck
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
}

interface NavModule {
  id: string;
  moduleNumber: string;
  title: string;
  description: string;
  items: NavItem[];
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

  // Module accordion state: ALL modules are closed by default when opening the website
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  // Sub-items dropdown state (e.g. Physical -> DS Distribution)
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    '/rice/physical': true,
  });

  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

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

  // Modules Definition
  const modules: NavModule[] = [
    {
      id: 'mod-general',
      moduleNumber: 'Module 01',
      title: 'Home',
      description: 'Core agency directory & calendar',
      items: [
        { label: 'Portal Home', href: '/', icon: Home },
        { label: 'Field Event Calendar', href: '/#event-calendar', icon: Calendar, badge: 'Live', badgeType: 'green' },
        { label: 'About Coordinating Unit', href: '/about', icon: Info },
      ],
    },
    {
      id: 'mod-rice',
      moduleNumber: 'Module 02',
      title: 'Physical & Programs',
      description: 'Target KPIs & operational programs',
      items: [
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
        { label: 'Programs', href: '/rice/programs', icon: Wheat },
      ],
    },
    {
      id: 'mod-beneficiary',
      moduleNumber: 'Module 03',
      title: 'Beneficiaries & Field',
      description: 'Farmers & voucher distributions',
      items: [
        { label: 'Beneficiary Directory', href: '/rice/farmers', icon: Users },
        { label: 'Commodity Claims', href: '/commodity-claims', icon: Package },
      ],
    },
    {
      id: 'mod-finance',
      moduleNumber: 'Module 04',
      title: 'Financial Management',
      description: 'Obligation budget & financial reports',
      items: [
        { label: 'Obligation & Disbursement', href: '/rice/balances', icon: Coins },
        { label: 'Financial Reports', href: '/rice/reports', icon: FileText },
      ],
    },
    {
      id: 'mod-admin',
      moduleNumber: 'Module 05',
      title: 'Super Admin',
      description: 'Access limits & staff profiles',
      items: [
        { label: 'Staff Access Control', href: '/admin/users', icon: Users, badge: 'Access Limits', badgeType: 'gold' },
        { label: 'Profile Database', href: '/admin/profiles', icon: UserCheck, badge: 'Profiles DB', badgeType: 'green' },
      ],
    },
  ];

  const userRole = (profile?.role || user?.user_metadata?.role || (user?.email === 'super.admin@car.da.gov.ph' ? 'super_admin' : 'staff')).toLowerCase();
  const isSuperAdmin = user && (userRole === 'super_admin' || user?.email === 'super.admin@car.da.gov.ph');
  const isSuperAdminOrAdmin = user && (['super_admin', 'admin'].includes(userRole) || user?.email?.includes('admin'));

  // Determine which modules are visible based on visitor / staff access limits
  let visibleModules: NavModule[] = [];
  if (!user) {
    visibleModules = modules.filter((mod) => mod.id === 'mod-general');
  } else if (isSuperAdmin) {
    visibleModules = modules; // Super Admin sees all modules 01-06
  } else if (profile?.status === 'suspended') {
    visibleModules = []; // Suspended staff accounts have all internal module navigation revoked
  } else {
    // For regular staff / admin / officer: check allowed modules strictly configured by Super Admin
    const allowed = Array.isArray(profile?.allowed_modules)
      ? profile.allowed_modules
      : ['mod-general'];
    visibleModules = modules.filter(
      (mod) => (mod.id !== 'mod-admin' || isSuperAdminOrAdmin) && (mod.id === 'mod-general' || allowed.includes(mod.id))
    );
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Personnel';
  const roleName = userRole.toUpperCase().replace('_', ' ');

  return (
    <aside
      className={`portal-sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'minimized' : ''}`}
      aria-label="Portal Module Navigation"
    >
      {/* Sidebar Header Brand */}
      <div className="sidebar-brand-box">
        <Link href="/" className="sidebar-brand" onClick={onClose} title="DA-CAR Integrated Portal">
          <span className="sidebar-seal-wrapper">
            <img
              src="/da-seal.svg"
              alt="Department of Agriculture Seal"
              width={isCollapsed ? 36 : 46}
              height={isCollapsed ? 36 : 46}
            />
          </span>
          {!isCollapsed && (
            <div className="sidebar-brand-text">
              <span className="sidebar-republic">Republic of the Philippines</span>
              <strong>Rice Program Coordinating Unit</strong>
              <span className="sidebar-portal-tag">Integrated Portal</span>
            </div>
          )}
        </Link>

        {/* Desktop Minimize Toggle Button */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="sidebar-minimize-btn"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
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

      {/* Module Overview Indicator */}
      {!isCollapsed && (
        <div className="sidebar-kpi-pill">
          <span className="sidebar-live-dot"></span>
          <span>Cordillera Administrative Region</span>
        </div>
      )}

      {/* Navigation Modules List */}
      <div className="sidebar-modules-scroll">
        {visibleModules.map((mod) => {
          const isModuleOpen = !!openModules[mod.id];
          const hasActiveChild = mod.items.some((item) => {
            if (item.href === '/') return pathname === '/';
            if (item.href.includes('#')) {
              const base = item.href.split('#')[0];
              return pathname === (base || '/');
            }
            return pathname === item.href || pathname.startsWith(item.href + '/');
          });

          return (
            <section
              key={mod.id}
              className={`module-section ${hasActiveChild ? 'module-active' : ''}`}
              title={isCollapsed ? `${mod.moduleNumber}: ${mod.title}` : undefined}
            >
              {/* Module Header Button (Collapsible on full sidebar) */}
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleModule(mod.id)}
                  className="module-header-btn"
                  aria-expanded={isModuleOpen}
                >
                  <div className="module-title-col">
                    <span className="module-code">{mod.moduleNumber}</span>
                    <h3 className="module-heading">{mod.title}</h3>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`module-chevron ${!isModuleOpen ? 'collapsed' : ''}`}
                  />
                </button>
              ) : null}

              {/* Module Navigation Items */}
              {(isModuleOpen || isCollapsed) && (
                <nav className="module-nav-list" aria-label={mod.title}>
                  {mod.items.map((item) => {
                    const IconComponent = item.icon;
                    let isActive = false;
                    if (item.href === '/') {
                      isActive = pathname === '/';
                    } else if (item.href === '/rice') {
                      isActive = pathname === '/rice';
                    } else if (item.href.includes('#')) {
                      const base = item.href.split('#')[0];
                      isActive = pathname === (base || '/');
                    } else {
                      isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    }

                    const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
                    const isSubOpen = Boolean(openSubMenus[item.href]);

                    return (
                      <div key={item.label} className="module-item-group">
                        <Link
                          href={item.href}
                          onClick={(e) => {
                            if (hasSubItems) {
                              // If clicked on collapsed sidebar, just navigate; on full sidebar, keep dropdown open
                              setOpenSubMenus((prev) => ({
                                ...prev,
                                [item.href]: true,
                              }));
                            }
                            onClose();
                          }}
                          className={`module-link ${isActive ? 'active' : ''}`}
                          title={item.label}
                        >
                          <span className="module-link-left">
                            <IconComponent size={isCollapsed ? 18 : 16} className="module-link-icon" />
                            {!isCollapsed && <span className="module-link-title">{item.label}</span>}
                          </span>

                          {!isCollapsed && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {item.badge && (
                                <span className={`module-badge badge-${item.badgeType || 'muted'}`}>
                                  {item.badge}
                                </span>
                              )}
                              {hasSubItems && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleSubMenu(item.href, e)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '2px 4px',
                                    borderRadius: 3,
                                  }}
                                  aria-label={`Toggle ${item.label} sub-items`}
                                >
                                  <ChevronDown
                                    size={13}
                                    style={{
                                      transform: isSubOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                                      transition: 'transform 0.2s ease',
                                    }}
                                  />
                                </button>
                              )}
                            </div>
                          )}

                          {isCollapsed && item.badge && (
                            <span className="minimized-badge-dot" title={item.badge} />
                          )}
                        </Link>

                        {/* Collapsible Sub-Items Dropdown */}
                        {hasSubItems && !isCollapsed && isSubOpen && (
                          <div className="module-subnav-list" style={{ marginTop: '2px', marginBottom: '4px' }}>
                            {item.subItems!.map((sub) => {
                              const isSubActive = pathname === sub.href;
                              return (
                                <Link
                                  key={sub.label}
                                  href={sub.href}
                                  onClick={onClose}
                                  className={`module-link ${isSubActive ? 'active' : ''} module-sublink`}
                                  title={sub.label}
                                  style={{
                                    marginLeft: '14px',
                                    paddingLeft: '8px',
                                    position: 'relative',
                                  }}
                                >
                                  <span className="module-link-left" style={{ alignItems: 'flex-start' }}>
                                    {/* Hierarchical L-shaped tree branch */}
                                    <span
                                      aria-hidden="true"
                                      style={{
                                        display: 'inline-block',
                                        width: '13px',
                                        height: '14px',
                                        borderLeft: '2.5px solid rgba(255, 255, 255, 0.75)',
                                        borderBottom: '2.5px solid rgba(255, 255, 255, 0.75)',
                                        borderBottomLeftRadius: '2px',
                                        marginRight: '6px',
                                        marginTop: '2px',
                                        flexShrink: 0,
                                      }}
                                    />
                                    <span
                                      className="module-link-title"
                                      style={{
                                        whiteSpace: 'normal',
                                        lineHeight: '1.25',
                                        fontSize: '12px',
                                        fontWeight: 500,
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
                        )}
                      </div>
                    );
                  })}
                </nav>
              )}
            </section>
          );
        })}

        {/* Informational Restricted Notice for outsiders */}
        {!user && !isCollapsed && (
          <div className="sidebar-restricted-box">
            <div className="sidebar-restricted-badge">
              <Lock size={12} />
              <span>Modules 02–05 Restricted</span>
            </div>
            <p className="sidebar-restricted-desc">
              Internal Rice Operations, Beneficiary Registry, Financial Records, and Regional Intelligence are restricted to authorized DA personnel.
            </p>
            <Link href="/login" onClick={onClose} className="sidebar-restricted-btn">
              <LogIn size={13} />
              <span>Sign In to Unlock Modules</span>
            </Link>
          </div>
        )}

        {/* Minimized icon for outsiders indicating locked modules */}
        {!user && isCollapsed && (
          <div className="minimized-lock-item" title="Modules 02–05 Restricted to DA Personnel">
            <Link href="/login" onClick={onClose} className="minimized-lock-link" title="Sign In to unlock modules">
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
              {!isCollapsed && (
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
              )}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="sidebar-signout-btn"
              title="Sign out of administrative portal"
            >
              <LogOut size={15} />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        ) : (
          <div className="sidebar-auth-actions">
            {!isCollapsed && (
              <div className="sidebar-auth-note">
                <ShieldCheck size={14} className="sidebar-shield-icon" />
                <span>Staff & Officer Portal Access</span>
              </div>
            )}
            <div className="sidebar-auth-btns">
              <Link
                href="/login"
                className="button button-primary sidebar-btn"
                onClick={onClose}
                title="Sign In"
              >
                <LogIn size={15} />
                {!isCollapsed && <span>Sign In</span>}
              </Link>
              <Link
                href="/signup"
                className="button button-light sidebar-btn sidebar-btn-outline"
                onClick={onClose}
                title="Register"
              >
                <UserPlus size={15} />
                {!isCollapsed && <span>Register</span>}
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
