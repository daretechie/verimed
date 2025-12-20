# Contributing Country Adapters to VeriMed

Thank you for your interest in expanding VeriMed's global coverage! This guide explains how to add support for new countries.

## Architecture Overview

VeriMed uses the **Ports and Adapters** pattern. Each country adapter:
- Implements the `IRegistryAdapter` interface
- Provides a `supports(countryCode)` method
- Provides a `verify(request)` method

## Prerequisites for New Countries

Before adding a country, verify that:

1. ✅ A **public API** exists (free or with registration)
2. ✅ The API returns **license/registration status**
3. ✅ The API accepts **license number** as input
4. ✅ No **legal restrictions** on programmatic access

## Creating a New Adapter

### 1. Create the Adapter File

```bash
# Use ISO 3166-1 alpha-2 country codes
touch src/infrastructure/adapters/registry/{cc}-{registry}.adapter.ts
# Example: jp-jma.adapter.ts for Japan Medical Association
```

### 2. Implement the Interface

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { IRegistryAdapter } from '../../../domain/ports/registry-adapter.port';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationResult } from '../../../domain/entities/verification-result.entity';
import {
  VerificationStatus,
  VerificationMethod,
} from '../../../domain/enums/verification-status.enum';

@Injectable()
export class YourCountryRegistryAdapter implements IRegistryAdapter {
  private readonly logger = new Logger(YourCountryRegistryAdapter.name);
  private readonly API_BASE = 'https://api.example.gov/v1';

  supports(countryCode: string): boolean {
    return countryCode === 'XX'; // Your ISO country code
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    // 1. Validate license format
    // 2. Call the API
    // 3. Return VerificationResult
  }
}
```

### 3. Register in AppModule

Add your adapter to `src/app.module.ts`:

```typescript
import { YourCountryRegistryAdapter } from './infrastructure/adapters/registry/xx-registry.adapter';

// In providers array:
YourCountryRegistryAdapter,

// In RegistryAdapters factory:
{
  provide: 'RegistryAdapters',
  useFactory: (us, fr, ae, xx) => [us, fr, ae, xx],
  inject: [UsNpiRegistryAdapter, FrAnsRegistryAdapter, AeDhaRegistryAdapter, YourCountryRegistryAdapter],
}
```

## AI Fallback

For countries without registry APIs, VeriMed automatically uses AI document verification via the `DocumentVerifier`. This analyzes uploaded medical credentials.

## Currently Supported Countries

| Country | API | Status |
|---------|-----|--------|
| 🇺🇸 USA | NPI (NPPES) | ✅ Live |
| 🇫🇷 France | ANS (FHIR) | ✅ Live |
| 🇦🇪 UAE | DHA (Dubai Pulse) | ✅ Live |

## Questions?

Open an issue on GitHub or check existing adapters for reference.
