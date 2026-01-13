import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventOutbox1704500000000 implements MigrationInterface {
  name = 'AddEventOutbox1704500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for outbox status
    await queryRunner.query(`
      CREATE TYPE "event_outbox_status_enum" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')
    `);

    // Create the event_outbox table
    await queryRunner.query(`
      CREATE TABLE "event_outbox" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_type" character varying NOT NULL,
        "exchange" character varying NOT NULL,
        "routing_key" character varying NOT NULL,
        "payload" jsonb NOT NULL,
        "aggregate_type" character varying NOT NULL,
        "aggregate_id" character varying NOT NULL,
        "status" "event_outbox_status_enum" NOT NULL DEFAULT 'PENDING',
        "retry_count" integer NOT NULL DEFAULT 0,
        "last_error" text,
        "processed_at" TIMESTAMP WITH TIME ZONE,
        "correlation_id" character varying,
        "caused_by" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_outbox" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for efficient querying
    await queryRunner.query(`
      CREATE INDEX "IDX_event_outbox_status_created" ON "event_outbox" ("status", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_event_outbox_aggregate" ON "event_outbox" ("aggregate_type", "aggregate_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_event_outbox_event_type" ON "event_outbox" ("event_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_event_outbox_status" ON "event_outbox" ("status")
    `);

    // Add comment explaining the table's purpose
    await queryRunner.query(`
      COMMENT ON TABLE "event_outbox" IS 'Outbox pattern table for reliable event publishing. Events are stored here within the same transaction as domain changes, then asynchronously published to RabbitMQ.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_event_outbox_status"`);
    await queryRunner.query(`DROP INDEX "IDX_event_outbox_event_type"`);
    await queryRunner.query(`DROP INDEX "IDX_event_outbox_aggregate"`);
    await queryRunner.query(`DROP INDEX "IDX_event_outbox_status_created"`);
    await queryRunner.query(`DROP TABLE "event_outbox"`);
    await queryRunner.query(`DROP TYPE "event_outbox_status_enum"`);
  }
}

