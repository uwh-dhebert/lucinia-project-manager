export const ALLOWED_SIGNUP_EMAIL_DOMAIN = 'lucina.com';

export function normalizeSignupEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedSignupEmail(email: string): boolean {
  const normalized = normalizeSignupEmail(email);
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = normalized.slice(atIndex + 1);
  return domain === ALLOWED_SIGNUP_EMAIL_DOMAIN;
}

export function getSignupEmailError(email: string): string | null {
  if (!email?.trim()) {
    return 'Email is required.';
  }

  const normalized = normalizeSignupEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return 'Enter a valid email address.';
  }

  if (!isAllowedSignupEmail(normalized)) {
    return `Sign up is limited to @${ALLOWED_SIGNUP_EMAIL_DOMAIN} email addresses.`;
  }

  return null;
}