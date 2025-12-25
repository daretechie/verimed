import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { VectorStoreService } from './vector-store.service';

@Injectable()
export class RegulationEmbedderService {
  private readonly logger = new Logger(RegulationEmbedderService.name);
  private openai?: OpenAI;
  private readonly embeddingModel = 'text-embedding-3-small';

  constructor(
    private config: ConfigService,
    private vectorStore: VectorStoreService,
  ) {
    const apiKey = this.config.get<string>('AI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Generate embedding for a text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openai.embeddings.create({
      model: this.embeddingModel,
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * Chunk a long document into smaller pieces for better retrieval
   */
  chunkDocument(
    text: string,
    chunkSize: number = 500,
    overlap: number = 50,
  ): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.length > 50) {
        // Skip very small chunks
        chunks.push(chunk);
      }
    }

    this.logger.debug(
      `[Embedder] Created ${chunks.length} chunks from document`,
    );
    return chunks;
  }

  /**
   * Process and store a regulation document
   */
  async indexRegulation(
    countryCode: string,
    category: string,
    content: string,
    source?: string,
  ): Promise<number> {
    const chunks = this.chunkDocument(content);
    let indexed = 0;

    for (const chunk of chunks) {
      try {
        const embedding = await this.generateEmbedding(chunk);
        await this.vectorStore.addDocument(
          countryCode,
          category,
          chunk,
          embedding,
          source,
        );
        indexed++;
      } catch (error) {
        this.logger.error(`Failed to index chunk: ${error}`);
      }
    }

    this.logger.log(
      `[Embedder] Indexed ${indexed}/${chunks.length} chunks for ${countryCode}/${category}`,
    );
    return indexed;
  }
}
