import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRemainingEntities1704500000000 implements MigrationInterface {
  name = 'AddRemainingEntities1704500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Appointments table
    await queryRunner.query(`
      CREATE TYPE "appointment_type_enum" AS ENUM (
        'doctor_visit', 'specialist', 'lab_work', 'imaging', 
        'physical_therapy', 'dental', 'vision', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "appointment_status_enum" AS ENUM (
        'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "recurrence_pattern_enum" AS ENUM (
        'none', 'daily', 'weekly', 'biweekly', 'monthly'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "title" varchar NOT NULL,
        "type" "appointment_type_enum" NOT NULL DEFAULT 'doctor_visit',
        "doctor_name" varchar,
        "location" varchar,
        "address" varchar,
        "date_time" TIMESTAMP NOT NULL,
        "duration" int NOT NULL DEFAULT 60,
        "notes" text,
        "status" "appointment_status_enum" NOT NULL DEFAULT 'scheduled',
        "recurrence" "recurrence_pattern_enum" NOT NULL DEFAULT 'none',
        "recurrence_end_date" TIMESTAMP,
        "recurrence_rule_id" varchar,
        "reminder_before" text,
        "transport_assigned_to_id" uuid,
        "care_recipient_id" uuid NOT NULL,
        "created_by_id" uuid NOT NULL,
        CONSTRAINT "pk_appointments" PRIMARY KEY ("id"),
        CONSTRAINT "fk_appointments_transport" FOREIGN KEY ("transport_assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_appointments_care_recipient" FOREIGN KEY ("care_recipient_id") REFERENCES "care_recipients"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_appointments_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_appointments_care_recipient_date" ON "appointments" ("care_recipient_id", "date_time")`);
    await queryRunner.query(`CREATE INDEX "idx_appointments_date" ON "appointments" ("date_time")`);

    // Medications table
    await queryRunner.query(`
      CREATE TYPE "medication_form_enum" AS ENUM (
        'tablet', 'capsule', 'liquid', 'injection', 'patch', 
        'cream', 'inhaler', 'drops', 'suppository', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "medication_frequency_enum" AS ENUM (
        'once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily',
        'every_other_day', 'weekly', 'as_needed', 'custom'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "medications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "name" varchar NOT NULL,
        "dosage" varchar NOT NULL,
        "form" "medication_form_enum" NOT NULL DEFAULT 'tablet',
        "frequency" "medication_frequency_enum" NOT NULL DEFAULT 'once_daily',
        "scheduled_times" text NOT NULL,
        "instructions" text,
        "prescribed_by" varchar,
        "pharmacy" varchar,
        "current_supply" int,
        "refill_alert_at" int,
        "start_date" date NOT NULL,
        "end_date" date,
        "is_active" boolean NOT NULL DEFAULT true,
        "care_recipient_id" uuid NOT NULL,
        "created_by_id" uuid NOT NULL,
        CONSTRAINT "pk_medications" PRIMARY KEY ("id"),
        CONSTRAINT "fk_medications_care_recipient" FOREIGN KEY ("care_recipient_id") REFERENCES "care_recipients"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_medications_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_medications_care_recipient" ON "medications" ("care_recipient_id", "is_active")`);

    // Medication Logs table
    await queryRunner.query(`
      CREATE TYPE "medication_log_status_enum" AS ENUM ('given', 'skipped', 'missed')
    `);

    await queryRunner.query(`
      CREATE TABLE "medication_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "status" "medication_log_status_enum" NOT NULL,
        "scheduled_time" TIMESTAMP NOT NULL,
        "given_time" TIMESTAMP,
        "skip_reason" varchar,
        "notes" text,
        "medication_id" uuid NOT NULL,
        "logged_by_id" uuid NOT NULL,
        CONSTRAINT "pk_medication_logs" PRIMARY KEY ("id"),
        CONSTRAINT "fk_medication_logs_medication" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_medication_logs_logged_by" FOREIGN KEY ("logged_by_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_medication_logs_medication" ON "medication_logs" ("medication_id", "scheduled_time")`);
    await queryRunner.query(`CREATE INDEX "idx_medication_logs_logged_by" ON "medication_logs" ("logged_by_id", "created_at")`);

    // Documents table
    await queryRunner.query(`
      CREATE TYPE "document_category_enum" AS ENUM (
        'medical_record', 'lab_result', 'prescription', 'insurance',
        'legal', 'id', 'image', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "title" varchar NOT NULL,
        "category" "document_category_enum" NOT NULL DEFAULT 'other',
        "description" text,
        "file_name" varchar NOT NULL,
        "file_url" varchar NOT NULL,
        "file_type" varchar NOT NULL,
        "file_size" int NOT NULL,
        "storage_key" varchar,
        "expiration_date" date,
        "is_encrypted" boolean NOT NULL DEFAULT false,
        "care_recipient_id" uuid NOT NULL,
        "uploaded_by_id" uuid NOT NULL,
        CONSTRAINT "pk_documents" PRIMARY KEY ("id"),
        CONSTRAINT "fk_documents_care_recipient" FOREIGN KEY ("care_recipient_id") REFERENCES "care_recipients"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_documents_uploaded_by" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_documents_care_recipient" ON "documents" ("care_recipient_id", "category")`);

    // Emergency Alerts table
    await queryRunner.query(`
      CREATE TYPE "emergency_type_enum" AS ENUM ('fall', 'medical', 'hospitalization', 'missing', 'other')
    `);

    await queryRunner.query(`
      CREATE TYPE "emergency_status_enum" AS ENUM ('active', 'acknowledged', 'resolved', 'cancelled')
    `);

    await queryRunner.query(`
      CREATE TABLE "emergency_alerts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "type" "emergency_type_enum" NOT NULL,
        "status" "emergency_status_enum" NOT NULL DEFAULT 'active',
        "description" text,
        "location" varchar,
        "notified_user_ids" text,
        "acknowledged_by_ids" text,
        "resolved_at" TIMESTAMP,
        "resolution_notes" text,
        "resolved_by_id" uuid,
        "care_recipient_id" uuid NOT NULL,
        "family_id" uuid NOT NULL,
        "triggered_by_id" uuid NOT NULL,
        CONSTRAINT "pk_emergency_alerts" PRIMARY KEY ("id"),
        CONSTRAINT "fk_emergency_alerts_resolved_by" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id"),
        CONSTRAINT "fk_emergency_alerts_care_recipient" FOREIGN KEY ("care_recipient_id") REFERENCES "care_recipients"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_emergency_alerts_family" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_emergency_alerts_triggered_by" FOREIGN KEY ("triggered_by_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_emergency_alerts_family" ON "emergency_alerts" ("family_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_emergency_alerts_care_recipient" ON "emergency_alerts" ("care_recipient_id", "created_at")`);

    // Caregiver Shifts table
    await queryRunner.query(`
      CREATE TYPE "shift_status_enum" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')
    `);

    await queryRunner.query(`
      CREATE TABLE "caregiver_shifts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "start_time" TIMESTAMP NOT NULL,
        "end_time" TIMESTAMP NOT NULL,
        "status" "shift_status_enum" NOT NULL DEFAULT 'scheduled',
        "actual_start_time" TIMESTAMP,
        "actual_end_time" TIMESTAMP,
        "check_in_notes" text,
        "check_out_notes" text,
        "handoff_notes" text,
        "check_in_location" varchar,
        "check_out_location" varchar,
        "caregiver_id" uuid NOT NULL,
        "care_recipient_id" uuid NOT NULL,
        "created_by_id" uuid NOT NULL,
        CONSTRAINT "pk_caregiver_shifts" PRIMARY KEY ("id"),
        CONSTRAINT "fk_caregiver_shifts_caregiver" FOREIGN KEY ("caregiver_id") REFERENCES "users"("id"),
        CONSTRAINT "fk_caregiver_shifts_care_recipient" FOREIGN KEY ("care_recipient_id") REFERENCES "care_recipients"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_caregiver_shifts_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_caregiver_shifts_care_recipient" ON "caregiver_shifts" ("care_recipient_id", "start_time")`);
    await queryRunner.query(`CREATE INDEX "idx_caregiver_shifts_caregiver" ON "caregiver_shifts" ("caregiver_id", "start_time")`);
    await queryRunner.query(`CREATE INDEX "idx_caregiver_shifts_status" ON "caregiver_shifts" ("status")`);

    // Timeline Entries table
    await queryRunner.query(`
      CREATE TYPE "timeline_entry_type_enum" AS ENUM (
        'note', 'vitals', 'incident', 'mood', 'meal', 
        'activity', 'sleep', 'symptom', 'medication', 'appointment'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "timeline_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "type" "timeline_entry_type_enum" NOT NULL,
        "title" varchar NOT NULL,
        "description" text,
        "vitals" jsonb,
        "metadata" jsonb,
        "attachments" text,
        "care_recipient_id" uuid NOT NULL,
        "created_by_id" uuid NOT NULL,
        CONSTRAINT "pk_timeline_entries" PRIMARY KEY ("id"),
        CONSTRAINT "fk_timeline_entries_care_recipient" FOREIGN KEY ("care_recipient_id") REFERENCES "care_recipients"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_timeline_entries_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_timeline_entries_care_recipient" ON "timeline_entries" ("care_recipient_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "idx_timeline_entries_type" ON "timeline_entries" ("type", "created_at")`);

    // Notifications table
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM (
        'medication_reminder', 'medication_missed', 'appointment_reminder',
        'shift_reminder', 'emergency_alert', 'family_invite', 
        'timeline_update', 'document_shared', 'general'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "notification_channel_enum" AS ENUM ('push', 'email', 'sms', 'in_app')
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "type" "notification_type_enum" NOT NULL,
        "title" varchar NOT NULL,
        "body" text NOT NULL,
        "data" jsonb,
        "channel" "notification_channel_enum" NOT NULL DEFAULT 'in_app',
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" TIMESTAMP,
        "is_sent" boolean NOT NULL DEFAULT false,
        "sent_at" TIMESTAMP,
        "scheduled_for" TIMESTAMP,
        "user_id" uuid NOT NULL,
        "family_id" uuid,
        CONSTRAINT "pk_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_notifications_family" FOREIGN KEY ("family_id") REFERENCES "families"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_notifications_user_read" ON "notifications" ("user_id", "is_read")`);
    await queryRunner.query(`CREATE INDEX "idx_notifications_user_created" ON "notifications" ("user_id", "created_at")`);

    // Push Subscriptions table
    await queryRunner.query(`
      CREATE TYPE "push_platform_enum" AS ENUM ('web', 'ios', 'android')
    `);

    await queryRunner.query(`
      CREATE TABLE "push_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "endpoint" varchar NOT NULL,
        "keys" jsonb NOT NULL,
        "platform" "push_platform_enum" NOT NULL DEFAULT 'web',
        "device_name" varchar,
        "is_active" boolean NOT NULL DEFAULT true,
        "user_id" uuid NOT NULL,
        CONSTRAINT "pk_push_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_push_subscriptions_endpoint" UNIQUE ("endpoint"),
        CONSTRAINT "fk_push_subscriptions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_push_subscriptions_user" ON "push_subscriptions" ("user_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "push_subscriptions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "push_platform_enum"`);
    
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_channel_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
    
    await queryRunner.query(`DROP TABLE IF EXISTS "timeline_entries"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "timeline_entry_type_enum"`);
    
    await queryRunner.query(`DROP TABLE IF EXISTS "caregiver_shifts"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "shift_status_enum"`);
    
    await queryRunner.query(`DROP TABLE IF EXISTS "emergency_alerts"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "emergency_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "emergency_type_enum"`);
    
    await queryRunner.query(`DROP TABLE IF EXISTS "documents"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "document_category_enum"`);
    
    await queryRunner.query(`DROP TABLE IF EXISTS "medication_logs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "medication_log_status_enum"`);
    
    await queryRunner.query(`DROP TABLE IF EXISTS "medications"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "medication_frequency_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "medication_form_enum"`);
    
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "recurrence_pattern_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "appointment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "appointment_type_enum"`);
  }
}

