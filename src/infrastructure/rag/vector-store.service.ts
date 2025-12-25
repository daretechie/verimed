import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegulationEmbedding } from './entities/regulation-embedding.entity';

export interface SimilarityResult {
  id: string;
  content: string;
  countryCode: string;
  category: string;
  score: number;
}

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(
    @InjectRepository(RegulationEmbedding)
    private readonly embeddingRepo: Repository<RegulationEmbedding>,
  ) {}

  /**
   * Add a document with its embedding to the vector store
   */
  async addDocument(
    countryCode: string,
    category: string,
    content: string,
    embedding: number[],
    source?: string,
  ): Promise<string> {
    const chunkId = `${countryCode}-${category}-${Date.now()}`;

    const entity = this.embeddingRepo.create({
      countryCode,
      category,
      content,
      embedding,
      chunkId,
      source,
    });

    const saved = await this.embeddingRepo.save(entity);
    this.logger.log(`[Vector Store] Added document: ${chunkId}`);
    return saved.id;
  }

  /**
   * Perform similarity search using cosine similarity
   *
   * Note: For production with pgvector, this would use:
   * SELECT *, 1 - (embedding <=> $1) as similarity
   * FROM regulation_embeddings
   * ORDER BY embedding <=> $1
   * LIMIT $2
   */
  async similaritySearch(
    queryEmbedding: number[],
    countryCode: string,
    limit: number = 5,
  ): Promise<SimilarityResult[]> {
    // Fetch all embeddings for the country (in production, use pgvector operators)
    const candidates = await this.embeddingRepo.find({
      where: { countryCode },
    });

    if (candidates.length === 0) {
      this.logger.debug(
        `[Vector Store] No embeddings found for ${countryCode}`,
      );
      return [];
    }

    // Calculate cosine similarity
    const scored = candidates.map((doc) => ({
      id: doc.id,
      content: doc.content,
      countryCode: doc.countryCode,
      category: doc.category,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding || []),
    }));

    // Sort by score descending and take top N
    const results = scored.sort((a, b) => b.score - a.score).slice(0, limit);

    this.logger.debug(
      `[Vector Store] Found ${results.length} similar documents for ${countryCode}`,
    );
    return results;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}
