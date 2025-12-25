import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validationSchema } from './common/config/validation.schema';
import { VerifyProviderUseCase } from './application/use-cases/verify-provider.use-case';
// Registry Adapters - Official Government APIs (8 countries)
import { UsNpiRegistryAdapter } from './infrastructure/adapters/registry/us-npi.adapter';
import { FrAnsRegistryAdapter } from './infrastructure/adapters/registry/fr-ans.adapter';
import { AeDhaRegistryAdapter } from './infrastructure/adapters/registry/ae-dha.adapter';
import { NlBigRegistryAdapter } from './infrastructure/adapters/registry/nl-big.adapter';
import { IlMohRegistryAdapter } from './infrastructure/adapters/registry/il-moh.adapter';
import { DeBaekRegistryAdapter } from './infrastructure/adapters/registry/de-baek.adapter';
import { ZaHpcsaRegistryAdapter } from './infrastructure/adapters/registry/za-hpcsa.adapter';
import { BrCfmRegistryAdapter } from './infrastructure/adapters/registry/br-cfm.adapter';
import { GbGmcRegistryAdapter } from './infrastructure/adapters/registry/gb-gmc.adapter';
import { CaProvincialRegistryAdapter } from './infrastructure/adapters/registry/ca-provincial.adapter';
import { AuAhpraRegistryAdapter } from './infrastructure/adapters/registry/au-ahpra.adapter';
// Document Verifiers (AI verification for unsupported countries)
import { MockDocumentVerifier } from './infrastructure/adapters/document/mock-document.verifier';
import { OpenAiDocumentVerifier } from './infrastructure/adapters/document/openai-document.verifier';
// Controllers
import { VerificationController } from './infrastructure/controllers/verification.controller';
import { HealthController } from './infrastructure/controllers/health.controller';
import { RootController } from './infrastructure/controllers/root.controller';
import { BadgeController } from './infrastructure/controllers/badge.controller';
import { UsComplianceController } from './infrastructure/controllers/us-compliance.controller';
import { AIController } from './infrastructure/controllers/ai.controller';
import { ManualReviewController } from './infrastructure/controllers/manual-review.controller';
// Persistence
import { VerificationLogEntity } from './infrastructure/persistence/entities/verification-log.entity';
import { CredentialBadgeEntity } from './infrastructure/persistence/entities/credential-badge.entity';
import { TypeOrmVerificationRepository } from './infrastructure/persistence/repositories/typeorm-verification.repository';
// Services
import { MonitoringService } from './infrastructure/jobs/monitoring.service';
import { SanctionsCheckService } from './infrastructure/services/sanctions-check.service';
import { LeieService } from './infrastructure/services/leie.service';
import { WebhookService } from './infrastructure/services/webhook.service';
import { AIMonitoringService } from './infrastructure/services/ai-monitoring.service';
import { CredentialBadgeService } from './infrastructure/services/credential-badge.service';
import { DeaVerificationService } from './infrastructure/services/dea-verification.service';
import { InterstateCompactService } from './infrastructure/services/interstate-compact.service';
import { AuthModule } from './infrastructure/auth/auth.module';
import { TerminusModule } from '@nestjs/terminus';
import { LicenseService } from './infrastructure/licensing/license.service';
import { AISafetyGuard } from './common/guards/ai-safety.guard';
import { AICacheService } from './infrastructure/services/ai-cache.service';
import { AIAuditService } from './infrastructure/services/ai-audit.service';
import { AIAuditLog } from './infrastructure/persistence/entities/ai-audit-log.entity';
import { RagModule } from './infrastructure/rag/rag.module';
import { RegulationEmbedding } from './infrastructure/rag/entities/regulation-embedding.entity';
import { DataRetentionService } from './infrastructure/services/data-retention.service';
import { ResilienceService } from './infrastructure/services/resilience.service';
import { ManualReviewService } from './infrastructure/services/manual-review.service';
import { ToolAccessPolicyService } from './infrastructure/services/tool-access-policy.service';
import { FairnessMetricsService } from './infrastructure/services/fairness-metrics.service';
import { AgentCoordinatorService } from './infrastructure/services/agent-coordinator.service';
import { ChaosController } from './infrastructure/controllers/chaos.controller';
import { PromptSecurityService } from './infrastructure/security/prompt-security.service';
import { ContextRetrieverService } from './infrastructure/rag/context-retriever.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        if (process.env.NODE_ENV === 'test') {
          return {
            type: 'sqlite',
            database: ':memory:',
            autoLoadEntities: true,
            synchronize: true,
          };
        }
        const dbUrl = config.get<string>('DATABASE_URL');
        if (dbUrl) {
          return {
            type: 'postgres',
            url: dbUrl,
            autoLoadEntities: true,
            synchronize: config.get('NODE_ENV') === 'test',
          };
        }
        return {
          type: 'sqlite',
          database: 'verimed.sqlite',
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
    TypeOrmModule.forFeature([
      VerificationLogEntity,
      CredentialBadgeEntity,
      AIAuditLog,
      RegulationEmbedding,
    ]),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    AuthModule,
    TerminusModule,
    RagModule,
  ],
  controllers: [
    VerificationController,
    HealthController,
    RootController,
    BadgeController,
    UsComplianceController,
    AIController,
    ManualReviewController,
    ChaosController,
  ],
  providers: [
    VerifyProviderUseCase,
    // Official Government API Registry Adapters (11 countries)
    UsNpiRegistryAdapter, // 🇺🇸 USA - NPI (CMS NPPES) - Free Public API
    FrAnsRegistryAdapter, // 🇫🇷 France - ANS (FHIR API) - Free with registration
    AeDhaRegistryAdapter, // 🇦🇪 UAE - DHA (Dubai Pulse) - Free Gov Portal
    NlBigRegistryAdapter, // 🇳🇱 Netherlands - BIG-register (SOAP) - Free Gov API
    IlMohRegistryAdapter, // 🇮🇱 Israel - MOH (CKAN) - Free Gov Portal
    DeBaekRegistryAdapter, // 🇩🇪 Germany - Bundesärztekammer - Manual Review
    ZaHpcsaRegistryAdapter, // 🇿🇦 South Africa - HPCSA - Manual Review
    BrCfmRegistryAdapter, // 🇧🇷 Brazil - CFM - Manual Review
    GbGmcRegistryAdapter, // 🇬🇧 UK - GMC - Manual Review (7-digit ref)
    CaProvincialRegistryAdapter, // 🇨🇦 Canada - Provincial Colleges - Multi-Province
    AuAhpraRegistryAdapter, // 🇦🇺 Australia - AHPRA - PIE API (contract required)
    // Document Verifiers (AI handles unsupported countries - document required)
    MockDocumentVerifier,
    OpenAiDocumentVerifier,
    TypeOrmVerificationRepository,
    MonitoringService,
    LeieService, // OIG LEIE database (CSV cache + indexing)
    SanctionsCheckService, // Combined sanctions checking (OIG LEIE + GSA SAM)
    WebhookService, // Webhook notifications for verification events
    CredentialBadgeService, // Digital credential badges with QR codes
    DeaVerificationService, // DEA registration number validation
    InterstateCompactService, // IMLC/NLC state compact eligibility
    LicenseService, // Enterprise License Management
    AISafetyGuard,
    AIMonitoringService,
    AICacheService,
    ManualReviewService,
    ToolAccessPolicyService,
    FairnessMetricsService,
    AgentCoordinatorService,
    PromptSecurityService,
    ContextRetrieverService,
    // Dependency Injection Bindings
    {
      provide: 'RegistryAdapters',
      useFactory: (
        us: UsNpiRegistryAdapter,
        fr: FrAnsRegistryAdapter,
        ae: AeDhaRegistryAdapter,
        nl: NlBigRegistryAdapter,
        il: IlMohRegistryAdapter,
        de: DeBaekRegistryAdapter,
        za: ZaHpcsaRegistryAdapter,
        br: BrCfmRegistryAdapter,
        uk: GbGmcRegistryAdapter,
        ca: CaProvincialRegistryAdapter,
        au: AuAhpraRegistryAdapter,
      ) => [us, fr, ae, nl, il, de, za, br, uk, ca, au],
      inject: [
        UsNpiRegistryAdapter,
        FrAnsRegistryAdapter,
        AeDhaRegistryAdapter,
        NlBigRegistryAdapter,
        IlMohRegistryAdapter,
        DeBaekRegistryAdapter,
        ZaHpcsaRegistryAdapter,
        BrCfmRegistryAdapter,
        GbGmcRegistryAdapter,
        CaProvincialRegistryAdapter,
        AuAhpraRegistryAdapter,
      ],
    },
    {
      provide: 'DocumentVerifier',
      inject: [ConfigService, MockDocumentVerifier, OpenAiDocumentVerifier],
      useFactory: (
        config: ConfigService,
        mock: MockDocumentVerifier,
        real: OpenAiDocumentVerifier,
      ) => (config.get('AI_API_KEY') ? real : mock),
    },
    {
      provide: 'VerificationRepository',
      useClass: TypeOrmVerificationRepository,
    },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    DataRetentionService,
    ResilienceService,
  ],
  exports: [VerifyProviderUseCase, ResilienceService],
})
export class AppModule {}
