import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1704400000000 implements MigrationInterface {
  name = 'InitialSchema1704400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "name" varchar NOT NULL,
        "code" varchar NOT NULL,
        "description" varchar,
        "is_system" boolean NOT NULL DEFAULT false,
        CONSTRAINT "pk_roles" PRIMARY KEY ("id"),
        CONSTRAINT "uq_roles_code" UNIQUE ("code")
      )
    `);

    // Permissions table
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "name" varchar NOT NULL,
        "code" varchar NOT NULL,
        "module" varchar NOT NULL,
        "description" varchar,
        CONSTRAINT "pk_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_permissions_code" UNIQUE ("code")
      )
    `);

    // Role-Permissions junction table
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        CONSTRAINT "pk_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "fk_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
      )
    `);

    // Users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "email" varchar NOT NULL,
        "password" varchar NOT NULL,
        "name" varchar NOT NULL,
        "phone" varchar,
        "avatar_url" varchar,
        "is_verified" boolean NOT NULL DEFAULT false,
        "verification_token" varchar,
        "password_reset_token" varchar,
        "password_reset_expires" TIMESTAMP,
        "last_login" TIMESTAMP,
        "role_id" uuid,
        CONSTRAINT "pk_users" PRIMARY KEY ("id"),
        CONSTRAINT "uq_users_email" UNIQUE ("email"),
        CONSTRAINT "fk_users_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_users_email" ON "users" ("email")`);

    // Audit Logs table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "action" varchar NOT NULL,
        "entity" varchar NOT NULL,
        "entity_id" varchar,
        "old_data" jsonb,
        "new_data" jsonb,
        "ip_address" varchar,
        "user_agent" varchar,
        "user_id" uuid,
        CONSTRAINT "pk_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "fk_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_audit_logs_user" ON "audit_logs" ("user_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" ("entity", "entity_id")`);

    // Families table
    await queryRunner.query(`
      CREATE TABLE "families" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "name" varchar NOT NULL,
        "created_by_id" uuid NOT NULL,
        CONSTRAINT "pk_families" PRIMARY KEY ("id"),
        CONSTRAINT "fk_families_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      )
    `);

    // Family Members table
    await queryRunner.query(`
      CREATE TYPE "family_member_role_enum" AS ENUM ('admin', 'caregiver', 'viewer')
    `);

    await queryRunner.query(`
      CREATE TYPE "invitation_status_enum" AS ENUM ('pending', 'accepted', 'declined', 'expired')
    `);

    await queryRunner.query(`
      CREATE TABLE "family_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "role" "family_member_role_enum" NOT NULL DEFAULT 'viewer',
        "invitation_status" "invitation_status_enum" NOT NULL DEFAULT 'pending',
        "invitation_token" varchar,
        "invitation_expires" TIMESTAMP,
        "invited_email" varchar,
        "joined_at" TIMESTAMP,
        "family_id" uuid NOT NULL,
        "user_id" uuid,
        "invited_by_id" uuid NOT NULL,
        CONSTRAINT "pk_family_members" PRIMARY KEY ("id"),
        CONSTRAINT "fk_family_members_family" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_family_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        CONSTRAINT "fk_family_members_invited_by" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_family_members_family" ON "family_members" ("family_id")`);
    await queryRunner.query(`CREATE INDEX "idx_family_members_user" ON "family_members" ("user_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_family_members_token" ON "family_members" ("invitation_token") WHERE "invitation_token" IS NOT NULL`);

    // Care Recipients table
    await queryRunner.query(`
      CREATE TABLE "care_recipients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "first_name" varchar NOT NULL,
        "last_name" varchar NOT NULL,
        "preferred_name" varchar,
        "date_of_birth" date,
        "blood_type" varchar,
        "photo_url" varchar,
        "allergies" text,
        "conditions" text,
        "notes" text,
        "emergency_contacts" jsonb,
        "doctors" jsonb,
        "insurance" jsonb,
        "preferred_hospital" jsonb,
        "family_id" uuid NOT NULL,
        "created_by_id" uuid NOT NULL,
        CONSTRAINT "pk_care_recipients" PRIMARY KEY ("id"),
        CONSTRAINT "fk_care_recipients_family" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_care_recipients_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_care_recipients_family" ON "care_recipients" ("family_id")`);

    // Insert default roles
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "name", "code", "description", "is_system") VALUES
      (uuid_generate_v4(), 'Super Admin', 'super_admin', 'Full system access', true),
      (uuid_generate_v4(), 'Admin', 'admin', 'Administrative access', true),
      (uuid_generate_v4(), 'User', 'user', 'Standard user access', true)
    `);

    // Insert default permissions
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "name", "code", "module", "description") VALUES
      (uuid_generate_v4(), 'View Users', 'view_users', 'users', 'Can view users'),
      (uuid_generate_v4(), 'Create Users', 'create_users', 'users', 'Can create users'),
      (uuid_generate_v4(), 'Edit Users', 'edit_users', 'users', 'Can edit users'),
      (uuid_generate_v4(), 'Delete Users', 'delete_users', 'users', 'Can delete users'),
      (uuid_generate_v4(), 'View Families', 'view_families', 'families', 'Can view families'),
      (uuid_generate_v4(), 'Manage Families', 'manage_families', 'families', 'Can manage families'),
      (uuid_generate_v4(), 'View Care Recipients', 'view_care_recipients', 'care', 'Can view care recipients'),
      (uuid_generate_v4(), 'Manage Care Recipients', 'manage_care_recipients', 'care', 'Can manage care recipients'),
      (uuid_generate_v4(), 'View Medications', 'view_medications', 'medications', 'Can view medications'),
      (uuid_generate_v4(), 'Manage Medications', 'manage_medications', 'medications', 'Can manage medications'),
      (uuid_generate_v4(), 'Log Medications', 'log_medications', 'medications', 'Can log medications'),
      (uuid_generate_v4(), 'View Appointments', 'view_appointments', 'appointments', 'Can view appointments'),
      (uuid_generate_v4(), 'Manage Appointments', 'manage_appointments', 'appointments', 'Can manage appointments'),
      (uuid_generate_v4(), 'View Documents', 'view_documents', 'documents', 'Can view documents'),
      (uuid_generate_v4(), 'Manage Documents', 'manage_documents', 'documents', 'Can manage documents'),
      (uuid_generate_v4(), 'Trigger Emergency', 'trigger_emergency', 'emergency', 'Can trigger emergency alerts'),
      (uuid_generate_v4(), 'Manage Shifts', 'manage_shifts', 'shifts', 'Can manage caregiver shifts'),
      (uuid_generate_v4(), 'View Timeline', 'view_timeline', 'timeline', 'Can view timeline'),
      (uuid_generate_v4(), 'Add Timeline Entries', 'add_timeline_entries', 'timeline', 'Can add timeline entries')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "care_recipients"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "family_members"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invitation_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "family_member_role_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "families"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
  }
}
