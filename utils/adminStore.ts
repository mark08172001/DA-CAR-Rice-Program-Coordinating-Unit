import fs from 'fs';
import path from 'path';

export interface UserPermissions {
  can_add_activities?: boolean;        // Power to add, edit, or delete regional calendar activities
  can_edit_budget?: boolean;           // Power to modify obligations and financial ledger
  can_import_beneficiaries?: boolean;  // Power to import RSBSA farmers and alter registry
  can_manage_claims?: boolean;         // Power to verify and certify commodity claims
  can_delete_programs?: boolean;       // Power to delete rice banner programs/interventions under /rice/programs
  can_edit_programs?: boolean;         // Power to edit rice banner programs/interventions under /rice/programs
}

export interface UserAccount {
  id: string;
  email: string;
  full_name: string;
  department: string;
  role: 'super_admin' | 'admin' | 'officer' | 'staff';
  status: 'active' | 'restricted' | 'suspended' | 'pending_approval';
  allowed_modules: string[]; // 'mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance'
  permissions?: UserPermissions;
  last_sign_in_at: string | null;
  login_count: number;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export function getDefaultPermissionsForRole(role: string): UserPermissions {
  if (role === 'super_admin' || role === 'admin') {
    return {
      can_add_activities: true,
      can_edit_budget: true,
      can_import_beneficiaries: true,
      can_manage_claims: true,
      can_delete_programs: true,
      can_edit_programs: true,
    };
  }
  if (role === 'officer') {
    return {
      can_add_activities: true,
      can_edit_budget: false,
      can_import_beneficiaries: true,
      can_manage_claims: true,
      can_delete_programs: true,
      can_edit_programs: true,
    };
  }
  // staff
  return {
    can_add_activities: true,
    can_edit_budget: false,
    can_import_beneficiaries: false,
    can_manage_claims: false,
    can_delete_programs: false,
    can_edit_programs: false,
  };
}

export function getEffectivePermissions(account: UserAccount | null | undefined): UserPermissions {
  if (!account || account.status === 'suspended') {
    return {
      can_add_activities: false,
      can_edit_budget: false,
      can_import_beneficiaries: false,
      can_manage_claims: false,
      can_delete_programs: false,
      can_edit_programs: false,
    };
  }
  const defaults = getDefaultPermissionsForRole(account.role);
  return {
    can_add_activities: account.permissions?.can_add_activities ?? defaults.can_add_activities,
    can_edit_budget: account.permissions?.can_edit_budget ?? defaults.can_edit_budget,
    can_import_beneficiaries: account.permissions?.can_import_beneficiaries ?? defaults.can_import_beneficiaries,
    can_manage_claims: account.permissions?.can_manage_claims ?? defaults.can_manage_claims,
    can_delete_programs: account.permissions?.can_delete_programs ?? defaults.can_delete_programs,
    can_edit_programs: account.permissions?.can_edit_programs ?? defaults.can_edit_programs,
  };
}

export interface LoginLogEntry {
  id: string;
  timestamp: string;
  email: string;
  full_name: string;
  role: string;
  status: 'SUCCESS' | 'RESTRICTED' | 'FAILED' | 'PENDING_APPROVAL';
  ip_address: string;
  user_agent: string;
  location: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  actor_role: string;
  action_type:
    | 'ACCESS_RESTRICTED'
    | 'ACCESS_GRANTED'
    | 'ROLE_CHANGED'
    | 'ACCOUNT_SUSPENDED'
    | 'ACCOUNT_ACTIVATED'
    | 'ACCOUNT_APPROVED'
    | 'BUDGET_MODIFIED'
    | 'VOUCHER_VERIFIED'
    | 'AUTH_LOGIN'
    | 'USER_DELETED'
    | 'SYSTEM_CONFIG';
  severity: 'INFO' | 'NOTICE' | 'SECURITY';
  target_user?: string;
  details: string;
}

interface AdminStoreData {
  accounts: UserAccount[];
  login_logs: LoginLogEntry[];
  audit_logs: AuditLogEntry[];
  deleted_emails?: string[];
}

function getDataPaths() {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production';
  const localDir = path.join(process.cwd(), 'data');
  const localFile = path.join(localDir, 'admin_data.json');

  if (isServerless) {
    const tmpDir = path.join('/tmp', 'da_data');
    const tmpFile = path.join(tmpDir, 'admin_data.json');
    return { dataDir: tmpDir, dataFile: tmpFile, seedFile: localFile };
  }
  return { dataDir: localDir, dataFile: localFile, seedFile: localFile };
}

const INITIAL_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-001',
    email: 'super.admin@car.da.gov.ph',
    full_name: 'Regional Executive Director (Super Admin)',
    department: 'Office of the Regional Executive Director',
    role: 'super_admin',
    status: 'active',
    allowed_modules: ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance'],
    last_sign_in_at: '2026-10-04 12:45:22',
    login_count: 1,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-10-04T12:45:22Z',
    notes: 'Super Admin clearance. Unrestricted system-wide privileges.',
  },
];

