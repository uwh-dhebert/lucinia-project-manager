'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthAlert } from '@/components/auth/AuthAlert';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
      setCheckingSession(false);
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await supabase.auth.signOut();
      router.push('/auth/login?reset=success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-lucina-accent flex items-center justify-center text-lucina-muted">
        Loading...
      </div>
    );
  }

  if (!hasSession) {
    return (
      <AuthShell
        title="Reset link expired"
        subtitle="Request a new password reset link to continue"
        footer={
          <p className="text-center text-lucina-muted text-sm">
            <Link href="/auth/login" className="text-lucina-secondary font-semibold hover:text-lucina-secondary transition-colors">
              Back to sign in
            </Link>
          </p>
        }
      >
        <div className="space-y-5">
          <AuthAlert
            variant="info"
            message="This reset link is invalid or has expired. Password reset links can only be used once."
          />
          <Link
            href="/auth/forgot-password"
            className="block w-full py-3 text-center btn-lucina transition-all"
          >
            Request new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Enter and confirm your new password"
      footer={
        <p className="text-center text-lucina-muted text-sm">
          <Link href="/auth/login" className="text-lucina-secondary font-semibold hover:text-lucina-secondary transition-colors">
            Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-lucina-primary mb-2">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full px-4 py-3 border border-lucina-rose rounded-xl focus:outline-none focus:ring-2 focus:ring-lucina-secondary focus:border-transparent bg-lucina-white text-lucina-primary placeholder-lucina-muted transition-all"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-lucina-primary mb-2">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your new password"
            className="w-full px-4 py-3 border border-lucina-rose rounded-xl focus:outline-none focus:ring-2 focus:ring-lucina-secondary focus:border-transparent bg-lucina-white text-lucina-primary placeholder-lucina-muted transition-all"
            disabled={loading}
          />
        </div>

        {error && <AuthAlert variant="error" message={error} />}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 btn-lucina transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-lucina-cream border-t-transparent" />
              Updating password...
            </span>
          ) : (
            'Update password'
          )}
        </button>
      </form>
    </AuthShell>
  );
}