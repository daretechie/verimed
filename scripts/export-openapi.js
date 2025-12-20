const { NestFactory } = require('@nestjs/core');
const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
const { AppModule } = require('../dist/src/app.module');
const fs = require('fs');
const path = require('path');

// Mock helpers to prevent startup errors during static analysis
// We only need the metadata for Swagger generation
process.env.DATABASE_URL = ''; // Trigger SQLite fallback
process.env.API_KEY = 'mock';
process.env.JWT_SECRET = 'mock';
process.env.ADMIN_PASS = 'mock';

async function generateOpenApi() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('VeriMed API')
    .setDescription('The VeriMed Global Provider Verification API')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  const outputPath = path.resolve(__dirname, '../openapi.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
  
  console.log(`OpenAPI spec generated at ${outputPath}`);
  await app.close();
  process.exit(0);
}

generateOpenApi().catch(err => {
  console.error(err);
  process.exit(1);
});