const INITIAL_LOGIN_LOGS: LoginLogEntry[] = [
  {
    id: 'login-1001',
    timestamp: '2026-10-04 12:45:22',
    email: 'super.admin@car.da.gov.ph',
    full_name: 'Regional Executive Director (Super Admin)',
    role: 'super_admin',
    status: 'SUCCESS',
    ip_address: '120.28.184.45 (Baguio RFO)',
    user_agent: 'Chrome 130 · Windows 11',
    location: 'Baguio City, Benguet',
  },
];

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

function loadData(): AdminStoreData {
  try {
    const { dataDir, dataFile, seedFile } = getDataPaths();

    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }

    if (!fs.existsSync(dataFile)) {
      // If seed file exists (bundled in project deployment), seed the writable location
      if (fs.existsSync(seedFile)) {
        try {
          const seedContent = fs.readFileSync(seedFile, 'utf-8');
          fs.writeFileSync(dataFile, seedContent, 'utf-8');
          return JSON.parse(seedContent);
        } catch {}
      }

      const initial: AdminStoreData = {
        accounts: INITIAL_ACCOUNTS,
        login_logs: INITIAL_LOGIN_LOGS,
        audit_logs: INITIAL_AUDIT_LOGS,
      };
      try {
        fs.writeFileSync(dataFile, JSON.stringify(initial, null, 2), 'utf-8');
      } catch {}
      return initial;
    }

    const raw = fs.readFileSync(dataFile, 'utf-8');
    const parsed: AdminStoreData = JSON.parse(raw);

    // Ensure super admin account exists as baseline
    if (!parsed.accounts.some((a) => a.email.toLowerCase() === 'super.admin@car.da.gov.ph')) {
      parsed.accounts.unshift(INITIAL_ACCOUNTS[0]);
      try {
        fs.writeFileSync(dataFile, JSON.stringify(parsed, null, 2), 'utf-8');
      } catch {}
    }

    return parsed;
  } catch (e) {
    console.error('Error loading admin store:', e);
    // Try fallback to seed file directly if possible
    try {
      const seedFile = path.join(process.cwd(), 'data', 'admin_data.json');
      if (fs.existsSync(seedFile)) {
        return JSON.parse(fs.readFileSync(seedFile, 'utf-8'));
      }
    } catch {}

    return {
      accounts: INITIAL_ACCOUNTS,
      login_logs: INITIAL_LOGIN_LOGS,
      audit_logs: INITIAL_AUDIT_LOGS,
    };
  }
}

function saveData(data: AdminStoreData): void {
  try {
    const { dataDir, dataFile } = getDataPaths();
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving admin store:', e);
  }
}

export function getAccounts(): UserAccount[] {
  const data = loadData();
  return data.accounts;
}

