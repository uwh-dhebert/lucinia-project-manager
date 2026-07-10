const RESEND_SANDBOX_FROM = 'Lucina <onboarding@resend.dev>';

export function isResendSandbox(): boolean {
  return process.env.RESEND_SANDBOX === 'true';
}

export function getResendConfigError(): string | null {
  if (!process.env.RESEND_API_KEY?.trim()) {
    return 'Email service is not configured. Set RESEND_API_KEY in the environment.';
  }

  if (!process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    return 'App URL is not configured. Set NEXT_PUBLIC_SITE_URL in the environment.';
  }

  return null;
}

export function getResendFromEmail(): string {
  if (isResendSandbox()) {
    return RESEND_SANDBOX_FROM;
  }

  return process.env.RESEND_FROM_EMAIL?.trim() || RESEND_SANDBOX_FROM;
}

export function normalizeResendError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('only send testing emails')) {
    return 'Resend sandbox mode only delivers to your Resend account email. Set RESEND_SANDBOX=true for local testing, or verify a domain and set RESEND_FROM_EMAIL.';
  }

  if (lower.includes('domain is not verified')) {
    const domainMatch = message.match(/The (.+?) domain is not verified/i);
    const domain = domainMatch?.[1] ?? 'your';
    return `The ${domain} domain is not verified in Resend. Add DNS records at https://resend.com/domains, or set RESEND_SANDBOX=true to use Resend's test sender locally.`;
  }

  return message || 'Failed to send email';
}