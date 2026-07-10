import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getResendConfigError } from '@/lib/resend-config';
import { ResendService } from '@/infrastructure/external/ResendService';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const resendConfigError = getResendConfigError();
    if (resendConfigError) {
      console.error('Forgot password email config error:', resendConfigError);
      return NextResponse.json({
        message: 'If an account exists for that email, a reset link has been sent.',
      });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!.trim();
    const redirectTo = `${siteUrl}/auth/callback?next=/auth/reset-password`;

    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim(),
      options: { redirectTo },
    });

    const tokenHash = data?.properties?.hashed_token;
    const actionLink = data?.properties?.action_link;

    if (!error && (tokenHash || actionLink)) {
      const resend = new ResendService();
      await resend.sendAuthEmail({
        to: email.trim(),
        actionType: 'recovery',
        tokenHash,
        redirectTo,
        actionUrl: tokenHash ? undefined : actionLink,
      });
    }

    // Always return success to avoid revealing whether the account exists.
    return NextResponse.json({
      message: 'If an account exists for that email, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    return NextResponse.json({
      message: 'If an account exists for that email, a reset link has been sent.',
    });
  }
}