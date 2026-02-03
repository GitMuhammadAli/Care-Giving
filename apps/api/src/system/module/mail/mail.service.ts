import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { LimitsService, ResourceType, PeriodType } from '../limits';

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
  skipLimitCheck?: boolean; // For critical system emails
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  from: string;
  fromName: string;
}

interface BrevoConfig {
  apiKey: string;
  from: string;
  fromName: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly provider: string;
  private transporter: Transporter | null = null;
  private smtpConfig: SmtpConfig | null = null;
  private brevoConfig: BrevoConfig | null = null;

  constructor(
    private configService: ConfigService,
    private readonly limitsService: LimitsService,
  ) {
    this.provider = this.configService.get('mail.provider') || 'smtp';
  }

  async onModuleInit(): Promise<void> {
    // Check for Brevo HTTP API first (bypasses SMTP port restrictions)
    if (this.provider === 'brevo') {
      this.brevoConfig = this.loadBrevoConfig();
      if (this.brevoConfig) {
        this.logger.log(`✅ Mail configured: Brevo HTTP API`);
        this.logger.log(`   From: "${this.brevoConfig.fromName}" <${this.brevoConfig.from}>`);
        return;
      }
    }

    // Fall back to SMTP/Mailtrap
    this.smtpConfig = this.loadSmtpConfig();

    if (this.smtpConfig) {
      this.logger.log(`✅ Mail configured: ${this.provider} via ${this.smtpConfig.host}:${this.smtpConfig.port}`);
      this.logger.log(`   From: "${this.smtpConfig.fromName}" <${this.smtpConfig.from}>`);

      // Create reusable transporter
      this.transporter = nodemailer.createTransport({
        host: this.smtpConfig.host,
        port: this.smtpConfig.port,
        secure: this.smtpConfig.secure,
        auth: {
          user: this.smtpConfig.user,
          pass: this.smtpConfig.pass,
        },
      });

      // Verify connection
      try {
        await this.transporter.verify();
        this.logger.log(`✅ SMTP connection verified successfully`);
      } catch (error) {
        this.logger.error(`❌ SMTP connection verification failed: ${error.message}`);
        this.logger.warn(`   Emails will be logged instead of sent`);
        this.transporter = null;
      }
    } else {
      this.logger.warn(`⚠️ Mail not configured - emails will be logged only`);
    }
  }

  /**
   * Load SMTP configuration from environment
   * Supports both MAIL_* and SMTP_* naming conventions
   */
  private loadSmtpConfig(): SmtpConfig | null {
    const mailConfig = this.configService.get('mail');
    
    let host: string | undefined;
    let port: number;
    let user: string | undefined;
    let pass: string | undefined;
    let secure = false;

    if (this.provider === 'smtp') {
      const smtpConfig = mailConfig?.smtp;
      host = smtpConfig?.host;
      port = smtpConfig?.port || 587;
      user = smtpConfig?.user;
      pass = smtpConfig?.password;
      secure = smtpConfig?.secure || false;
    } else if (this.provider === 'mailtrap') {
      const mailtrapConfig = mailConfig?.mailtrap;
      host = mailtrapConfig?.host;
      port = mailtrapConfig?.port || 2525;
      user = mailtrapConfig?.user;
      pass = mailtrapConfig?.pass;
    }

    // Validate required fields
    if (!host || !user || !pass) {
      this.logger.warn(`Mail config missing: host=${host ? '✓' : '✗'}, user=${user ? '✓' : '✗'}, pass=${pass ? '✓' : '✗'}`);
      return null;
    }

    return {
      host,
      port,
      user,
      pass,
      secure,
      from: mailConfig?.from || 'noreply@carecircle.com',
      fromName: mailConfig?.fromName || 'CareCircle',
    };
  }

  /**
   * Load Brevo HTTP API configuration from environment
   */
  private loadBrevoConfig(): BrevoConfig | null {
    const mailConfig = this.configService.get('mail');
    const apiKey = mailConfig?.brevo?.apiKey;

    if (!apiKey) {
      this.logger.warn(`Brevo API key not configured (BREVO_API_KEY)`);
      return null;
    }

    return {
      apiKey,
      from: mailConfig?.from || 'noreply@carecircle.com',
      fromName: mailConfig?.fromName || 'CareCircle',
    };
  }

