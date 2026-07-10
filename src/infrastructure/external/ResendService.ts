import { Resend } from 'resend';
import {
  getResendConfigError,
  getResendFromEmail,
  normalizeResendError,
} from '@/lib/resend-config';
import {
  buildAuthCallbackUrl,
  buildAuthEmailHtml,
  getAuthEmailContent,
} from './auth-email-templates';

export class ResendService {
  private resend: Resend;
  private fromEmail: string;
  private siteUrl: string;

  constructor() {
    const configError = getResendConfigError();
    if (configError) {
      throw new Error(configError);
    }

    this.resend = new Resend(process.env.RESEND_API_KEY!.trim());
    this.fromEmail = getResendFromEmail();
    this.siteUrl = process.env.NEXT_PUBLIC_SITE_URL!.trim();
  }

  async sendAuthEmail({
    to,
    actionType,
    tokenHash,
    token,
    redirectTo,
    actionUrl,
  }: {
    to: string;
    actionType: string;
    tokenHash?: string;
    token?: string;
    redirectTo: string;
    actionUrl?: string;
  }) {
    const content = getAuthEmailContent(actionType);
    const resolvedActionUrl =
      actionUrl ??
      (tokenHash
        ? buildAuthCallbackUrl(this.siteUrl, tokenHash, actionType, redirectTo)
        : null);

    if (!resolvedActionUrl) {
      throw new Error('Confirmation link could not be generated.');
    }

    const html = buildAuthEmailHtml({
      heading: content.heading,
      body: content.body,
      buttonLabel: content.buttonLabel,
      footer: content.footer,
      actionUrl: resolvedActionUrl,
      otpCode: token,
    });

    await this.sendHtmlEmail(to, content.subject, html);
  }

  private async sendHtmlEmail(to: string, subject: string, html: string) {
    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: [to],
      subject,
      html,
    });

    if (error) {
      throw new Error(normalizeResendError(error.message || 'Failed to send email'));
    }
  }

  async sendPasswordResetEmail({
    to,
    resetLink,
  }: {
    to: string;
    resetLink: string;
  }) {
    const content = getAuthEmailContent('recovery');
    const html = buildAuthEmailHtml({
      heading: content.heading,
      body: content.body,
      buttonLabel: content.buttonLabel,
      footer: content.footer,
      actionUrl: resetLink,
    });

    await this.sendHtmlEmail(to, content.subject, html);
  }
}