export function getAccountByEmail(email: string): UserAccount | null {
  const accounts = getAccounts();
  const lower = email.trim().toLowerCase();
  return accounts.find((a) => a.email.toLowerCase() === lower) || null;
}

export function registerOrUpdateUser(
  email: string,
  fullName: string,
  department?: string,
  role?: 'super_admin' | 'admin' | 'officer' | 'staff',
  userId?: string,
  status?: 'active' | 'restricted' | 'suspended' | 'pending_approval'
): UserAccount {
  const data = loadData();
  const lower = email.trim().toLowerCase();

  // If this email was previously deleted, un-blacklist it so the new registration can proceed
  if (data.deleted_emails) {
    data.deleted_emails = data.deleted_emails.filter((e) => e.toLowerCase() !== lower);
  }

  const existingIndex = data.accounts.findIndex((a) => a.email.toLowerCase() === lower);

  const now = new Date().toISOString();
  if (existingIndex >= 0) {
    if (userId && (!data.accounts[existingIndex].id || data.accounts[existingIndex].id.startsWith('usr-'))) {
      data.accounts[existingIndex].id = userId;
    }
    data.accounts[existingIndex].full_name = fullName || data.accounts[existingIndex].full_name;
    data.accounts[existingIndex].department = department || data.accounts[existingIndex].department;
    if (role) data.accounts[existingIndex].role = role;
    if (status) data.accounts[existingIndex].status = status;
    data.accounts[existingIndex].updated_at = now;
    saveData(data);
    return data.accounts[existingIndex];
  }

  // Create new actual account from registration
  const isSuperAdmin = lower === 'super.admin@car.da.gov.ph';
  const newAccount: UserAccount = {
    id: userId || `usr-${Date.now().toString(36)}`,
    email: lower,
    full_name: fullName || email.split('@')[0],
    department: department || 'Rice Program Coordinating Unit',
    role: role || (isSuperAdmin ? 'super_admin' : lower.includes('admin') ? 'admin' : 'staff'),
    status: status || (isSuperAdmin ? 'active' : 'pending_approval'),
    allowed_modules: ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance'],
    last_sign_in_at: isSuperAdmin ? now.replace('T', ' ').substring(0, 19) : null,
    login_count: isSuperAdmin ? 1 : 0,
    created_at: now,
    updated_at: now,
    notes: isSuperAdmin ? 'Super Admin clearance.' : 'Awaiting Super Admin review and approval.',
  };

  data.accounts.push(newAccount);
  saveData(data);
  return newAccount;
}

