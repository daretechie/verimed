import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entity for storing regulation text embeddings.
 *
 * Note: For production with pgvector, the 'embedding' column would be:
 * @Column('vector', { array: true, nullable: true })
 *
 * For now, we store embeddings as JSON for SQLite compatibility.
 */
@Entity('regulation_embeddings')
@Index(['countryCode'])
@Index(['category'])
export class RegulationEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  countryCode!: string;

  @Column()
  category!: string; // e.g., 'license_requirements', 'renewal_rules', 'specialization'

  @Column('text')
  content!: string; // The original regulation text

  @Column('text')
  chunkId!: string; // For tracking document chunks

  @Column('simple-json', { nullable: true })
  embedding!: number[]; // 1536-dimensional vector (OpenAI ada-002) or 256 (text-embedding-3-small)

  @Column({ nullable: true })
  source!: string; // URL or document reference

  @CreateDateColumn()
  createdAt!: Date;
}
