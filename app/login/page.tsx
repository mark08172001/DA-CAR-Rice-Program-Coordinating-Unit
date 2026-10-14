'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, ArrowLeft, Loader2, Clock } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/';
  const message = searchParams.get('message');
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(errorParam || null);
  const [successMessage, setSuccessMessage] = useState<string | null>(message || null);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Check if this is an official Super Admin / Admin credential
      if (cleanEmail === 'super.admin@car.da.gov.ph' || cleanEmail === 'admin@car.da.gov.ph') {
        const adminRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        if (adminRes.ok) {
          setSuccessMessage('Super Administrator authenticated successfully. Redirecting...');
          setTimeout(() => {
            router.refresh();
            window.location.href = nextUrl === '/' ? '/admin' : nextUrl;
          }, 400);
          return;
        }
      }

      // 2. Regular Supabase Auth
      // Clear any leftover super admin cookie from earlier browser sessions
      document.cookie = 'da_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0';

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        // If Supabase returns email_not_confirmed or invalid credentials, re-check /api/auth/login
        const fallbackRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        if (fallbackRes.ok) {
          setSuccessMessage('Administrator authenticated successfully. Redirecting...');
          setTimeout(() => {
            router.refresh();
            window.location.href = nextUrl === '/' ? '/admin' : nextUrl;
          }, 400);
          return;
        }

        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (data?.session) {
        // 1. Record login attempt and verify approval status in admin store
        let loginCheckRes: any = null;
        try {
          const logRes = await fetch('/api/admin/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'login',
              email: data.user.email,
              fullName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
              role: data.user.user_metadata?.role || 'staff',
              userAgent: navigator.userAgent,
            }),
          });
          if (logRes.ok) {
            loginCheckRes = await logRes.json();
          }
        } catch (e) {
          console.warn('Login logging note:', e);
        }

        // 2. Also verify profile status in Supabase
        let isProfileApproved = true;
        let profileExists = true;
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_approved, role')
            .eq('id', data.user.id)
            .maybeSingle();

          if (!profile) {
            profileExists = false;
          } else if (profile.is_approved === false) {
            isProfileApproved = false;
          }
        } catch (e) {
          console.warn('Profile approval check note:', e);
        }

        // Check if account has been permanently deleted by Super Admin
        const isDeleted =
          cleanEmail !== 'super.admin@car.da.gov.ph' &&
          (loginCheckRes?.result?.status === 'DELETED' || !profileExists);

        if (isDeleted) {
          await supabase.auth.signOut();
          setErrorMessage(
            'Account Deleted: This personnel account has been permanently deleted by the Super Administrator. Access is revoked and you can no longer sign in.'
          );
          setLoading(false);
          return;
        }

        // If pending approval, prevent login, sign out, and inform user
        const isPending =
          cleanEmail !== 'super.admin@car.da.gov.ph' &&
          (loginCheckRes?.result?.status === 'PENDING_APPROVAL' ||
            (!isProfileApproved &&
              loginCheckRes?.result?.status !== 'RESTRICTED' &&
              loginCheckRes?.result?.status !== 'SUCCESS'));

        if (isPending) {
          await supabase.auth.signOut();
          setErrorMessage(
            'Account Pending Approval: Your account has been registered but is currently awaiting review and approval from the Regional Executive Director (Super Admin). Access will be enabled once approved.'
          );
          setLoading(false);
          return;
        }

        if (loginCheckRes?.result?.status === 'SUSPENDED') {
          await supabase.auth.signOut();
          setErrorMessage(
            'Account Suspended: This account has been deactivated by the Super Administrator. Access is currently prohibited.'
          );
          setLoading(false);
          return;
        }

        setSuccessMessage('Authentication successful. Redirecting to portal...');
        router.refresh();
        router.push(nextUrl);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign in.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-viewport">
      <div className="auth-card">
        {/* Header with DA Seal */}
        <div className="auth-header">
          <Link href="/" className="auth-brand" title="Back to Portal Home">
            <span className="auth-seal">
              <img src="/da-seal.svg" alt="Department of Agriculture Seal" width={64} height={64} />
            </span>
          </Link>
          <span className="auth-republic">Republic of the Philippines</span>
          <h1 className="auth-title">Department of Agriculture</h1>
          <p className="auth-subtitle">Rice Program Coordinating Unit · Cordillera Administrative Region</p>
          <div className="auth-badge">
            <ShieldCheck size={14} />
            <span>Authorized Personnel Portal</span>
          </div>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div
            className={`auth-alert ${errorMessage.toLowerCase().includes('pending') ? 'auth-alert-warning' : 'auth-alert-error'}`}
            role="alert"
          >
            {errorMessage.toLowerCase().includes('pending') ? <Clock size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} /> : <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />}
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="auth-alert auth-alert-success" role="status">
            <ShieldCheck size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="auth-email">Official Email</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                placeholder="officer@car.da.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <div className="auth-password-header">
              <label htmlFor="auth-password">Password</label>
            </div>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                id="auth-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="button button-primary auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer info & Signup Link */}
        <div className="auth-footer">
          <p>
            Need an officer or staff account?{' '}
            <Link href="/signup" className="auth-link">
              Register here
            </Link>
          </p>

          <div className="auth-back">
            <Link href="/" className="auth-back-link">
              <ArrowLeft size={14} /> Back to Public Portal
            </Link>
          </div>
        </div>

        <div className="auth-notice">
          <small>
            Notice: Unauthorized access to this government computing portal is strictly prohibited and subject to RA 8792 and civil service disciplinary actions.
          </small>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ color: '#136c38', fontWeight: 600 }}>Loading login...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