export function syncProfilesFromSupabase(profiles: Array<{
  id?: string;
  email: string;
  full_name?: string;
  department?: string;
  role?: string;
  is_approved?: boolean;
  allowed_modules?: string[];
  permissions?: UserPermissions;
  status?: string;
  created_at?: string;
  updated_at?: string;
}>): void {
  if (!profiles || !Array.isArray(profiles) || profiles.length === 0) return;
  const data = loadData();
  let modified = false;

  for (const p of profiles) {
    if (!p.email) continue;
    const lower = p.email.trim().toLowerCase();

    // Never re-add or resurrect an account permanently deleted by Super Admin
    if (data.deleted_emails && data.deleted_emails.includes(lower)) {
      continue;
    }

    const existing = data.accounts.find((a) => a.email.toLowerCase() === lower);

    const mappedStatus: UserAccount['status'] = (p.status as any) || (p.is_approved === false ? 'pending_approval' : 'active');
    const mappedRole = (['super_admin', 'admin', 'officer', 'staff'].includes(p.role || '') ? p.role : 'staff') as any;

    if (existing) {
      if (p.id && existing.id !== p.id) {
        existing.id = p.id;
        modified = true;
      }
      if (p.full_name && existing.full_name !== p.full_name) {
        existing.full_name = p.full_name;
        modified = true;
      }
      if (p.department && existing.department !== p.department) {
        existing.department = p.department;
        modified = true;
      }
      if (p.role && existing.role !== p.role) {
        existing.role = mappedRole;
        modified = true;
      }
      if (p.allowed_modules && Array.isArray(p.allowed_modules) && p.allowed_modules.length > 0) {
        existing.allowed_modules = p.allowed_modules;
        modified = true;
      }
      if (p.permissions && typeof p.permissions === 'object') {
        existing.permissions = { ...existing.permissions, ...p.permissions };
        modified = true;
      }
      if (p.status && existing.status !== p.status) {
        existing.status = p.status as any;
        modified = true;
      } else if (p.is_approved !== undefined && existing.status !== 'suspended' && existing.status !== 'restricted') {
        if (existing.status !== mappedStatus) {
          existing.status = mappedStatus;
          modified = true;
        }
      }
    } else {
      const allowedMods = p.allowed_modules && Array.isArray(p.allowed_modules) && p.allowed_modules.length > 0
        ? p.allowed_modules
        : (mappedRole === 'super_admin' || mappedRole === 'admin'
            ? ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance', 'mod-admin']
            : (mappedRole === 'officer' ? ['mod-general', 'mod-rice', 'mod-beneficiary'] : ['mod-general']));

      data.accounts.push({
        id: p.id || `usr-${Date.now().toString(36)}`,
        email: lower,
        full_name: p.full_name || lower.split('@')[0],
        department: p.department || 'Rice Program Coordinating Unit',
        role: mappedRole,
        status: mappedStatus,
        allowed_modules: allowedMods,
        permissions: p.permissions || getDefaultPermissionsForRole(mappedRole),
        last_sign_in_at: null,
        login_count: 0,
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString(),
        notes: p.is_approved === false ? 'Awaiting Super Admin review and approval.' : 'Active personnel account.',
      });
      modified = true;
    }
  }

  if (modified) {
    saveData(data);
  }
}

/**
 * Real-time authoritative access resolver that checks Supabase first (cloud Postgres),
 * ensuring module access limits work accurately in serverless environments like Vercel.
 */
export async function getAuthoritativeUserAccess(
  email: string | null | undefined,
  supabaseClient?: any
): Promise<{
  role: string;
  status: string;
  allowed_modules: string[];
  permissions: UserPermissions;
  fullName: string;
  department: string;
  isSuperAdmin: boolean;
}> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const isSuper = cleanEmail === 'super.admin@car.da.gov.ph';

  if (!cleanEmail) {
    return {
      role: 'visitor',
      status: 'active',
      allowed_modules: ['mod-general'],
      permissions: getDefaultPermissionsForRole('visitor'),
      fullName: 'Guest',
      department: 'Public Visitor',
      isSuperAdmin: false,
    };
  }

  if (isSuper) {
    return {
      role: 'super_admin',
      status: 'active',
      allowed_modules: ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance', 'mod-admin'],
      permissions: getDefaultPermissionsForRole('super_admin'),
      fullName: 'Regional Executive Director (Super Admin)',
      department: 'Office of the Regional Executive Director',
      isSuperAdmin: true,
    };
  }

  // 1. Try querying Supabase profiles table directly for live cloud state
  if (supabaseClient) {
    try {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profile) {
        const role = (profile.role || 'staff').toLowerCase();
        const isProfileSuper = role === 'super_admin' || role === 'admin';
        const status = profile.status || (profile.is_approved === false ? 'pending_approval' : 'active');

        // Check if allowed_modules is stored in Supabase
        let allowed: string[] | null = Array.isArray(profile.allowed_modules) && profile.allowed_modules.length > 0
          ? profile.allowed_modules
          : null;

        // If not stored in Supabase columns, fallback to local/tmp store
        const local = getAccountByEmail(cleanEmail);
        if (!allowed && local?.allowed_modules && local.allowed_modules.length > 0) {
          allowed = local.allowed_modules;
        }
        if (!allowed) {
          allowed = isProfileSuper
            ? ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance', 'mod-admin']
            : (role === 'officer' ? ['mod-general', 'mod-rice', 'mod-beneficiary'] : ['mod-general']);
        }

        const perms = profile.permissions && typeof profile.permissions === 'object'
          ? profile.permissions
          : (local?.permissions ? getEffectivePermissions(local) : getDefaultPermissionsForRole(role));

        return {
          role,
          status,
          allowed_modules: allowed,
          permissions: perms,
          fullName: profile.full_name || local?.full_name || cleanEmail.split('@')[0],
          department: profile.department || local?.department || 'Rice Program Coordinating Unit',
          isSuperAdmin: isProfileSuper,
        };
      }
    } catch (e) {
      console.warn('Note querying authoritative access from Supabase:', e);
    }
  }

  // 2. Fallback to local adminStore
  const localAccount = getAccountByEmail(cleanEmail);
  if (localAccount) {
    const role = (localAccount.role || 'staff').toLowerCase();
    const isLocalSuper = role === 'super_admin' || role === 'admin';
    return {
      role,
      status: localAccount.status,
      allowed_modules: isLocalSuper
        ? ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance', 'mod-admin']
        : (localAccount.allowed_modules || ['mod-general']),
      permissions: getEffectivePermissions(localAccount),
      fullName: localAccount.full_name,
      department: localAccount.department,
      isSuperAdmin: isLocalSuper,
    };
  }

  // 3. Fallback default
  return {
    role: 'staff',
    status: 'active',
    allowed_modules: ['mod-general'],
    permissions: getDefaultPermissionsForRole('staff'),
    fullName: cleanEmail.split('@')[0],
    department: 'Rice Program Coordinating Unit',
    isSuperAdmin: false,
  };
}

