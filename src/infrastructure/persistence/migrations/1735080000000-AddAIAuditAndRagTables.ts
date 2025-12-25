import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAIAuditAndRagTables1735080000000 implements MigrationInterface {
  name = 'AddAIAuditAndRagTables1735080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // AI Audit Logs table
    await queryRunner.query(`
      CREATE TABLE "ai_audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "countryCode" character varying NOT NULL,
        "status" character varying NOT NULL,
        "confidenceScore" float NOT NULL,
        "model" character varying NOT NULL,
        "providerId" character varying NOT NULL,
        "isFromCache" boolean NOT NULL DEFAULT false,
        "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for AI audit logs
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_audit_country_timestamp" ON "ai_audit_logs" ("countryCode", "timestamp")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_audit_status_timestamp" ON "ai_audit_logs" ("status", "timestamp")
    `);

    // Regulation Embeddings table for RAG
    await queryRunner.query(`
      CREATE TABLE "regulation_embeddings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "countryCode" character varying NOT NULL,
        "category" character varying NOT NULL,
        "content" text NOT NULL,
        "chunkId" text NOT NULL,
        "embedding" text,
        "source" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_regulation_embeddings" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for regulation embeddings
    await queryRunner.query(`
      CREATE INDEX "IDX_regulation_country" ON "regulation_embeddings" ("countryCode")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_regulation_category" ON "regulation_embeddings" ("category")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_regulation_category"`);
    await queryRunner.query(`DROP INDEX "IDX_regulation_country"`);
    await queryRunner.query(`DROP INDEX "IDX_ai_audit_status_timestamp"`);
    await queryRunner.query(`DROP INDEX "IDX_ai_audit_country_timestamp"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "regulation_embeddings"`);
    await queryRunner.query(`DROP TABLE "ai_audit_logs"`);
  }
}
