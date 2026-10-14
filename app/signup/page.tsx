'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Lock, Mail, User, Building, ArrowRight, ShieldCheck, AlertCircle, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Rice Program Coordinating Unit');
  const [role, setRole] = useState('staff');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters in length.');
      return;
    }

    setLoading(true);

    try {
      let { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            department,
            role,
          },
        },
      });

      if (error) {
        // If error is "already registered", check if this account was deleted and purge stale auth credentials
        if (
          error.message?.toLowerCase().includes('already registered') ||
          error.message?.toLowerCase().includes('user already exists')
        ) {
          try {
            const clearRes = await fetch('/api/auth/register', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email.trim() }),
            });
            if (clearRes.ok) {
              const retry = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                  data: {
                    full_name: fullName.trim(),
                    department,
                    role,
                  },
                },
              });
              if (!retry.error && retry.data) {
                data = retry.data;
                error = null;
              } else {
                setErrorMessage(retry.error?.message || error.message);
                setLoading(false);
                return;
              }
            } else {
              setErrorMessage(error.message);
              setLoading(false);
              return;
            }
          } catch (e: any) {
            setErrorMessage(error?.message || e?.message || 'Error creating profile');
            setLoading(false);
            return;
          }
        } else if (
          error.message?.toLowerCase().includes('rate limit') ||
          (error as any).code === 'over_email_send_rate_limit' ||
          error.status === 429
        ) {
          setErrorMessage(
            'Supabase Email Rate Limit Exceeded: Supabase free projects only allow 3 confirmation emails per hour. To fix this instantly: In your Supabase Dashboard, go to Authentication -> Providers -> Email, and toggle OFF "Confirm email".'
          );
          setLoading(false);
          return;
        } else {
          setErrorMessage(error.message);
          setLoading(false);
          return;
        }
      }

      // Direct client upsert fallback
      if (data?.user?.id) {
        try {
          await supabase.from('profiles').upsert(
            {
              id: data.user.id,
              full_name: fullName.trim(),
              email: email.trim().toLowerCase(),
              department,
              role: role || 'staff',
              is_approved: false,
            },
            { onConflict: 'id' }
          );
        } catch (e) {
          console.warn('Direct client profile upsert fallback note:', e);
        }
      }

      // Sync into local Admin Store & Audit Log
      try {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data?.user?.id,
            email: email.trim(),
            fullName: fullName.trim(),
            department,
            role,
          }),
        });
      } catch (e) {
        console.warn('Admin store sync note:', e);
      }

      // Explicitly sign out so newly registered unapproved accounts cannot access the website before Super Admin approval
      try {
        await supabase.auth.signOut();
      } catch {}

      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during account creation.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-viewport">
      <div className="auth-card auth-card-wide">
        {/* Header */}
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
            <span>Personnel Account Registration</span>
          </div>
        </div>

        {/* Success View */}
        {success ? (
          <div className="auth-success-box">
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#fef3c7',
              border: '2px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#d97706',
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ color: '#0f172a', fontSize: 20, marginBottom: 8 }}>Registration Submitted Successfully</h2>
            <p style={{ color: '#475569', fontSize: 14 }}>
              Your account has been created for <strong>{email}</strong> under <strong>{department}</strong>.
            </p>

            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 8,
              padding: '16px',
              margin: '20px 0',
              textAlign: 'left',
              color: '#92400e',
              fontSize: 13,
              lineHeight: 1.6,
            }}>
              <strong style={{ display: 'block', marginBottom: 4, color: '#78350f', fontSize: 14 }}>
                ⏳ Awaiting Super Admin Approval
              </strong>
              Per DA Regional Security Directive, all new accounts are placed in <strong>Pending Approval</strong> status. You must wait for the <strong>Regional Executive Director (Super Admin)</strong> to approve your account before you can log in and access website modules.
            </div>

            <div style={{ marginTop: 20 }}>
              <Link href="/login" className="button button-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Back to Sign In <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Notifications */}
            {errorMessage && (
              <div className="auth-alert auth-alert-error" role="alert">
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Signup Form */}
            <form onSubmit={handleSignup} className="auth-form">
              <div className="auth-grid-2">
                <div className="form-group">
                  <label htmlFor="reg-fullname">Full Name</label>
                  <div className="auth-input-wrapper">
                    <User size={18} className="auth-input-icon" />
                    <input
                      id="reg-fullname"
                      type="text"
                      required
                      placeholder="e.g. Maria Santos"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reg-email">Official Email Address</label>
                  <div className="auth-input-wrapper">
                    <Mail size={18} className="auth-input-icon" />
                    <input
                      id="reg-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="msantos@car.da.gov.ph"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="auth-grid-2">
                <div className="form-group">
                  <label htmlFor="reg-dept">Office / Operating Unit</label>
                  <div className="auth-input-wrapper">
                    <Building size={18} className="auth-input-icon" />
                    <select
                      id="reg-dept"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      disabled={loading}
                      className="auth-select"
                    >
                      <option value="Rice Program Coordinating Unit">Rice Program Coordinating Unit</option>
                      <option value="Field Operations Division">Field Operations Division</option>
                      <option value="Regional Agricultural Engineering Division (RAED)">Regional Agricultural Engineering (RAED)</option>
                      <option value="Agricultural Program Coordinating Office - Abra">APCO Abra</option>
                      <option value="Agricultural Program Coordinating Office - Apayao">APCO Apayao</option>
                      <option value="Agricultural Program Coordinating Office - Benguet">APCO Benguet</option>
                      <option value="Agricultural Program Coordinating Office - Ifugao">APCO Ifugao</option>
                      <option value="Agricultural Program Coordinating Office - Kalinga">APCO Kalinga</option>
                      <option value="Agricultural Program Coordinating Office - Mountain Province">APCO Mountain Province</option>
                      <option value="Planning, Monitoring & Evaluation Division (PMED)">PMED / Regional Office</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reg-role">Requested Access Role</label>
                  <div className="auth-input-wrapper">
                    <ShieldCheck size={18} className="auth-input-icon" />
                    <select
                      id="reg-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={loading}
                      className="auth-select"
                    >
                      <option value="staff">Staff (Event Calendar Contributor)</option>
                      <option value="officer">Technical Officer (Manage Activities & Records)</option>
                      <option value="admin">System Administrator (Full Management)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="auth-grid-2">
                <div className="form-group">
                  <label htmlFor="reg-password">Password</label>
                  <div className="auth-input-wrapper">
                    <Lock size={18} className="auth-input-icon" />
                    <input
                      id="reg-password"
                      type="password"
                      required
                      autoComplete="new-password"
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reg-confirm">Confirm Password</label>
                  <div className="auth-input-wrapper">
                    <Lock size={18} className="auth-input-icon" />
                    <input
                      id="reg-confirm"
                      type="password"
                      required
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>
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
                    <span>Registering account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Personnel Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Footer info & Login Link */}
        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link href="/login" className="auth-link">
              Sign in here
            </Link>
          </p>

          <div className="auth-back">
            <Link href="/" className="auth-back-link">
              <ArrowLeft size={14} /> Back to Public Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
