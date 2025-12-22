import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security: Set various HTTP headers to help protect the app
  app.use(helmet());

  // Performance: Compress response bodies
  app.use(compression());

  // CORS Configuration
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') ?? '*';
  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.enableShutdownHooks(); // Reliability: Ensure DB connections close gracefully

  // Validation & Error Handling
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  // API Versioning (e.g., /v1/verify)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const config = new DocumentBuilder()
    .setTitle('VeriMed API')
    .setDescription('The VeriMed Global Provider Verification API')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const portStr = process.env.PORT ?? '3000';
  const port = parseInt(portStr, 10);
  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}/api`);
}
void bootstrap();
