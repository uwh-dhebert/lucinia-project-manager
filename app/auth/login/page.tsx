'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthAlert } from '@/components/auth/AuthAlert';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get('error');
  const resetSuccess = searchParams.get('reset');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    callbackError === 'auth_callback_failed'
      ? 'Sign-in could not be completed. Please try again.'
      : ''
  );
  const [success, setSuccess] = useState(
    resetSuccess === 'success'
      ? 'Your password has been updated. Sign in with your new password.'
      : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (data.user) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your account to continue"
      footer={
        <p className="text-center text-lucina-muted text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-lucina-secondary font-semibold hover:text-lucina-secondary transition-colors">
            Sign up
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-lucina-primary mb-2">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 border border-lucina-rose rounded-xl focus:outline-none focus:ring-2 focus:ring-lucina-secondary focus:border-transparent bg-lucina-white text-lucina-primary placeholder-lucina-muted transition-all"
            disabled={loading}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-sm font-semibold text-lucina-primary">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-lucina-secondary hover:text-lucina-secondary transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 border border-lucina-rose rounded-xl focus:outline-none focus:ring-2 focus:ring-lucina-secondary focus:border-transparent bg-lucina-white text-lucina-primary placeholder-lucina-muted transition-all"
            disabled={loading}
          />
        </div>

        {success && <AuthAlert variant="success" message={success} />}
        {error && <AuthAlert variant="error" message={error} />}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 btn-lucina transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-lucina-cream border-t-transparent" />
              Signing in...
            </span>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-lucina-accent flex items-center justify-center text-lucina-muted">
        Loading...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}