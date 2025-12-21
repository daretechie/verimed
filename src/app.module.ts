import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validationSchema } from './common/config/validation.schema';
import { VerifyProviderUseCase } from './application/use-cases/verify-provider.use-case';
// Registry Adapters - Official Government APIs Only (5 countries)
import { UsNpiRegistryAdapter } from './infrastructure/adapters/registry/us-npi.adapter';
import { FrAnsRegistryAdapter } from './infrastructure/adapters/registry/fr-ans.adapter';
import { AeDhaRegistryAdapter } from './infrastructure/adapters/registry/ae-dha.adapter';
import { NlBigRegistryAdapter } from './infrastructure/adapters/registry/nl-big.adapter';
import { IlMohRegistryAdapter } from './infrastructure/adapters/registry/il-moh.adapter';
// Document Verifiers (AI verification for unsupported countries)
import { MockDocumentVerifier } from './infrastructure/adapters/document/mock-document.verifier';
import { OpenAiDocumentVerifier } from './infrastructure/adapters/document/openai-document.verifier';
// Controllers
import { VerificationController } from './infrastructure/controllers/verification.controller';
import { HealthController } from './infrastructure/controllers/health.controller';
import { RootController } from './infrastructure/controllers/root.controller';
import { BadgeController } from './infrastructure/controllers/badge.controller';
// Persistence
import { VerificationLogEntity } from './infrastructure/persistence/entities/verification-log.entity';
import { CredentialBadgeEntity } from './infrastructure/persistence/entities/credential-badge.entity';
import { TypeOrmVerificationRepository } from './infrastructure/persistence/repositories/typeorm-verification.repository';
// Services
import { MonitoringService } from './infrastructure/jobs/monitoring.service';
import { SanctionsCheckService } from './infrastructure/services/sanctions-check.service';
import { LeieService } from './infrastructure/services/leie.service';
import { WebhookService } from './infrastructure/services/webhook.service';
import { CredentialBadgeService } from './infrastructure/services/credential-badge.service';
import { AuthModule } from './infrastructure/auth/auth.module';
import { TerminusModule } from '@nestjs/terminus';

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
          entities: [VerificationLogEntity],
          synchronize: true,
        };
      },
    }),
    TypeOrmModule.forFeature([VerificationLogEntity, CredentialBadgeEntity]),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    AuthModule,
    TerminusModule,
  ],
  controllers: [
    VerificationController,
    HealthController,
    RootController,
    BadgeController,
  ],
  providers: [
    VerifyProviderUseCase,
    // Official Government API Registry Adapters (5 countries)
    UsNpiRegistryAdapter, // 🇺🇸 USA - NPI (CMS NPPES) - Free Public API
    FrAnsRegistryAdapter, // 🇫🇷 France - ANS (FHIR API) - Free with registration
    AeDhaRegistryAdapter, // 🇦🇪 UAE - DHA (Dubai Pulse) - Free Gov Portal
    NlBigRegistryAdapter, // 🇳🇱 Netherlands - BIG-register (SOAP) - Free Gov API
    IlMohRegistryAdapter, // 🇮🇱 Israel - MOH (CKAN) - Free Gov Portal
    // Document Verifiers (AI handles unsupported countries - document required)
    MockDocumentVerifier,
    OpenAiDocumentVerifier,
    TypeOrmVerificationRepository,
    MonitoringService,
    LeieService, // OIG LEIE database (CSV cache + indexing)
    SanctionsCheckService, // Combined sanctions checking (OIG LEIE + GSA SAM)
    WebhookService, // Webhook notifications for verification events
    CredentialBadgeService, // Digital credential badges with QR codes
    // Dependency Injection Bindings
    {
      provide: 'RegistryAdapters',
      useFactory: (
        us: UsNpiRegistryAdapter,
        fr: FrAnsRegistryAdapter,
        ae: AeDhaRegistryAdapter,
        nl: NlBigRegistryAdapter,
        il: IlMohRegistryAdapter,
      ) => [us, fr, ae, nl, il],
      inject: [
        UsNpiRegistryAdapter,
        FrAnsRegistryAdapter,
        AeDhaRegistryAdapter,
        NlBigRegistryAdapter,
        IlMohRegistryAdapter,
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
  ],
})
export class AppModule {}