export function updateStaffAccessBySuperAdmin(
  targetEmail: string,
  updates: {
    role?: 'super_admin' | 'admin' | 'officer' | 'staff';
    status?: 'active' | 'restricted' | 'suspended' | 'pending_approval';
    allowed_modules?: string[];
    permissions?: UserPermissions;
    notes?: string;
  },
  actorEmail: string
): { success: boolean; account?: UserAccount; error?: string } {
  const data = loadData();
  const lowerTarget = targetEmail.trim().toLowerCase();
  const account = data.accounts.find((a) => a.email.toLowerCase() === lowerTarget);

  if (!account) {
    return { success: false, error: 'User account not found' };
  }

  const previousStatus = account.status;
  const previousRole = account.role;

  if (updates.role) account.role = updates.role;
  if (updates.status) account.status = updates.status;
  if (updates.allowed_modules) account.allowed_modules = updates.allowed_modules;
  if (updates.permissions) {
    const isRoleChanged = Boolean(updates.role && updates.role !== previousRole);
    account.permissions = {
      ...getDefaultPermissionsForRole(account.role),
      ...(isRoleChanged ? {} : (account.permissions || {})),
      ...updates.permissions,
    };
  }
  if (updates.notes !== undefined) account.notes = updates.notes;
  account.updated_at = new Date().toISOString();

  // Record into Audit Log
  const wasPending = previousStatus === 'pending_approval';
  const isNowActive = updates.status === 'active';
  const actionType: AuditLogEntry['action_type'] =
    wasPending && isNowActive
      ? 'ACCOUNT_APPROVED'
      : updates.status === 'suspended'
      ? 'ACCOUNT_SUSPENDED'
      : updates.status === 'active' && previousStatus === 'suspended'
      ? 'ACCOUNT_ACTIVATED'
      : 'ACCESS_RESTRICTED';

  const details =
    wasPending && isNowActive
      ? `Super Admin (${actorEmail}) officially reviewed and approved registration for ${account.full_name} (${account.email}). Status changed to ACTIVE.`
      : `Super Admin (${actorEmail}) updated permissions for ${account.full_name} (${account.email}): Role: ${previousRole} -> ${account.role}, Status: ${previousStatus} -> ${account.status}, Allowed Modules: [${account.allowed_modules.join(', ')}], Powers: [activities:${account.permissions?.can_add_activities !== false}, budget:${account.permissions?.can_edit_budget === true}, import:${account.permissions?.can_import_beneficiaries !== false}, claims:${account.permissions?.can_manage_claims !== false}, delete_prog:${account.permissions?.can_delete_programs === true}, edit_prog:${account.permissions?.can_edit_programs !== false}].`;

  data.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    actor: actorEmail,
    actor_role: 'SUPER_ADMIN',
    action_type: actionType,
    target_user: account.email,
    severity: wasPending && isNowActive ? 'NOTICE' : updates.status === 'suspended' ? 'SECURITY' : 'INFO',
    details,
  });

  saveData(data);
  return { success: true, account };
}

