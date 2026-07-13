function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not set. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.`
    );
  }
  return value;
}

export function getSupabaseUrl(): string {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('invalid protocol');
    }
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL is invalid ("${url}"). Use your full Supabase project URL, e.g. https://abcdefgh.supabase.co`
    );
  }

  return url;
}

export function getSupabasePublishableKey(): string {
  return requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
}