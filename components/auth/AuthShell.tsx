import Link from 'next/link';
import { LucinaLogo } from '@/components/brand/LucinaLogo';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-lucina-accent flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <LucinaLogo href="/" width={160} height={48} priority />
          </div>
          <h1 className="text-2xl font-serif font-bold text-lucina-primary">{title}</h1>
          <p className="text-lucina-secondary mt-2">{subtitle}</p>
        </div>

        <div className="bg-lucina-white rounded-2xl shadow-lg p-8 border-2 border-lucina-rose">
          {children}
        </div>

        {footer && <div className="mt-6">{footer}</div>}

        <p className="mt-8 text-center text-xs text-lucina-muted">
          © 2026 Lucina. All rights reserved.
        </p>
      </div>
    </div>
  );
}