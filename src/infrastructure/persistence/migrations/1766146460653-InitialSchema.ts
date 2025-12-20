import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1766146460653 implements MigrationInterface {
    name = 'InitialSchema1766146460653'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "verification_logs" ("id" varchar PRIMARY KEY NOT NULL, "providerId" varchar NOT NULL, "countryCode" varchar NOT NULL, "status" varchar NOT NULL, "method" varchar NOT NULL, "confidenceScore" float NOT NULL, "attributes" text, "metadata" text, "timestamp" datetime NOT NULL DEFAULT (datetime('now')))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "verification_logs"`);
    }

}
