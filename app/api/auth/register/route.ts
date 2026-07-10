import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getSignupEmailError, normalizeSignupEmail } from '@/lib/auth-email';
import { getResendConfigError } from '@/lib/resend-config';
import { ResendService } from '@/infrastructure/external/ResendService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, password } = body;

    const emailError = getSignupEmailError(email);
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }

    if (!fullName?.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const resendConfigError = getResendConfigError();
    if (resendConfigError) {
      return NextResponse.json({ error: resendConfigError }, { status: 503 });
    }

    const normalizedEmail = normalizeSignupEmail(email);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!.trim();
    const redirectTo = `${siteUrl}/auth/callback?next=/dashboard`;

    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: normalizedEmail,
      password,
      options: {
        redirectTo,
        data: { full_name: fullName.trim() },
      },
    });

    if (error) {
      const message = error.message.toLowerCase();

      if (message.includes('already') || message.includes('registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Try signing in instead.' },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const properties = data?.properties;
    const tokenHash = properties?.hashed_token;
    const actionLink = properties?.action_link;

    if (!tokenHash && !actionLink) {
      return NextResponse.json(
        { error: 'Account created, but no confirmation link was generated. Contact support.' },
        { status: 500 }
      );
    }

    try {
      const resend = new ResendService();
      await resend.sendAuthEmail({
        to: normalizedEmail,
        actionType: 'signup',
        tokenHash,
        redirectTo,
        actionUrl: tokenHash ? undefined : actionLink,
      });
    } catch (emailError) {
      const message =
        emailError instanceof Error ? emailError.message : 'Failed to send confirmation email';
      console.error('Signup confirmation email error:', emailError);
      return NextResponse.json(
        {
          error: `Account created, but the confirmation email could not be sent. ${message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Check your email for a confirmation link, then sign in.',
      requiresConfirmation: true,
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed.' },
      { status: 500 }
    );
  }
}