export function deleteAccountBySuperAdmin(
  targetEmail: string,
  actorEmail: string
): { success: boolean; deletedAccount?: UserAccount; error?: string } {
  const data = loadData();
  const lowerTarget = targetEmail.trim().toLowerCase();

  // Protect the primary Super Admin account
  if (lowerTarget === 'super.admin@car.da.gov.ph') {
    return { success: false, error: 'Cannot delete the primary Regional Executive Director (Super Admin) account.' };
  }

  if (lowerTarget === actorEmail.trim().toLowerCase()) {
    return { success: false, error: 'You cannot delete your own active administrator account.' };
  }

  const accountIndex = data.accounts.findIndex((a) => a.email.toLowerCase() === lowerTarget);
  if (accountIndex === -1) {
    return { success: false, error: 'User account not found.' };
  }

  const [deleted] = data.accounts.splice(accountIndex, 1);
  if (!data.deleted_emails) data.deleted_emails = [];
  if (!data.deleted_emails.includes(lowerTarget)) {
    data.deleted_emails.push(lowerTarget);
  }

  // Record into Audit Log
  const details = `Super Admin (${actorEmail}) permanently deleted personnel account: ${deleted.full_name} (${deleted.email}, Role: ${deleted.role.toUpperCase()}, Department: ${deleted.department}).`;

  data.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    actor: actorEmail,
    actor_role: 'SUPER_ADMIN',
    action_type: 'USER_DELETED',
    target_user: deleted.email,
    severity: 'SECURITY',
    details,
  });

  saveData(data);
  return { success: true, deletedAccount: deleted };
}

export function getDeletedEmails(): string[] {
  const data = loadData();
  return data.deleted_emails || [];
}

export function isAccountDeleted(email: string): boolean {
  const data = loadData();
  const lower = (email || '').trim().toLowerCase();
  return Boolean(data.deleted_emails && data.deleted_emails.includes(lower));
}

