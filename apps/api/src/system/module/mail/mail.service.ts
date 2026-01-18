import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly provider: string;

  constructor(
    private configService: ConfigService,
    @InjectQueue('mail') private mailQueue: Queue,
  ) {
    this.provider = this.configService.get('mail.provider') || 'mailtrap';
    this.logger.log(`Mail provider: ${this.provider}`);
  }

  async send(options: SendMailOptions): Promise<void> {
    try {
      // Check if queue client is ready (connected to Redis)
      const client = this.mailQueue.client;
      if (!client || client.status !== 'ready') {
        this.logger.warn(`Mail queue not ready (Redis disconnected). Sending directly...`);
        await this.sendDirect(options);
        return;
      }

      // Add with a short timeout to avoid hanging
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Queue add timeout')), 3000)
      );

      await Promise.race([
        this.mailQueue.add('send', {
          ...options,
          provider: this.provider,
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        }),
        timeoutPromise,
      ]);

      this.logger.log(`Mail queued for ${options.to} via ${this.provider}`);
    } catch (error) {
      // If queue fails (Redis unavailable), try direct send
      this.logger.warn(`Failed to queue mail for ${options.to}: ${error.message}. Trying direct send...`);
      await this.sendDirect(options);
    }
  }

  /**
   * Send email directly without using the queue (fallback when Redis is unavailable)
   */
  private async sendDirect(options: SendMailOptions): Promise<void> {
    try {
      const mailContent = options.template
        ? this.renderTemplate(options.template, options.context || {})
        : { html: options.html || '', text: options.text || '' };

      await this.sendViaMailtrap(options.to, options.subject, mailContent);
      this.logger.log(`Mail sent directly to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send mail directly to ${options.to}: ${error.message}`);
    }
  }

  /**
   * Send via Mailtrap SMTP
   */
  private async sendViaMailtrap(
    to: string | string[],
    subject: string,
    content: { html: string; text: string },
  ): Promise<void> {
    const mailConfig = this.configService.get('mail');
    const mailtrapConfig = mailConfig?.mailtrap;

    const host = mailtrapConfig?.host;
    const port = mailtrapConfig?.port;
    const user = mailtrapConfig?.user;
    const pass = mailtrapConfig?.pass;

    if (!host || !user || !pass) {
      this.logger.warn('Mailtrap not configured, logging email instead');
      this.logEmail(to, subject, content);
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"${mailConfig.fromName}" <${mailConfig.from}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: content.text,
      html: content.html,
    });
  }

  private logEmail(
    to: string | string[],
    subject: string,
    content: { html: string; text: string },
  ): void {
    this.logger.log('='.repeat(50));
    this.logger.log(`TO: ${Array.isArray(to) ? to.join(', ') : to}`);
    this.logger.log(`SUBJECT: ${subject}`);
    this.logger.log(`CONTENT: ${content.text.substring(0, 200)}...`);
    this.logger.log('='.repeat(50));
  }

  /**
   * Render email template
   */
  private renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): { html: string; text: string } {
    const frontendUrl = this.configService.get('app.frontendUrl');

    const templates: Record<string, (ctx: any) => { html: string; text: string }> = {
      welcome: (ctx) => ({
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2D5A4A 0%, #3D8B6E 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">Welcome to CareCircle!</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #E8E7E3; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #1A1A18;">Hi ${ctx.name},</p>
              <p style="font-size: 16px; color: #5C5C58;">We're thrilled to have you join our community of caregivers.</p>
              <a href="${frontendUrl}/dashboard" style="display: inline-block; background: #2D5A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Get Started</a>
            </div>
          </body>
          </html>
        `,
        text: `Welcome to CareCircle, ${ctx.name}! We're thrilled to have you join our community of caregivers.`,
      }),

      'password-reset': (ctx) => ({
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: #fff; padding: 30px; border: 1px solid #E8E7E3; border-radius: 12px;">
              <h1 style="color: #1A1A18;">Reset Your Password</h1>
              <p style="color: #5C5C58;">Hi ${ctx.name},</p>
              <p style="color: #5C5C58;">Click the button below to reset your password:</p>
              <a href="${ctx.resetUrl}" style="display: inline-block; background: #2D5A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">Reset Password</a>
              <p style="color: #8A8A86; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            </div>
          </body>
          </html>
        `,
        text: `Hi ${ctx.name}, Click this link to reset your password: ${ctx.resetUrl}. This link expires in 1 hour.`,
      }),

      'email-verification': (ctx) => ({
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2D5A4A 0%, #3D8B6E 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">Verify Your Email</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #E8E7E3; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #1A1A18;">Hi ${ctx.name},</p>
              <p style="font-size: 16px; color: #5C5C58;">Your verification code:</p>
              <div style="background: #E8F5EF; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #2D5A4A;">${ctx.otp}</span>
              </div>
              <p style="color: #8A8A86; font-size: 13px;">This code expires in 5 minutes.</p>
            </div>
          </body>
          </html>
        `,
        text: `Hi ${ctx.name}, Your verification code is: ${ctx.otp}. This code expires in 5 minutes.`,
      }),

      'family-invitation': (ctx) => ({
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #C4725C 0%, #A85E4A 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">You're Invited!</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #E8E7E3; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #5C5C58;"><strong>${ctx.inviterName}</strong> has invited you to join <strong>${ctx.familyName}</strong> on CareCircle.</p>
              <a href="${ctx.inviteUrl}" style="display: inline-block; background: #2D5A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Accept Invitation</a>
              <p style="color: #8A8A86; font-size: 14px; margin-top: 20px;">This invitation expires in 7 days.</p>
            </div>
          </body>
          </html>
        `,
        text: `${ctx.inviterName} has invited you to join ${ctx.familyName} on CareCircle. Accept here: ${ctx.inviteUrl}`,
      }),
    };

    const templateFn = templates[templateName];
    if (!templateFn) {
      this.logger.warn(`Template not found: ${templateName}, using plain text`);
      return { html: '', text: '' };
    }

    return templateFn(context);
  }

  // Template-based emails
  async sendWelcome(email: string, name: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Welcome to CareCircle',
      template: 'welcome',
      context: { name },
    });
  }

  async sendPasswordReset(email: string, token: string, name: string): Promise<void> {
    const resetUrl = `${this.configService.get('app.frontendUrl')}/reset-password?token=${token}`;
    
    await this.send({
      to: email,
      subject: 'Reset Your Password - CareCircle',
      template: 'password-reset',
      context: { name, resetUrl },
    });
  }

  async sendEmailVerification(email: string, otp: string, name: string): Promise<void> {
    const verificationUrl = `${this.configService.get('app.frontendUrl')}/verify-email?email=${encodeURIComponent(email)}`;

    await this.send({
      to: email,
      subject: 'Verify Your Email - CareCircle',
      template: 'email-verification',
      context: { name, otp, verificationUrl },
    });
  }

  async sendFamilyInvitation(
    email: string,
    inviterName: string,
    familyName: string,
    inviteToken: string,
  ): Promise<void> {
    const inviteUrl = `${this.configService.get('app.frontendUrl')}/accept-invite/${inviteToken}`;
    
    await this.send({
      to: email,
      subject: `${inviterName} invited you to join ${familyName} on CareCircle`,
      template: 'family-invitation',
      context: { inviterName, familyName, inviteUrl },
    });
  }

  async sendEmergencyAlert(
    emails: string[],
    careRecipientName: string,
    alertType: string,
    message: string,
    alertedByName: string,
  ): Promise<void> {
    await this.send({
      to: emails,
      subject: `🚨 EMERGENCY ALERT - ${careRecipientName}`,
      template: 'emergency-alert',
      context: {
        careRecipientName,
        alertType,
        message,
        alertedByName,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendMedicationReminder(
    email: string,
    careRecipientName: string,
    medicationName: string,
    dosage: string,
    time: string,
  ): Promise<void> {
    await this.send({
      to: email,
      subject: `Medication Reminder - ${medicationName} for ${careRecipientName}`,
      template: 'medication-reminder',
      context: {
        careRecipientName,
        medicationName,
        dosage,
        time,
      },
    });
  }

  async sendPasswordResetByAdmin(
    email: string,
    tempPassword: string,
    userName: string,
    adminName: string,
  ): Promise<void> {
    const loginUrl = `${this.configService.get('app.frontendUrl')}/login`;

    await this.send({
      to: email,
      subject: 'Your Password Was Reset - CareCircle',
      template: 'password-reset-by-admin',
      context: {
        userName,
        adminName,
        tempPassword,
        loginUrl,
      },
    });
  }
}