  /**
   * Send email via Brevo HTTP API (bypasses SMTP port restrictions)
   */
  private async sendViaBrevo(
    recipients: string,
    subject: string,
    content: { html: string; text: string },
    attachments?: SendMailOptions['attachments'],
  ): Promise<void> {
    if (!this.brevoConfig) {
      throw new Error('Brevo not configured');
    }

    const toArray = recipients.split(',').map(email => ({ email: email.trim() }));

    const payload: Record<string, any> = {
      sender: {
        name: this.brevoConfig.fromName,
        email: this.brevoConfig.from,
      },
      to: toArray,
      subject,
      htmlContent: content.html || undefined,
      textContent: content.text || undefined,
    };

    // Add attachments if present
    if (attachments && attachments.length > 0) {
      payload.attachment = attachments.map(att => ({
        name: att.filename,
        content: Buffer.isBuffer(att.content)
          ? att.content.toString('base64')
          : Buffer.from(att.content).toString('base64'),
      }));
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': this.brevoConfig.apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Brevo API error (${response.status}): ${errorBody}`);
    }

    const result = await response.json();
    this.logger.log(`✅ Email sent via Brevo! MessageId: ${result.messageId}`);
  }

  async send(options: SendMailOptions): Promise<void> {
    const recipientCount = Array.isArray(options.to) ? options.to.length : 1;
    const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    // Check email limits (unless explicitly skipped for critical emails)
    if (!options.skipLimitCheck) {
      try {
        const { allowed, status } = await this.limitsService.checkLimit(
          ResourceType.EMAILS_SENT,
          PeriodType.DAILY,
          recipientCount,
        );

        if (!allowed) {
          this.logger.error(`Email limit reached (${status.count}/${status.limit}). Email to ${recipients} blocked.`);
          throw new Error('Daily email limit reached. Please try again tomorrow.');
        }

        if (status.isWarning) {
          this.logger.warn(`Email usage warning: ${status.count}/${status.limit} (${status.percentUsed}%)`);
        }
      } catch (error) {
        // If limit check fails, log but continue (don't block emails due to limit service issues)
        if (error.message !== 'Daily email limit reached. Please try again tomorrow.') {
          this.logger.warn(`Limit check failed: ${error.message}, proceeding with email`);
        } else {
          throw error;
        }
      }
    }

    // Render template if provided
    const mailContent = options.template
      ? this.renderTemplate(options.template, options.context || {})
      : { html: options.html || '', text: options.text || '' };

    // Try Brevo HTTP API first (bypasses SMTP port restrictions on platforms like Render)
    if (this.brevoConfig) {
      try {
        this.logger.log(`Sending email to ${recipients} via Brevo HTTP API...`);
        await this.sendViaBrevo(recipients, options.subject, mailContent, options.attachments);

        // Track usage after successful send
        try {
          await this.limitsService.incrementUsage(
            ResourceType.EMAILS_SENT,
            PeriodType.DAILY,
            recipientCount,
          );
        } catch (error) {
          this.logger.warn(`Failed to track email usage: ${error.message}`);
        }
        return;
      } catch (error) {
        this.logger.error(`❌ Failed to send email via Brevo: ${error.message}`);
        throw error;
      }
    }

    // Fall back to SMTP transporter
    if (!this.transporter || !this.smtpConfig) {
      this.logger.warn(`No mail provider configured, logging email instead`);
      this.logEmail(recipients, options.subject, mailContent);
      return;
    }

    // Send via SMTP
    try {
      this.logger.log(`Sending email to ${recipients} via ${this.smtpConfig.host}...`);

      const result = await this.transporter.sendMail({
        from: `"${this.smtpConfig.fromName}" <${this.smtpConfig.from}>`,
        to: recipients,
        subject: options.subject,
        text: mailContent.text,
        html: mailContent.html,
        attachments: options.attachments,
      });

      this.logger.log(`✅ Email sent successfully! MessageId: ${result.messageId}`);

      // Track usage after successful send
      try {
        await this.limitsService.incrementUsage(
          ResourceType.EMAILS_SENT,
          PeriodType.DAILY,
          recipientCount,
        );
      } catch (error) {
        this.logger.warn(`Failed to track email usage: ${error.message}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${recipients}: ${error.message}`);
      this.logger.error(`   Stack: ${error.stack}`);
      // Re-throw so callers know the email failed
      throw error;
    }
  }

  private logEmail(
    to: string,
    subject: string,
    content: { html: string; text: string },
  ): void {
    this.logger.log('╔════════════════════════════════════════════════════════╗');
    this.logger.log('║  📧 EMAIL (not sent - no SMTP configured)              ║');
    this.logger.log('╠════════════════════════════════════════════════════════╣');
    this.logger.log(`║  TO: ${to.substring(0, 46).padEnd(46)}║`);
    this.logger.log(`║  SUBJECT: ${subject.substring(0, 42).padEnd(42)}║`);
    this.logger.log('╚════════════════════════════════════════════════════════╝');
  }

  /**
   * Render email template
   */
  private renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): { html: string; text: string } {
    const frontendUrl = this.configService.get('app.frontendUrl') || 'https://carecircle.app';

    const templates: Record<string, (ctx: any) => { html: string; text: string }> = {
      welcome: (ctx) => ({
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2D5A4A 0%, #3D8B6E 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">Welcome to CareCircle! 🏡</h1>
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
              <h1 style="color: white; margin: 0;">Verify Your Email ✉️</h1>
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
              <h1 style="color: white; margin: 0;">You're Invited! 💌</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #E8E7E3; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #5C5C58;"><strong>${ctx.inviterName}</strong> has invited you to join <strong>${ctx.familyName}</strong> on CareCircle.</p>
              <a href="${ctx.inviteUrl}" style="display: inline-block; background: #2D5A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Accept Invitation</a>
              <p style="color: #8A8A86; font-size: 14px; margin-top: 20px;">This invitation expires in 7 days.</p>
            </div>
          </body>
          </html>
        `,
        text: `${ctx.inviterName} has invited you to join ${ctx.familyName} on CareCircle.\n\nAccept here: ${ctx.inviteUrl}\n\nThis invitation expires in 7 days.`,
      }),

      'emergency-alert': (ctx) => ({
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">🚨 Emergency Alert</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #FECACA; border-top: none; border-radius: 0 0 12px 12px;">
              <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin-bottom: 20px;">
                <p style="font-size: 18px; color: #DC2626; margin: 0; font-weight: bold;">${ctx.alertType}</p>
                <p style="font-size: 14px; color: #991B1B; margin: 5px 0 0 0;">for ${ctx.careRecipientName}</p>
              </div>
              <p style="font-size: 16px; color: #1A1A18;">${ctx.message}</p>
              <div style="background: #F9FAFB; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <p style="color: #6B7280; font-size: 13px; margin: 0;">
                  <strong>Reported by:</strong> ${ctx.alertedByName}<br/>
                  <strong>Time:</strong> ${new Date(ctx.timestamp).toLocaleString()}
                </p>
              </div>
              <a href="${frontendUrl}/emergency" style="display: inline-block; background: #DC2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold;">View Emergency Details</a>
            </div>
          </body>
          </html>
        `,
        text: `🚨 EMERGENCY ALERT for ${ctx.careRecipientName}\n\nType: ${ctx.alertType}\nMessage: ${ctx.message}\n\nReported by: ${ctx.alertedByName}\nTime: ${new Date(ctx.timestamp).toLocaleString()}\n\nPlease respond immediately.`,
      }),

      'medication-reminder': (ctx) => ({
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">💊 Medication Reminder</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #E8E7E3; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #1A1A18;">It's time for <strong>${ctx.careRecipientName}</strong>'s medication:</p>
              <div style="background: #F5F3FF; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="font-size: 24px; color: #5B21B6; margin: 0 0 10px 0; font-weight: bold;">${ctx.medicationName}</p>
                <p style="font-size: 16px; color: #6B7280; margin: 0;">Dosage: <strong>${ctx.dosage}</strong></p>
                <p style="font-size: 14px; color: #6B7280; margin: 10px 0 0 0;">⏰ Scheduled for: <strong>${ctx.time}</strong></p>
              </div>
              <a href="${frontendUrl}/medications" style="display: inline-block; background: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Mark as Taken</a>
            </div>
          </body>
          </html>
        `,
        text: `💊 Medication Reminder for ${ctx.careRecipientName}\n\nMedication: ${ctx.medicationName}\nDosage: ${ctx.dosage}\nTime: ${ctx.time}`,
      }),

      'password-reset-by-admin': (ctx) => ({
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">🔐 Password Reset</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #E8E7E3; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #1A1A18;">Hi ${ctx.userName},</p>
              <p style="font-size: 16px; color: #5C5C58;">Your password has been reset by <strong>${ctx.adminName}</strong>.</p>
              <div style="background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #92400E; font-size: 14px; margin: 0 0 10px 0;">Your temporary password:</p>
                <p style="font-size: 24px; font-weight: bold; color: #D97706; margin: 0; font-family: monospace; letter-spacing: 2px;">${ctx.tempPassword}</p>
              </div>
              <p style="color: #DC2626; font-size: 14px; font-weight: bold;">⚠️ Please change this password immediately after logging in.</p>
              <a href="${ctx.loginUrl}" style="display: inline-block; background: #2D5A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 15px;">Login Now</a>
            </div>
          </body>
          </html>
        `,
        text: `Hi ${ctx.userName},\n\nYour password has been reset by ${ctx.adminName}.\n\nTemporary Password: ${ctx.tempPassword}\n\n⚠️ Please change this password immediately after logging in.\n\nLogin: ${ctx.loginUrl}`,
      }),

      'appointment-reminder': (ctx) => ({
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">📅 Appointment Reminder</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #E8E7E3; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #1A1A18;">Upcoming appointment for <strong>${ctx.careRecipientName}</strong>:</p>
              <div style="background: #F0F9FF; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="font-size: 20px; color: #0284C7; margin: 0 0 15px 0; font-weight: bold;">${ctx.title}</p>
                <p style="font-size: 14px; color: #374151; margin: 5px 0;">📆 <strong>${ctx.date}</strong> at <strong>${ctx.time}</strong></p>
                ${ctx.location ? `<p style="font-size: 14px; color: #374151; margin: 5px 0;">📍 ${ctx.location}</p>` : ''}
                ${ctx.doctorName ? `<p style="font-size: 14px; color: #374151; margin: 5px 0;">👨‍⚕️ Dr. ${ctx.doctorName}</p>` : ''}
              </div>
              <a href="${frontendUrl}/calendar" style="display: inline-block; background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Calendar</a>
            </div>
          </body>
          </html>
        `,
        text: `📅 Appointment Reminder for ${ctx.careRecipientName}\n\n${ctx.title}\nDate: ${ctx.date} at ${ctx.time}\n${ctx.location ? `Location: ${ctx.location}\n` : ''}${ctx.doctorName ? `Doctor: Dr. ${ctx.doctorName}\n` : ''}`,
      }),

      'refill-alert': (ctx) => ({
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">💊 Refill Needed</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #E8E7E3; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #1A1A18;">Medication running low for <strong>${ctx.careRecipientName}</strong>:</p>
              <div style="background: #FFF7ED; border-left: 4px solid #F97316; padding: 20px; margin: 20px 0;">
                <p style="font-size: 20px; color: #EA580C; margin: 0 0 10px 0; font-weight: bold;">${ctx.medicationName}</p>
                <p style="font-size: 16px; color: #9A3412; margin: 0;">Current supply: <strong>${ctx.currentSupply} doses</strong></p>
                <p style="font-size: 14px; color: #C2410C; margin: 10px 0 0 0;">⚠️ Refill recommended when below ${ctx.refillAt} doses</p>
              </div>
              ${ctx.pharmacy ? `<p style="font-size: 14px; color: #6B7280;">Pharmacy: <strong>${ctx.pharmacy}</strong>${ctx.pharmacyPhone ? ` • ${ctx.pharmacyPhone}` : ''}</p>` : ''}
              <a href="${frontendUrl}/medications" style="display: inline-block; background: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 15px;">View Medications</a>
            </div>
          </body>
          </html>
        `,
        text: `💊 Refill Alert for ${ctx.careRecipientName}\n\nMedication: ${ctx.medicationName}\nCurrent Supply: ${ctx.currentSupply} doses\nRefill when below: ${ctx.refillAt} doses\n${ctx.pharmacy ? `\nPharmacy: ${ctx.pharmacy}${ctx.pharmacyPhone ? ` • ${ctx.pharmacyPhone}` : ''}` : ''}`,
      }),

      'shift-reminder': (ctx) => ({
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">👨‍⚕️ Shift Reminder</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #E8E7E3; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #1A1A18;">Your caregiving shift is coming up:</p>
              <div style="background: #ECFDF5; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="font-size: 18px; color: #059669; margin: 0 0 15px 0; font-weight: bold;">Care for ${ctx.careRecipientName}</p>
                <p style="font-size: 14px; color: #374151; margin: 5px 0;">📆 <strong>${ctx.date}</strong></p>
                <p style="font-size: 14px; color: #374151; margin: 5px 0;">⏰ <strong>${ctx.startTime}</strong> - <strong>${ctx.endTime}</strong></p>
              </div>
              <a href="${frontendUrl}/caregivers" style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Shift Details</a>
            </div>
          </body>
          </html>
        `,
        text: `👨‍⚕️ Shift Reminder\n\nYour caregiving shift for ${ctx.careRecipientName} starts soon.\n\nDate: ${ctx.date}\nTime: ${ctx.startTime} - ${ctx.endTime}`,
      }),

      'data-export': (ctx) => ({
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2D5A4A 0%, #3D8B6E 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">📦 Your Data Export is Ready</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #E8E7E3; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #1A1A18;">Hi ${ctx.userName},</p>
              <p style="font-size: 16px; color: #5C5C58;">Your data export has been completed and is ready for download.</p>
              <a href="${ctx.downloadUrl}" style="display: inline-block; background: #2D5A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Download Export</a>
              <p style="color: #DC2626; font-size: 13px; margin-top: 20px;">⚠️ This download link expires in 24 hours.</p>
            </div>
          </body>
          </html>
        `,
        text: `Hi ${ctx.userName},\n\nYour data export is ready for download.\n\nDownload: ${ctx.downloadUrl}\n\n⚠️ This link expires in 24 hours.`,
      }),
    };

    const templateFn = templates[templateName];
    if (!templateFn) {
      this.logger.warn(`Template not found: ${templateName}, using plain text`);
      return { html: '', text: '' };
    }

    return templateFn(context);
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

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
      context: { careRecipientName, medicationName, dosage, time },
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
      context: { userName, adminName, tempPassword, loginUrl },
    });
  }

  async sendAppointmentReminder(
    email: string,
    careRecipientName: string,
    title: string,
    date: string,
    time: string,
    location?: string,
    doctorName?: string,
  ): Promise<void> {
    await this.send({
      to: email,
      subject: `Appointment Reminder - ${title} for ${careRecipientName}`,
      template: 'appointment-reminder',
      context: { careRecipientName, title, date, time, location, doctorName },
    });
  }

  async sendRefillAlert(
    emails: string[],
    careRecipientName: string,
    medicationName: string,
    currentSupply: number,
    refillAt: number,
    pharmacy?: string,
    pharmacyPhone?: string,
  ): Promise<void> {
    await this.send({
      to: emails,
      subject: `⚠️ Refill Needed - ${medicationName} for ${careRecipientName}`,
      template: 'refill-alert',
      context: { careRecipientName, medicationName, currentSupply, refillAt, pharmacy, pharmacyPhone },
    });
  }

  async sendShiftReminder(
    email: string,
    careRecipientName: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    await this.send({
      to: email,
      subject: `Shift Reminder - ${careRecipientName}`,
      template: 'shift-reminder',
      context: { careRecipientName, date, startTime, endTime },
    });
  }

  async sendDataExportReady(
    email: string,
    userName: string,
    downloadUrl: string,
  ): Promise<void> {
    await this.send({
      to: email,
      subject: 'Your CareCircle Data Export is Ready',
      template: 'data-export',
      context: { userName, downloadUrl },
    });
  }
}
