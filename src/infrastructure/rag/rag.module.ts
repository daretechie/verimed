import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VectorStoreService } from './vector-store.service';
import { RegulationEmbedderService } from './regulation-embedder.service';
import { ContextRetrieverService } from './context-retriever.service';
import { RegulationEmbedding } from './entities/regulation-embedding.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RegulationEmbedding])],
  providers: [
    VectorStoreService,
    RegulationEmbedderService,
    ContextRetrieverService,
  ],
  exports: [ContextRetrieverService],
})
export class RagModule {}
