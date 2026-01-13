import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

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
        this.logger.warn(`Mail queue not ready (Redis disconnected). Skipping email to ${options.to}`);
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
      // If queue fails (Redis unavailable), log and continue
      this.logger.warn(`Failed to queue mail for ${options.to}: ${error.message}. Email will not be sent.`);
    }
  }

  async sendNow(options: SendMailOptions): Promise<void> {
    this.logger.log(`Sending mail directly to ${options.to}`);
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
    await this.send({
      to: email,
      subject: 'Verify Your Email - CareCircle',
      template: 'email-verification',
      context: { name, otp },
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
}
