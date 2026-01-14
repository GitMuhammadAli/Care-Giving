import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';
import { SendMailOptions } from './mail.service';

interface MailJobData extends SendMailOptions {
  provider: string;
}

@Processor('mail')
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private configService: ConfigService) {}

  @Process('send')
  async handleSend(job: Job<MailJobData>): Promise<void> {
    const { to, subject, html, text, template, context, provider } = job.data;

    this.logger.log(`Processing mail job ${job.id} to ${to} via ${provider}`);

    try {
      const mailContent = template
        ? await this.renderTemplate(template, context || {})
        : { html: html || '', text: text || '' };

      switch (provider) {
        case 'mailtrap':
          await this.sendViaMailtrap(to, subject, mailContent);
          break;
        case 'resend':
          await this.sendViaResend(to, subject, mailContent);
          break;
        case 'brevo':
          await this.sendViaBrevo(to, subject, mailContent);
          break;
        case 'smtp':
          await this.sendViaSMTP(to, subject, mailContent);
          break;
        default:
          this.logger.warn(`Unknown mail provider: ${provider}, logging email`);
          this.logEmail(to, subject, mailContent);
      }

      this.logger.log(`Mail sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send mail to ${to}: ${error.message}`);
      throw error;
    }
  }

  private async sendViaMailtrap(
    to: string | string[],
    subject: string,
    content: { html: string; text: string },
  ): Promise<void> {
    const mailConfig = this.configService.get('mail');
    const mailtrapConfig = mailConfig?.mailtrap;

    // Try API token first (Mailtrap API v2)
    const token = mailtrapConfig?.token;
    if (token) {
      const response = await fetch('https://send.api.mailtrap.io/api/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: {
            email: mailConfig.from,
            name: mailConfig.fromName,
          },
          to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
          subject,
          html: content.html,
          text: content.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Mailtrap API error: ${error}`);
      }
      return;
    }

    // Fallback to SMTP (Mailtrap sandbox SMTP)
    const host = mailtrapConfig?.host;
    const port = mailtrapConfig?.port;
    const user = mailtrapConfig?.user;
    const pass = mailtrapConfig?.pass;

    if (!host || !user || !pass) {
      this.logger.warn('Mailtrap not configured (no API token or SMTP credentials), logging email');
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

  private async sendViaResend(
    to: string | string[],
    subject: string,
    content: { html: string; text: string },
  ): Promise<void> {
    const apiKey = this.configService.get('mail.resend.apiKey');
    
    if (!apiKey) {
      this.logger.warn('Resend API key not configured, logging email');
      this.logEmail(to, subject, content);
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${this.configService.get('mail.fromName')} <${this.configService.get('mail.from')}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: content.html,
        text: content.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend error: ${error}`);
    }
  }

  private async sendViaBrevo(
    to: string | string[],
    subject: string,
    content: { html: string; text: string },
  ): Promise<void> {
    const apiKey = this.configService.get('mail.brevo.apiKey');
    
    if (!apiKey) {
      this.logger.warn('Brevo API key not configured, logging email');
      this.logEmail(to, subject, content);
      return;
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: this.configService.get('mail.fromName'),
          email: this.configService.get('mail.from'),
        },
        to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
        subject,
        htmlContent: content.html,
        textContent: content.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Brevo error: ${error}`);
    }
  }

  private async sendViaSMTP(
    to: string | string[],
    subject: string,
    content: { html: string; text: string },
  ): Promise<void> {
    const mailConfig = this.configService.get('mail');
    const smtpConfig = mailConfig?.smtp;

    if (!smtpConfig?.host) {
      this.logger.warn('SMTP not configured, logging email');
      this.logEmail(to, subject, content);
      return;
    }

    const transportConfig: any = {
      host: smtpConfig.host,
      port: smtpConfig.port || 587,
      secure: smtpConfig.secure || false,
    };

    // Add auth if credentials provided
    if (smtpConfig.user && smtpConfig.password) {
      transportConfig.auth = {
        user: smtpConfig.user,
        pass: smtpConfig.password,
      };
    }

    const transporter = nodemailer.createTransport(transportConfig);

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

  private async renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): Promise<{ html: string; text: string }> {
    const frontendUrl = this.configService.get('app.frontendUrl');
    
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
              <p style="font-size: 16px; color: #5C5C58;">CareCircle helps families coordinate care for their loved ones with ease.</p>
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
              <p style="font-size: 16px; color: #5C5C58;">Thank you for registering with CareCircle! To complete your registration, please verify your email address.</p>

              <div style="background: #E8F5EF; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                <p style="color: #5C5C58; margin: 0 0 10px 0; font-size: 14px;">Your verification code:</p>
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #2D5A4A;">${ctx.otp}</span>
              </div>

              <p style="font-size: 16px; color: #5C5C58; text-align: center; margin: 20px 0;">— OR —</p>

              <div style="text-align: center; margin: 25px 0;">
                <a href="${ctx.verificationUrl}" style="display: inline-block; background: #2D5A4A; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 500;">Click to Verify Email</a>
              </div>

              <div style="background: #F5F5F3; padding: 15px; border-radius: 8px; margin-top: 25px;">
                <p style="color: #8A8A86; font-size: 13px; margin: 0; line-height: 1.5;">
                  ⏰ <strong>This code expires in 5 minutes.</strong><br>
                  🔒 For security, we recommend using the code rather than sharing this email.<br>
                  ❓ If you didn't create an account, you can safely ignore this email.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Hi ${ctx.name},\n\nYour verification code is: ${ctx.otp}\n\nOr click this link to verify: ${ctx.verificationUrl}\n\nThis code expires in 5 minutes.\n\nIf you didn't create an account, you can safely ignore this email.`,
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
              <p style="color: #5C5C58;">Join your family to coordinate care together.</p>
              <a href="${ctx.inviteUrl}" style="display: inline-block; background: #2D5A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Accept Invitation</a>
              <p style="color: #8A8A86; font-size: 14px; margin-top: 20px;">This invitation expires in 7 days.</p>
            </div>
          </body>
          </html>
        `,
        text: `${ctx.inviterName} has invited you to join ${ctx.familyName} on CareCircle. Accept here: ${ctx.inviteUrl}`,
      }),
      
      'emergency-alert': (ctx) => ({
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: #D32F2F; padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">🚨 EMERGENCY ALERT</h1>
            </div>
            <div style="background: #FFEBEE; padding: 30px; border: 2px solid #D32F2F; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 18px; color: #1A1A18;"><strong>Care Recipient:</strong> ${ctx.careRecipientName}</p>
              <p style="font-size: 16px; color: #1A1A18;"><strong>Alert Type:</strong> ${ctx.alertType}</p>
              <p style="font-size: 16px; color: #1A1A18;"><strong>Message:</strong> ${ctx.message}</p>
              <hr style="border: none; border-top: 1px solid #D32F2F; margin: 20px 0;">
              <p style="color: #5C5C58;"><strong>Reported By:</strong> ${ctx.alertedByName}</p>
              <p style="color: #5C5C58;"><strong>Time:</strong> ${new Date(ctx.timestamp).toLocaleString()}</p>
              <a href="${frontendUrl}/emergency" style="display: inline-block; background: #D32F2F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">View Details</a>
            </div>
          </body>
          </html>
        `,
        text: `EMERGENCY: ${ctx.alertType} for ${ctx.careRecipientName}. ${ctx.message}. Reported by ${ctx.alertedByName} at ${ctx.timestamp}.`,
      }),
      
      'medication-reminder': (ctx) => ({
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: #fff; padding: 30px; border: 1px solid #E8E7E3; border-radius: 12px;">
              <h1 style="color: #1A1A18;">💊 Medication Reminder</h1>
              <div style="background: #E8F5EF; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="font-size: 20px; color: #2D5A4A; margin: 0;"><strong>${ctx.medicationName}</strong></p>
                <p style="font-size: 16px; color: #3D8B6E; margin: 5px 0 0 0;">${ctx.dosage}</p>
              </div>
              <p style="color: #5C5C58;"><strong>For:</strong> ${ctx.careRecipientName}</p>
              <p style="color: #5C5C58;"><strong>Time:</strong> ${ctx.time}</p>
              <a href="${frontendUrl}/medications" style="display: inline-block; background: #2D5A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Log Medication</a>
            </div>
          </body>
          </html>
        `,
        text: `Medication reminder: ${ctx.medicationName} (${ctx.dosage}) for ${ctx.careRecipientName} at ${ctx.time}`,
      }),
    };

    const templateFn = templates[templateName];
    if (!templateFn) {
      throw new Error(`Template not found: ${templateName}`);
    }

    return templateFn(context);
  }
}
