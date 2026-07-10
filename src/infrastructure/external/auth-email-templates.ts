interface AuthEmailContent {
  subject: string;
  heading: string;
  body: string;
  buttonLabel: string;
  footer: string;
}

const templates: Record<string, AuthEmailContent> = {
  signup: {
    subject: 'Confirm your Lucina account',
    heading: 'Welcome to Lucina',
    body: 'Thanks for signing up. Click the button below to confirm your email and start managing your projects.',
    buttonLabel: 'Confirm email',
    footer: 'If you did not create an account, you can ignore this email.',
  },
  recovery: {
    subject: 'Reset your Lucina password',
    heading: 'Reset your password',
    body: 'We received a request to reset your password. Click the button below to choose a new one.',
    buttonLabel: 'Reset password',
    footer: 'If you did not request a password reset, you can safely ignore this email.',
  },
  magiclink: {
    subject: 'Your Lucina sign-in link',
    heading: 'Sign in to Lucina',
    body: 'Click the button below to sign in. This link expires soon and can only be used once.',
    buttonLabel: 'Sign in',
    footer: 'If you did not try to sign in, you can ignore this email.',
  },
  invite: {
    subject: 'You have been invited to Lucina',
    heading: 'You are invited',
    body: 'You have been invited to join Lucina. Click the button below to accept your invitation.',
    buttonLabel: 'Accept invitation',
    footer: 'If you were not expecting this invitation, you can ignore this email.',
  },
  email_change: {
    subject: 'Confirm your new email address',
    heading: 'Confirm email change',
    body: 'Click the button below to confirm your new email address for Lucina.',
    buttonLabel: 'Confirm new email',
    footer: 'If you did not request this change, you can ignore this email.',
  },
};

export function getAuthEmailContent(actionType: string): AuthEmailContent {
  return templates[actionType] ?? {
    subject: 'Lucina notification',
    heading: 'Lucina',
    body: 'Please use the link below to continue.',
    buttonLabel: 'Continue',
    footer: 'If you did not request this, you can ignore this email.',
  };
}

export function buildAuthEmailHtml({
  heading,
  body,
  buttonLabel,
  footer,
  actionUrl,
  otpCode,
}: {
  heading: string;
  body: string;
  buttonLabel: string;
  footer: string;
  actionUrl: string;
  otpCode?: string;
}) {
  const otpSection = otpCode
    ? `<p style="margin: 24px 0 8px; color: #94a3b8; font-size: 14px;">Or use this one-time code:</p>
       <p style="margin: 0 0 24px; font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #f8fafc;">${otpCode}</p>`
    : '';

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#020617;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#020617;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px;">
            <tr>
              <td style="text-align:center;padding-bottom:24px;">
                <div style="font-size:28px;font-weight:700;color:#f8fafc;">✨ lucina</div>
              </td>
            </tr>
            <tr>
              <td>
                <h1 style="margin:0 0 16px;font-size:24px;color:#f8fafc;">${heading}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#cbd5e1;">${body}</p>
                <a href="${actionUrl}" style="display:inline-block;background:linear-gradient(90deg,#2563eb,#9333ea);color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px;">
                  ${buttonLabel}
                </a>
                ${otpSection}
                <p style="margin:32px 0 0;font-size:13px;line-height:1.6;color:#64748b;">${footer}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function resolveAuthNextPath(redirectTo: string, siteUrl: string): string {
  try {
    const url = new URL(redirectTo, siteUrl);
    const next = `${url.pathname}${url.search}`;
    return next.length > 1 ? next : '/dashboard';
  } catch {
    return '/dashboard';
  }
}

/** PKCE-compatible link: verify on our callback route, not Supabase /auth/v1/verify. */
export function buildAuthCallbackUrl(
  siteUrl: string,
  tokenHash: string,
  actionType: string,
  redirectTo: string
) {
  const base = siteUrl.replace(/\/$/, '');
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type: actionType,
    next: resolveAuthNextPath(redirectTo, siteUrl),
  });

  return `${base}/auth/callback?${params.toString()}`;
}