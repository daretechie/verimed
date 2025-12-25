import { Injectable, Logger } from '@nestjs/common';
import { VectorStoreService, SimilarityResult } from './vector-store.service';
import { RegulationEmbedderService } from './regulation-embedder.service';

export interface VerificationContext {
  countryCode: string;
  relevantRegulations: string[];
  sources: string[];
}

@Injectable()
export class ContextRetrieverService {
  private readonly logger = new Logger(ContextRetrieverService.name);

  constructor(
    private vectorStore: VectorStoreService,
    private embedder: RegulationEmbedderService,
  ) {}

  /**
   * Retrieve relevant context for a verification request
   */
  async getVerificationContext(
    countryCode: string,
    query: string = 'medical license verification requirements',
  ): Promise<VerificationContext> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.embedder.generateEmbedding(query);

      // Search for similar regulations
      const results = await this.vectorStore.similaritySearch(
        queryEmbedding,
        countryCode,
        3, // Top 3 most relevant
      );

      const context: VerificationContext = {
        countryCode,
        relevantRegulations: results.map((r) => r.content),
        sources: results
          .map((r) => r.category)
          .filter((v, i, a) => a.indexOf(v) === i), // Unique
      };

      this.logger.log(
        `[Context Retriever] Found ${results.length} relevant regulations for ${countryCode}`,
      );
      return context;
    } catch (error) {
      this.logger.warn(
        `[Context Retriever] Failed to retrieve context: ${error}`,
      );
      return {
        countryCode,
        relevantRegulations: [],
        sources: [],
      };
    }
  }

  /**
   * Format context for injection into AI prompt
   */
  formatContextForPrompt(context: VerificationContext): string {
    if (context.relevantRegulations.length === 0) {
      return '';
    }

    const header = `\n### RELEVANT REGULATIONS FOR ${context.countryCode}:\n`;
    const regulations = context.relevantRegulations
      .map((r, i) => `[${i + 1}] ${r}`)
      .join('\n\n');
    const footer = '\n### END OF REGULATIONS\n';

    return header + regulations + footer;
  }
}
