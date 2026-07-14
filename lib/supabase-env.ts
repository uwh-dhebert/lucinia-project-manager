const VERCEL_HINT =
  'In Vercel → Project → Settings → Environment Variables, set the variable for Production, then redeploy (a new build is required for NEXT_PUBLIC_* values).';

function cleanEnvValue(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const raw = process.env[name];
    if (!raw) continue;
    const value = cleanEnvValue(raw);
    if (value) return value;
  }
  return undefined;
}

function requireEnv(label: string, ...names: string[]): string {
  const value = readEnv(...names);
  if (!value) {
    throw new Error(`${label} is not configured. ${VERCEL_HINT}`);
  }
  return value;
}

function validateHttpUrl(url: string, label: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('invalid protocol');
    }
    return url;
  } catch {
    throw new Error(
      `${label} is invalid ("${url}"). Use your full Supabase project URL, e.g. https://abcdefgh.supabase.co. ${VERCEL_HINT}`
    );
  }
}

export function getSupabaseUrl(): string {
  const url = requireEnv(
    'Supabase URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_URL'
  );
  return validateHttpUrl(url, 'Supabase URL');
}

export function getSupabasePublishableKey(): string {
  return requireEnv(
    'Supabase publishable key',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY'
  );
}

export function getSupabaseServiceRoleKey(): string {
  return requireEnv('Supabase service role key', 'SUPABASE_SERVICE_ROLE_KEY');
}

export function getSupabaseConfigError(): string | null {
  try {
    getSupabaseUrl();
    getSupabasePublishableKey();
    getSupabaseServiceRoleKey();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Supabase is not configured.';
  }
}