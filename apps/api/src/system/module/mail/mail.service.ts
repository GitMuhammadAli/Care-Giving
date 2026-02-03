import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as nodemailer from 'nodemailer';
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

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly provider: string;

  constructor(
    private configService: ConfigService,
    @InjectQueue('mail') private mailQueue: Queue,
    private readonly limitsService: LimitsService,
  ) {
    this.provider = this.configService.get('mail.provider') || 'mailtrap';
    this.logger.log(`Mail provider: ${this.provider}`);
  }

  async send(options: SendMailOptions): Promise<void> {
    // Count recipients
    const recipientCount = Array.isArray(options.to) ? options.to.length : 1;

    // Check email limits (unless explicitly skipped for critical emails)
    if (!options.skipLimitCheck) {
      const { allowed, status } = await this.limitsService.checkLimit(
        ResourceType.EMAILS_SENT,
        PeriodType.DAILY,
        recipientCount,
      );

      if (!allowed) {
        this.logger.error(
          `Email limit reached (${status.count}/${status.limit}). Email to ${options.to} blocked.`,
        );
        throw new Error('Daily email limit reached. Please try again tomorrow.');
      }

      if (status.isWarning) {
        this.logger.warn(
          `Email usage warning: ${status.count}/${status.limit} (${status.percentUsed}%)`,
        );
      }
    }

    // Send directly - more reliable than queueing (queue processor issues in production)
    // This ensures emails are sent immediately without depending on Bull workers
    await this.sendDirect(options, recipientCount);
  }

  /**
   * Send email directly without using the queue (fallback when Redis is unavailable)
   */
  private async sendDirect(options: SendMailOptions, recipientCount: number = 1): Promise<void> {
    try {
      const mailContent = options.template
        ? this.renderTemplate(options.template, options.context || {})
        : { html: options.html || '', text: options.text || '' };

      await this.sendViaSMTP(options.to, options.subject, mailContent);

      // Track usage after successful send
      await this.limitsService.incrementUsage(
        ResourceType.EMAILS_SENT,
        PeriodType.DAILY,
        recipientCount,
      );

      this.logger.log(`Mail sent directly to ${options.to} via ${this.provider}`);
    } catch (error) {
      this.logger.error(`Failed to send mail directly to ${options.to}: ${error.message}`);
    }
  }

  /**
   * Send via SMTP (supports multiple providers: smtp, mailtrap, brevo, etc.)
   * Routes to the correct config based on MAIL_PROVIDER environment variable
   */
  private async sendViaSMTP(
    to: string | string[],
    subject: string,
    content: { html: string; text: string },
  ): Promise<void> {
    const mailConfig = this.configService.get('mail');
    
    // Get SMTP credentials based on provider
    let host: string | undefined;
    let port: number | undefined;
    let user: string | undefined;
    let pass: string | undefined;
    let secure: boolean = false;

    if (this.provider === 'smtp') {
      // Generic SMTP provider (Brevo, SendGrid, etc.)
      const smtpConfig = mailConfig?.smtp;
      host = smtpConfig?.host;
      port = smtpConfig?.port || 587;
      user = smtpConfig?.user;
      pass = smtpConfig?.password;
      secure = smtpConfig?.secure || false;
      
      this.logger.debug(`Using SMTP config: host=${host}, port=${port}, user=${user ? '***' : 'not set'}`);
    } else if (this.provider === 'mailtrap') {
      // Mailtrap (for testing)
      const mailtrapConfig = mailConfig?.mailtrap;
      host = mailtrapConfig?.host;
      port = mailtrapConfig?.port || 2525;
      user = mailtrapConfig?.user;
      pass = mailtrapConfig?.pass;
      
      this.logger.debug(`Using Mailtrap config: host=${host}, port=${port}`);
    } else {
      this.logger.warn(`Unknown mail provider: ${this.provider}, falling back to SMTP config`);
      // Fallback to smtp config for unknown providers
      const smtpConfig = mailConfig?.smtp;
      host = smtpConfig?.host;
      port = smtpConfig?.port || 587;
      user = smtpConfig?.user;
      pass = smtpConfig?.password;
    }

    // Validate required credentials
    if (!host || !user || !pass) {
      this.logger.warn(`Mail provider "${this.provider}" not configured properly. Missing: ${!host ? 'host' : ''} ${!user ? 'user' : ''} ${!pass ? 'password' : ''}`);
      this.logger.warn('Logging email instead of sending:');
      this.logEmail(to, subject, content);
      return;
    }

    this.logger.log(`Sending email via ${this.provider} (${host}:${port}) to ${Array.isArray(to) ? to.join(', ') : to}`);

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true for 465, false for other ports
      auth: { user, pass },
    });

    try {
      const result = await transporter.sendMail({
        from: `"${mailConfig.fromName}" <${mailConfig.from}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text: content.text,
        html: content.html,
      });
      
      this.logger.log(`Email sent successfully via ${this.provider}. MessageId: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email via ${this.provider}: ${error.message}`);
      throw error;
    }
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
              <div style="margin-top: 25px; padding: 15px; background: #F5F5F4; border-radius: 8px;">
                <p style="color: #5C5C58; font-size: 13px; margin: 0 0 8px 0;">Or copy and paste this link:</p>
                <p style="color: #2D5A4A; font-size: 12px; word-break: break-all; margin: 0; font-family: monospace; background: #E8F5EF; padding: 10px; border-radius: 4px;">${ctx.inviteUrl}</p>
              </div>
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
              <p style="color: #6B7280; font-size: 12px; margin-top: 25px; padding-top: 15px; border-top: 1px solid #E5E7EB;">
                This is an automated emergency notification from CareCircle. Please respond immediately if action is required.
              </p>
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
              <p style="color: #8A8A86; font-size: 12px; margin-top: 25px;">
                💡 Tip: Keep a consistent medication schedule for better health outcomes.
              </p>
            </div>
          </body>
          </html>
        `,
        text: `💊 Medication Reminder for ${ctx.careRecipientName}\n\nMedication: ${ctx.medicationName}\nDosage: ${ctx.dosage}\nTime: ${ctx.time}\n\nPlease ensure this medication is administered on time.`,
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
              <p style="color: #8A8A86; font-size: 12px; margin-top: 25px; padding-top: 15px; border-top: 1px solid #E5E7EB;">
                If you didn't expect this reset, please contact your family administrator immediately.
              </p>
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
              <p style="color: #8A8A86; font-size: 12px; margin-top: 25px;">
                💡 Remember to bring any relevant medical records or medications list.
              </p>
            </div>
          </body>
          </html>
        `,
        text: `📅 Appointment Reminder for ${ctx.careRecipientName}\n\n${ctx.title}\nDate: ${ctx.date} at ${ctx.time}\n${ctx.location ? `Location: ${ctx.location}\n` : ''}${ctx.doctorName ? `Doctor: Dr. ${ctx.doctorName}\n` : ''}\nRemember to bring any relevant medical records.`,
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
                <p style="font-size: 16px; color: #9A3412; margin: 0;">
                  Current supply: <strong>${ctx.currentSupply} doses</strong>
                </p>
                <p style="font-size: 14px; color: #C2410C; margin: 10px 0 0 0;">
                  ⚠️ Refill recommended when below ${ctx.refillAt} doses
                </p>
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
              <p style="color: #8A8A86; font-size: 12px; margin-top: 25px;">
                💡 Check the care notes and medication schedule before your shift.
              </p>
            </div>
          </body>
          </html>
        `,
        text: `👨‍⚕️ Shift Reminder\n\nYour caregiving shift for ${ctx.careRecipientName} starts soon.\n\nDate: ${ctx.date}\nTime: ${ctx.startTime} - ${ctx.endTime}\n\nPlease check care notes and medication schedule before your shift.`,
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
              <div style="background: #F0FDF4; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="font-size: 14px; color: #166534; margin: 0 0 10px 0;"><strong>Export includes:</strong></p>
                <ul style="color: #166534; font-size: 14px; margin: 0; padding-left: 20px;">
                  <li>Profile information</li>
                  <li>Family memberships</li>
                  <li>Care recipients data</li>
                  <li>Medications & logs</li>
                  <li>Appointments</li>
                  <li>Timeline entries</li>
                </ul>
              </div>
              <a href="${ctx.downloadUrl}" style="display: inline-block; background: #2D5A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Download Export</a>
              <p style="color: #DC2626; font-size: 13px; margin-top: 20px;">⚠️ This download link expires in 24 hours.</p>
              <p style="color: #8A8A86; font-size: 12px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #E5E7EB;">
                This export was requested as part of GDPR data portability rights.
              </p>
            </div>
          </body>
          </html>
        `,
        text: `Hi ${ctx.userName},\n\nYour data export is ready for download.\n\nDownload: ${ctx.downloadUrl}\n\n⚠️ This link expires in 24 hours.\n\nExport includes: Profile, Family memberships, Care recipients, Medications, Appointments, Timeline entries.`,
      }),
    };

    const templateFn = templates[templateName];
    if (!templateFn) {
      this.logger.warn(`Template not found: ${templateName}, using plain text`);
      return { html: '', text: '' };
    }

    return templateFn(context);
  }

  // Helper to check dev mode
  private get isDev(): boolean {
    return this.configService.get('NODE_ENV') === 'development';
  }

  // Template-based emails
  async sendWelcome(email: string, name: string): Promise<void> {
    if (this.isDev) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║  📧 DEV MODE - Welcome Email                            ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  To:   ${email.padEnd(44)}║`);
      console.log(`║  Name: ${name.padEnd(44)}║`);
      console.log('╚════════════════════════════════════════════════════════╝\n');
    }
    await this.send({
      to: email,
      subject: 'Welcome to CareCircle',
      template: 'welcome',
      context: { name },
    });
  }

  async sendPasswordReset(email: string, token: string, name: string): Promise<void> {
    const resetUrl = `${this.configService.get('app.frontendUrl')}/reset-password?token=${token}`;

    if (this.isDev) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║  🔑 DEV MODE - Password Reset                           ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  Email: ${email.padEnd(43)}║`);
      console.log(`║  Name:  ${name.padEnd(43)}║`);
      console.log(`║  Token: ${token.substring(0, 40).padEnd(43)}║`);
      console.log(`║  URL:   ${resetUrl.substring(0, 43).padEnd(43)}║`);
      console.log('╚════════════════════════════════════════════════════════╝\n');
    }

    await this.send({
      to: email,
      subject: 'Reset Your Password - CareCircle',
      template: 'password-reset',
      context: { name, resetUrl },
    });
  }

  async sendEmailVerification(email: string, otp: string, name: string): Promise<void> {
    if (this.isDev) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║  🔐 DEV MODE - Email Verification OTP                   ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  Email: ${email.padEnd(43)}║`);
      console.log(`║  OTP:   ${otp.padEnd(43)}║`);
      console.log('╚════════════════════════════════════════════════════════╝\n');
    }

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

    if (this.isDev) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║  👨‍👩‍👧 DEV MODE - Family Invitation                        ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  To:      ${email.padEnd(41)}║`);
      console.log(`║  From:    ${inviterName.padEnd(41)}║`);
      console.log(`║  Family:  ${familyName.padEnd(41)}║`);
      console.log(`║  Token:   ${inviteToken.padEnd(41)}║`);
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  URL: ${inviteUrl.padEnd(45)}║`);
      console.log('╚════════════════════════════════════════════════════════╝\n');
    }

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
    if (this.isDev) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║  🚨 DEV MODE - Emergency Alert                          ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  To:        ${emails.join(', ').substring(0, 39).padEnd(39)}║`);
      console.log(`║  Patient:   ${careRecipientName.padEnd(39)}║`);
      console.log(`║  Type:      ${alertType.padEnd(39)}║`);
      console.log(`║  By:        ${alertedByName.padEnd(39)}║`);
      console.log(`║  Message:   ${message.substring(0, 39).padEnd(39)}║`);
      console.log('╚════════════════════════════════════════════════════════╝\n');
    }

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
    if (this.isDev) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║  💊 DEV MODE - Medication Reminder                      ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  To:         ${email.padEnd(38)}║`);
      console.log(`║  Patient:    ${careRecipientName.padEnd(38)}║`);
      console.log(`║  Medication: ${medicationName.padEnd(38)}║`);
      console.log(`║  Dosage:     ${dosage.padEnd(38)}║`);
      console.log(`║  Time:       ${time.padEnd(38)}║`);
      console.log('╚════════════════════════════════════════════════════════╝\n');
    }

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

    if (this.isDev) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║  🔐 DEV MODE - Admin Password Reset                     ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  Email:        ${email.padEnd(36)}║`);
      console.log(`║  User:         ${userName.padEnd(36)}║`);
      console.log(`║  Reset By:     ${adminName.padEnd(36)}║`);
      console.log(`║  Temp Password: ${tempPassword.padEnd(35)}║`);
      console.log(`║  Login URL:    ${loginUrl.substring(0, 36).padEnd(36)}║`);
      console.log('╚════════════════════════════════════════════════════════╝\n');
    }

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

  async sendAppointmentReminder(
    email: string,
    careRecipientName: string,
    title: string,
    date: string,
    time: string,
    location?: string,
    doctorName?: string,
  ): Promise<void> {
    if (this.isDev) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║  📅 DEV MODE - Appointment Reminder                     ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  To:       ${email.padEnd(40)}║`);
      console.log(`║  Patient:  ${careRecipientName.padEnd(40)}║`);
      console.log(`║  Title:    ${title.padEnd(40)}║`);
      console.log(`║  Date:     ${date.padEnd(40)}║`);
      console.log(`║  Time:     ${time.padEnd(40)}║`);
      console.log('╚════════════════════════════════════════════════════════╝\n');
    }

    await this.send({
      to: email,
      subject: `Appointment Reminder - ${title} for ${careRecipientName}`,
      template: 'appointment-reminder',
      context: {
        careRecipientName,
        title,
        date,
        time,
        location,
        doctorName,
      },
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
    if (this.isDev) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║  💊 DEV MODE - Refill Alert                             ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  To:           ${emails.join(', ').substring(0, 35).padEnd(35)}║`);
      console.log(`║  Patient:      ${careRecipientName.padEnd(35)}║`);
      console.log(`║  Medication:   ${medicationName.padEnd(35)}║`);
      console.log(`║  Supply:       ${String(currentSupply).padEnd(35)}║`);
      console.log('╚════════════════════════════════════════════════════════╝\n');
    }

    await this.send({
      to: emails,
      subject: `⚠️ Refill Needed - ${medicationName} for ${careRecipientName}`,
      template: 'refill-alert',
      context: {
        careRecipientName,
        medicationName,
        currentSupply,
        refillAt,
        pharmacy,
        pharmacyPhone,
      },
    });
  }

  async sendShiftReminder(
    email: string,
    careRecipientName: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    if (this.isDev) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║  👨‍⚕️ DEV MODE - Shift Reminder                          ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  To:       ${email.padEnd(40)}║`);
      console.log(`║  Patient:  ${careRecipientName.padEnd(40)}║`);
      console.log(`║  Date:     ${date.padEnd(40)}║`);
      console.log(`║  Time:     ${(startTime + ' - ' + endTime).padEnd(40)}║`);
      console.log('╚════════════════════════════════════════════════════════╝\n');
    }

    await this.send({
      to: email,
      subject: `Shift Reminder - ${careRecipientName}`,
      template: 'shift-reminder',
      context: {
        careRecipientName,
        date,
        startTime,
        endTime,
      },
    });
  }

  async sendDataExportReady(
    email: string,
    userName: string,
    downloadUrl: string,
  ): Promise<void> {
    if (this.isDev) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║  📦 DEV MODE - Data Export Ready                        ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  Email:   ${email.padEnd(41)}║`);
      console.log(`║  User:    ${userName.padEnd(41)}║`);
      console.log(`║  URL:     ${downloadUrl.substring(0, 41).padEnd(41)}║`);
      console.log('╚════════════════════════════════════════════════════════╝\n');
    }

    await this.send({
      to: email,
      subject: 'Your CareCircle Data Export is Ready',
      template: 'data-export',
      context: {
        userName,
        downloadUrl,
      },
    });
  }
}
