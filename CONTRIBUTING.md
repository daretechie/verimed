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

### 3. Implement Unit Tests

Create a test file `src/infrastructure/adapters/registry/{cc}-{registry}.adapter.spec.ts` to ensure your adapter works correctly.
- Test `supports()` with valid and invalid country codes.
- Test `verify()` with valid/invalid licenses, not found scenarios, and API errors.
- Mock external API calls (e.g., using `jest.mock`).

### 4. Register in AppModule

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

For countries without official free government APIs, VeriMed uses AI document verification. **Document upload is required** for unsupported countries.

## Currently Supported Countries (Official Government APIs)

We only include countries with **free, official government APIs** for reliable Primary Source Verification:

| Country | Registry | API Source | Status |
|---------|----------|------------|--------|
| 🇺🇸 **USA** | NPI (NPPES) | CMS Federal Gov | ✅ Live |
| 🇫🇷 **France** | RPPS (ANS) | Agence du Numérique en Santé | ✅ Live |
| 🇦🇪 **UAE** | DHA | Dubai Pulse Gov Portal | ✅ Live |
| 🇳🇱 **Netherlands** | BIG-register | CIBG Gov Agency | ✅ Live |
| 🇮🇱 **Israel** | MOH | data.gov.il | ✅ Live |

### Adding a New Country

> [!IMPORTANT]
> We only accept new country adapters that use **free, official government APIs**.
> Third-party paid APIs (RapidAPI, etc.) and web scraping are not accepted.

**Requirements for new country adapters:**
1. Must use an **official government API** (no third-party aggregators)
2. Must be **free** (no paid API keys required)
3. No **web scraping** (violates ToS, unreliable)
4. Include **unit tests** with 100% coverage

### Countries We'd Love to Add (If Official APIs Exist)

| Country | Registry | Notes |
|---------|----------|-------|
| 🇦🇺 **Australia** | AHPRA | Has API but requires commercial contract |
| 🇯🇵 **Japan** | JMA | Need contributor to research |
| 🇩🇪 **Germany** | BÄK | No public API found |
| 🇧🇷 **Brazil** | CFM | Paid web service (R$772/year) |


## Testing Requirements

When adding a new adapter, please include:

1. **Unit tests** in `src/infrastructure/adapters/registry/{cc}-{registry}.adapter.spec.ts`
2. **E2E test case** for the new country in `test/verification.e2e-spec.ts`
3. **Documentation** updates to this file and `README.md`

> 🎯 **Coverage Target: 100%** - All new code must have complete test coverage.

---

## Upcoming Features

VeriMed is actively developing these enterprise features:

| Feature | Description | Status |
|---------|-------------|--------|
| **Batch Verification** | Verify hundreds of providers in one API call | 🚧 Planned |
| **Global Sanctions Checking** | OIG LEIE, SAM.gov, UK GMC FtP, OFAC | 🚧 Planned |
| **Continuous Monitoring** | Automated license expiration alerts | 🚧 Planned |
| **Credential Wallet** | Digital badges with QR verification | 🚧 Planned |
| **Interstate Compact Support** | IMLC/NLC recognition | 🚧 Planned |

---

## Questions?

Open an issue on GitHub or check existing adapters for reference.
