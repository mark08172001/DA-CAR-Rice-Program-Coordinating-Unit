'use client';

import Link from 'next/link';
import { ShieldAlert, Lock, ArrowLeft, Home, UserCheck, AlertTriangle } from 'lucide-react';

interface ModuleAccessGuardProps {
  type: 'restricted' | 'suspended' | 'admin_only';
  userEmail: string;
  userName: string;
  userRole: string;
  moduleInfo?: {
    id: string;
    number: string;
    title: string;
    desc: string;
  } | null;
  allowedModules?: string[];
}

const MODULE_LABELS: Record<string, string> = {
  'mod-general': 'Module 01: Portal & Executive',
  'mod-rice': 'Module 02: Rice Unit Operations',
  'mod-beneficiary': 'Module 03: Beneficiaries & Field',
  'mod-finance': 'Module 04: Financial Management',
  'mod-admin': 'Module 05: Super Admin Suite',
};

export default function ModuleAccessGuard({
  type,
  userEmail,
  userName,
  userRole,
  moduleInfo,
  allowedModules = [],
}: ModuleAccessGuardProps) {
  if (type === 'suspended') {
    return (
      <div className="page-container" style={{ maxWidth: 740, margin: '60px auto', padding: '0 20px' }}>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #fecaca',
            borderTop: '4px solid #dc2626',
            borderRadius: 12,
            padding: 32,
            boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.08)',
          }}
        >
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldAlert size={28} style={{ color: '#dc2626' }} />
            </div>
            <div style={{ flex: 1 }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#dc2626',
                  background: '#fef2f2',
                  padding: '3px 8px',
                  borderRadius: 4,
                  marginBottom: 8,
                }}
              >
                Super Admin Security Directive
              </span>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#991b1b', margin: '0 0 10px' }}>
                Account Access Suspended
              </h2>
              <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6, margin: '0 0 16px' }}>
                Your personnel account (<strong>{userEmail}</strong>) has been suspended by the Regional Executive
                Director (Super Admin). Access to internal operational modules is currently prohibited.
              </p>

              <div
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 20,
                  fontSize: 13,
                  color: '#6b7280',
                }}
              >
                If this suspension is in error or your authorization has been reinstated, please contact the Office of
                the Regional Executive Director (Baguio RFO Node).
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link
                  href="/"
                  className="button button-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Home size={15} /> Back to Portal Home
                </Link>
                <Link
                  href="/about"
                  className="button button-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  About Coordinating Unit
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'admin_only') {
    return (
      <div className="page-container" style={{ maxWidth: 740, margin: '60px auto', padding: '0 20px' }}>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #fed7aa',
            borderTop: '4px solid #ea580c',
            borderRadius: 12,
            padding: 32,
            boxShadow: '0 10px 25px -5px rgba(234, 88, 12, 0.08)',
          }}
        >
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#ffedd5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Lock size={26} style={{ color: '#ea580c' }} />
            </div>
            <div style={{ flex: 1 }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#ea580c',
                  background: '#fff7ed',
                  padding: '3px 8px',
                  borderRadius: 4,
                  marginBottom: 8,
                }}
              >
                Super Admin Privilege Required
              </span>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#9a3412', margin: '0 0 10px' }}>
                Access Denied: Module 05 (Super Admin Suite)
              </h2>
              <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6, margin: '0 0 16px' }}>
                Your account (<strong>{userEmail}</strong>) is currently designated with{' '}
                <strong>{userRole.toUpperCase()}</strong> authority. Access to user access management, profile
                databases, and security audit logs requires verified <strong>Super Administrator</strong> or{' '}
                <strong>Administrator</strong> credentials.
              </p>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link
                  href="/"
                  className="button button-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Home size={15} /> Return to Portal Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Type: 'restricted' (Module permission revoked by Super Admin)
  return (
    <div className="page-container" style={{ maxWidth: 740, margin: '60px auto', padding: '0 20px' }}>
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #fed7aa',
          borderTop: '4px solid #f59e0b',
          borderRadius: 12,
          padding: 32,
          boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.08)',
        }}
      >
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Lock size={26} style={{ color: '#d97706' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#b45309',
                  background: '#fffbeb',
                  padding: '3px 8px',
                  borderRadius: 4,
                }}
              >
                Access Limited by Super Admin
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#92400e',
                  background: '#fef3c7',
                  padding: '2px 8px',
                  borderRadius: 10,
                }}
              >
                {moduleInfo?.number || 'Restricted Module'}
              </span>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#78350f', margin: '0 0 10px' }}>
              Access to {moduleInfo?.title || 'This Module'} is Restricted
            </h2>
            <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6, margin: '0 0 16px' }}>
              The Regional Executive Director (Super Admin) has configured granular accessibility limits for your staff
              account (<strong>{userEmail}</strong>). Permission to view or operate within this module is currently not
              granted.
            </p>

            {/* Permitted Modules Summary */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '14px 16px',
                marginBottom: 20,
              }}
            >
              <strong style={{ fontSize: 12, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 8 }}>
                Your Permitted Operational Modules:
              </strong>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {allowedModules.length === 0 ? (
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>None currently assigned.</span>
                ) : (
                  allowedModules.map((m) => (
                    <span
                      key={m}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        background: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                        padding: '3px 10px',
                        borderRadius: 6,
                      }}
                    >
                      ✓ {MODULE_LABELS[m] || m}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link
                href="/"
                className="button button-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Home size={15} /> Return to Portal Home
              </Link>
              <Link
                href="/about"
                className="button button-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <ArrowLeft size={15} /> View General Directory
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
