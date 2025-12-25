import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Initial database schema migration for VeriMed.
 *
 * Creates all core tables:
 * - verification_logs
 * - credential_badges
 * - ai_audit_logs
 * - regulation_embeddings
 */
export class InitialSchema1703500000000 implements MigrationInterface {
  name = 'InitialSchema1703500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verification Logs Table
    await queryRunner.createTable(
      new Table({
        name: 'verification_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'provider_id', type: 'varchar', length: '255' },
          { name: 'country_code', type: 'varchar', length: '2' },
          { name: 'status', type: 'varchar', length: '50' },
          { name: 'method', type: 'varchar', length: '50' },
          {
            name: 'confidence_score',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          { name: 'attributes', type: 'jsonb', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'verification_logs',
      new TableIndex({
        name: 'IDX_verification_logs_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'verification_logs',
      new TableIndex({
        name: 'IDX_verification_logs_timestamp',
        columnNames: ['timestamp'],
      }),
    );

    // Credential Badges Table
    await queryRunner.createTable(
      new Table({
        name: 'credential_badges',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'provider_id', type: 'varchar', length: '255' },
          { name: 'badge_type', type: 'varchar', length: '50' },
          { name: 'verified_at', type: 'timestamp' },
          { name: 'expires_at', type: 'timestamp', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // AI Audit Logs Table
    await queryRunner.createTable(
      new Table({
        name: 'ai_audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          { name: 'agent_id', type: 'varchar', length: '255' },
          { name: 'action', type: 'varchar', length: '100' },
          {
            name: 'input_hash',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          { name: 'output_summary', type: 'text', isNullable: true },
          { name: 'tokens_used', type: 'integer', isNullable: true },
          {
            name: 'cost_usd',
            type: 'decimal',
            precision: 10,
            scale: 6,
            isNullable: true,
          },
          { name: 'metadata', type: 'jsonb', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'ai_audit_logs',
      new TableIndex({
        name: 'IDX_ai_audit_logs_agent_id',
        columnNames: ['agent_id'],
      }),
    );

    // Regulation Embeddings Table (for RAG)
    await queryRunner.createTable(
      new Table({
        name: 'regulation_embeddings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'country_code', type: 'varchar', length: '2' },
          { name: 'regulation_type', type: 'varchar', length: '100' },
          { name: 'content', type: 'text' },
          { name: 'embedding', type: 'vector(1536)', isNullable: true }, // OpenAI embedding dimension
          { name: 'metadata', type: 'jsonb', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('regulation_embeddings');
    await queryRunner.dropTable('ai_audit_logs');
    await queryRunner.dropTable('credential_badges');
    await queryRunner.dropTable('verification_logs');
  }
}
