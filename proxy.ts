import { createClient } from './utils/supabase/proxy-client';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPrefixes = [
  '/dashboard',
  '/projects',
  '/wiki',
  '/links',
  '/chat',
  '/documentation',
  '/ai-tools',
  '/ai-generator',
  '/admin',
];

const authPaths = ['/auth/login', '/auth/register', '/auth/forgot-password'];

export async function proxy(request: NextRequest) {
  const { supabase, response } = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Signed-in users on login/register land on the app; the protected layout
  // then routes PENDING/REJECTED accounts to /auth/pending.
  if (user && authPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/:path*',
    '/wiki/:path*',
    '/links/:path*',
    '/chat/:path*',
    '/documentation/:path*',
    '/ai-tools/:path*',
    '/ai-generator/:path*',
    '/admin/:path*',
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
  ],
};