export function recordUserLogin(
  email: string,
  fullName: string,
  role: string,
  ipAddress: string,
  userAgent: string,
  location: string = 'Cordillera Regional Office'
): { status: 'SUCCESS' | 'RESTRICTED' | 'SUSPENDED' | 'PENDING_APPROVAL' | 'DELETED'; allowed_modules: string[] } {
  const data = loadData();
  const lower = email.trim().toLowerCase();

  const now = new Date().toISOString();
  const nowFormatted = now.replace('T', ' ').substring(0, 19);

  // Check if this account was deleted by Super Admin
  if (data.deleted_emails && data.deleted_emails.includes(lower)) {
    data.login_logs.unshift({
      id: `login-${Date.now()}`,
      timestamp: nowFormatted,
      email: lower,
      full_name: fullName || lower.split('@')[0],
      role: 'staff',
      status: 'FAILED',
      ip_address: ipAddress || '120.28.184.45 (Baguio RFO)',
      user_agent: userAgent || 'Web Browser',
      location,
    });
    if (data.login_logs.length > 200) data.login_logs = data.login_logs.slice(0, 200);
    saveData(data);

    return {
      status: 'DELETED',
      allowed_modules: [],
    };
  }

  let account = data.accounts.find((a) => a.email.toLowerCase() === lower);

  if (!account) {
    // Register if newly signed up user
    const isSuperAdmin = lower === 'super.admin@car.da.gov.ph';
    account = {
      id: `usr-${Date.now().toString(36)}`,
      email: lower,
      full_name: fullName || email.split('@')[0],
      department: 'Rice Program Coordinating Unit',
      role: (role as any) || 'staff',
      status: isSuperAdmin ? 'active' : 'pending_approval',
      allowed_modules: ['mod-general', 'mod-rice', 'mod-beneficiary', 'mod-finance'],
      last_sign_in_at: isSuperAdmin ? nowFormatted : null,
      login_count: isSuperAdmin ? 1 : 0,
      created_at: now,
      updated_at: now,
      notes: isSuperAdmin ? 'Super Admin clearance.' : 'Awaiting Super Admin review and approval.',
    };
    data.accounts.push(account);
  }

  // Handle pending approval accounts
  if (account.status === 'pending_approval') {
    data.login_logs.unshift({
      id: `login-${Date.now()}`,
      timestamp: nowFormatted,
      email: account.email,
      full_name: account.full_name,
      role: account.role,
      status: 'PENDING_APPROVAL',
      ip_address: ipAddress || '120.28.184.45 (Baguio RFO)',
      user_agent: userAgent || 'Web Browser',
      location,
    });

    if (data.login_logs.length > 200) data.login_logs = data.login_logs.slice(0, 200);
    saveData(data);

    return {
      status: 'PENDING_APPROVAL',
      allowed_modules: [],
    };
  }

  // If approved (active or restricted or suspended)
  account.last_sign_in_at = nowFormatted;
  account.login_count = (account.login_count || 0) + 1;
  account.updated_at = now;

  const logStatus =
    account.status === 'suspended'
      ? 'FAILED'
      : account.status === 'restricted'
      ? 'RESTRICTED'
      : 'SUCCESS';

  data.login_logs.unshift({
    id: `login-${Date.now()}`,
    timestamp: nowFormatted,
    email: account.email,
    full_name: account.full_name,
    role: account.role,
    status: logStatus === 'FAILED' ? 'FAILED' : logStatus === 'RESTRICTED' ? 'RESTRICTED' : 'SUCCESS',
    ip_address: ipAddress || '120.28.184.45 (Baguio RFO)',
    user_agent: userAgent || 'Web Browser',
    location,
  });

  // Keep max 200 logs
  if (data.login_logs.length > 200) data.login_logs = data.login_logs.slice(0, 200);
  if (data.audit_logs.length > 200) data.audit_logs = data.audit_logs.slice(0, 200);

  saveData(data);

  return {
    status: account.status === 'suspended' ? 'SUSPENDED' : account.status === 'restricted' ? 'RESTRICTED' : 'SUCCESS',
    allowed_modules: account.allowed_modules,
  };
}

export function getLoginLogs(): LoginLogEntry[] {
  const data = loadData();
  return data.login_logs;
}

export function getAuditLogs(): AuditLogEntry[] {
  const data = loadData();
  return data.audit_logs;
}

export function recordGenericAuditLog(
  actor: string,
  actorRole: string,
  actionType: AuditLogEntry['action_type'],
  severity: AuditLogEntry['severity'],
  details: string,
  targetUser?: string
): void {
  const data = loadData();
  data.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    actor,
    actor_role: actorRole,
    action_type: actionType,
    severity,
    target_user: targetUser,
    details,
  });
  if (data.audit_logs.length > 200) data.audit_logs = data.audit_logs.slice(0, 200);
  saveData(data);
}

export function clearAuditLogs(): void {
  const data = loadData();
  data.audit_logs = [];
  saveData(data);
}

export function clearLoginLogs(): void {
  const data = loadData();
  data.login_logs = [];
  saveData(data);
}
