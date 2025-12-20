import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('verification_logs')
export class VerificationLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  providerId: string;

  @Column()
  countryCode: string;

  @Column()
  status: string; // VERIFIED, REJECTED, etc.

  @Column()
  method: string; // API_REGISTRY, AI_DOCUMENT

  @Column('float')
  confidenceScore: number;

  @Column('simple-json', { nullable: true })
  attributes: Record<string, any>;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;
}
