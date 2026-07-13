'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import LinksTreeModal from '@/components/LinksTreeModal';
import { LucinaLogo } from '@/components/brand/LucinaLogo';

const WikiSidebar = dynamic(
  () => import('@/components/WikiSidebar').then((m) => m.WikiSidebar),
  { ssr: false, loading: () => <div className="px-4 py-2 text-xs text-lucina-cream/70 animate-pulse">Loading wiki...</div> }
);

const FloatingChatWidget = dynamic(
  () => import('@/components/FloatingChatWidget').then((m) => m.FloatingChatWidget),
  { ssr: false }
);

interface ProtectedShellProps {
  children: React.ReactNode;
  userName: string;
}

const navLinkClass =
  'px-3 py-1.5 text-sm font-bold text-lucina-cream hover:text-lucina-rose rounded-lg transition-colors';

export function ProtectedShell({ children, userName }: ProtectedShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [linksModalOpen, setLinksModalOpen] = useState(false);

  const isWikiPage = pathname.includes('/wiki');

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const openLinksModal = () => {
    setLinksModalOpen(true);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-lucina-accent flex flex-col">
      <nav className="sticky top-0 z-50 bg-lucina-primary">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-10 lg:px-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <LucinaLogo href="/dashboard" width={140} height={42} />

              <div className="hidden md:flex items-center gap-2">
                <Link href="/projects" className={navLinkClass}>
                  Projects
                </Link>
                <button
                  type="button"
                  onClick={openLinksModal}
                  className={navLinkClass}
                >
                  Links
                </button>
                <Link href="/wiki" className={navLinkClass}>
                  Wiki
                </Link>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm text-lucina-cream px-3 py-1 bg-lucina-dark/40 rounded-full">{userName}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-bold text-lucina-primary bg-lucina-rose border-2 border-lucina-dark rounded-xl shadow-[0_4px_0_0_#28121C] hover:bg-lucina-rose-hover transition-colors"
              >
                Logout
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-lucina-dark rounded-lg text-lucina-cream"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-lucina-dark space-y-1">
              <Link
                href="/projects"
                className="block w-full text-left px-4 py-2 text-sm font-bold text-lucina-cream hover:bg-lucina-dark rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Projects
              </Link>
              <button
                type="button"
                onClick={openLinksModal}
                className="block w-full text-left px-4 py-2 text-sm font-bold text-lucina-cream hover:bg-lucina-dark rounded-lg transition-colors"
              >
                Links
              </button>
              <Link
                href="/wiki"
                className="block w-full text-left px-4 py-2 text-sm font-bold text-lucina-cream hover:bg-lucina-dark rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Wiki
              </Link>
              <div className="text-sm text-lucina-cream/80 px-3 py-2 border-t border-lucina-dark mt-2 pt-3">{userName}</div>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm font-bold text-lucina-primary bg-lucina-rose hover:bg-lucina-rose-hover rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {linksModalOpen && (
        <LinksTreeModal onClose={() => setLinksModalOpen(false)} />
      )}

      <div className="flex flex-1">
        {isWikiPage && (
          <aside className="hidden lg:flex w-64 border-r border-lucina-rose bg-lucina-white flex-col overflow-hidden">
            <WikiSidebar />
          </aside>
        )}

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          {children}
        </main>
      </div>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-lucina-muted border-t border-lucina-rose mt-12 w-full">
        <p>© 2026 Lucina. All rights reserved.</p>
      </footer>
      <FloatingChatWidget />
    </div>
  );
}