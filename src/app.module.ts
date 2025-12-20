import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validationSchema } from './common/config/validation.schema';
import { VerifyProviderUseCase } from './application/use-cases/verify-provider.use-case';
// Registry Adapters - Live API Countries Only
import { UsNpiRegistryAdapter } from './infrastructure/adapters/registry/us-npi.adapter';
import { FrAnsRegistryAdapter } from './infrastructure/adapters/registry/fr-ans.adapter';
import { AeDhaRegistryAdapter } from './infrastructure/adapters/registry/ae-dha.adapter';
import { KeKmpdcRegistryAdapter } from './infrastructure/adapters/registry/ke-kmpdc.adapter';
import { NlBigRegistryAdapter } from './infrastructure/adapters/registry/nl-big.adapter';
import { IlMohRegistryAdapter } from './infrastructure/adapters/registry/il-moh.adapter';
import { MxSepRegistryAdapter } from './infrastructure/adapters/registry/mx-sep.adapter';
// Document Verifiers (AI fallback for unsupported countries)
import { MockDocumentVerifier } from './infrastructure/adapters/document/mock-document.verifier';
import { OpenAiDocumentVerifier } from './infrastructure/adapters/document/openai-document.verifier';
// Controllers
import { VerificationController } from './infrastructure/controllers/verification.controller';
import { HealthController } from './infrastructure/controllers/health.controller';
import { RootController } from './infrastructure/controllers/root.controller';
// Persistence
import { VerificationLogEntity } from './infrastructure/persistence/entities/verification-log.entity';
import { TypeOrmVerificationRepository } from './infrastructure/persistence/repositories/typeorm-verification.repository';
// Services
import { MonitoringService } from './infrastructure/jobs/monitoring.service';
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
            synchronize: false,
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
    TypeOrmModule.forFeature([VerificationLogEntity]),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    AuthModule,
    TerminusModule,
  ],
  controllers: [VerificationController, HealthController, RootController],
  providers: [
    VerifyProviderUseCase,
    // Live API Registry Adapters Only
    UsNpiRegistryAdapter, // 🇺🇸 USA - NPI (NPPES) - Fully Public
    FrAnsRegistryAdapter, // 🇫🇷 France - ANS (FHIR API)
    AeDhaRegistryAdapter, // 🇦🇪 UAE - DHA (Dubai Pulse)
    KeKmpdcRegistryAdapter, // 🇰🇪 Kenya - KMPDC (Intellex API)
    NlBigRegistryAdapter, // 🇳🇱 Netherlands - BIG-register (SOAP)
    IlMohRegistryAdapter, // 🇮🇱 Israel - MOH (CKAN)
    MxSepRegistryAdapter, // 🇲🇽 Mexico - SEP (RapidAPI)
    // Document Verifiers (AI handles unsupported countries)
    MockDocumentVerifier,
    OpenAiDocumentVerifier,
    TypeOrmVerificationRepository,
    MonitoringService,
    // Dependency Injection Bindings
    {
      provide: 'RegistryAdapters',
      useFactory: (
        us: UsNpiRegistryAdapter,
        fr: FrAnsRegistryAdapter,
        ae: AeDhaRegistryAdapter,
        ke: KeKmpdcRegistryAdapter,
        nl: NlBigRegistryAdapter,
        il: IlMohRegistryAdapter,
        mx: MxSepRegistryAdapter,
      ) => [us, fr, ae, ke, nl, il, mx],
      inject: [
        UsNpiRegistryAdapter,
        FrAnsRegistryAdapter,
        AeDhaRegistryAdapter,
        KeKmpdcRegistryAdapter,
        NlBigRegistryAdapter,
        IlMohRegistryAdapter,
        MxSepRegistryAdapter,
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
