import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('ai_audit_logs')
@Index(['countryCode', 'timestamp'])
@Index(['status', 'timestamp'])
export class AIAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  countryCode!: string;

  @Column()
  status!: string;

  @Column('float')
  confidenceScore!: number;

  @Column()
  model!: string;

  @Column()
  providerId!: string;

  @Column({ default: false })
  isFromCache!: boolean;

  @CreateDateColumn()
  timestamp!: Date;
}
