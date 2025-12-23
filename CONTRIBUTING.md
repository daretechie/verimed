# Contributing Country Adapters to VeriMed

Thank you for your interest in expanding VeriMed's global coverage! This guide explains how to add support for new countries.

## Architecture Overview

VeriMed uses the **Ports and Adapters** pattern. Each country adapter:
- Implements the `IRegistryAdapter` interface
- Provides a `supports(countryCode)` method
- Provides a `verify(request)` method

## Prerequisites for New Countries

Before adding a country, verify that:

1. ✅ An **API or data source** exists (official government preferred)
2. ✅ The API returns **license/registration status**
3. ✅ The API accepts **license number** as input
4. ✅ No **legal restrictions** on programmatic access (no web scraping)

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

For countries without official APIs, VeriMed uses AI document verification. **Document upload is required** for unsupported countries.

---

## Currently Supported Countries

| Country | Registry | API Source | Type | Status |
|---------|----------|------------|------|--------|
| 🇺🇸 **USA** | NPI (NPPES) | CMS Federal Gov | Free | ✅ Live |
| 🇫🇷 **France** | RPPS (ANS) | Agence du Numérique en Santé | Free | ✅ Live |
| 🇦🇪 **UAE** | DHA | Dubai Pulse Gov Portal | Free | ✅ Live |
| 🇳🇱 **Netherlands** | BIG-register | CIBG Gov Agency | Free | ✅ Live |
| 🇮🇱 **Israel** | MOH | data.gov.il | Free | ✅ Live |

---

## Adding a New Country

> [!IMPORTANT]
> We welcome contributions for new countries! We prioritize:
> 1. **Free, official government APIs** (best for open-source)
> 2. **Paid official APIs** (if no free option exists)
> 3. **Regulatory-compliant third-party services** (last resort)

### Contribution Priority

| Priority | Source Type | Requirements |
|----------|-------------|--------------|
| 🥇 **Highest** | Free official government API | Document the API source |
| 🥈 **High** | Paid official government API | Document pricing, include env var for API key |
| 🥉 **Acceptable** | Regulatory-compliant third-party | Must be from reputable provider, document compliance |
| ❌ **Not Accepted** | Web scraping | Violates ToS, unreliable, legal risk |

### Requirements for All Adapters

1. **Official or reputable source** (government preferred)
2. **No web scraping** (violates Terms of Service)
3. **Include unit tests** with high coverage
4. **Document the API** (pricing, registration, limitations)
5. **Add environment variable** for API keys if paid

### Countries We'd Love to Add

| Country | Registry | Notes | Type |
|---------|----------|-------|------|
| 🇦🇺 **Australia** | AHPRA | Commercial API available | Paid |
| 🇬🇧 **UK** | GMC | Paid API (£5,000+/year) | Paid |
| 🇯🇵 **Japan** | JMA | Need contributor to research | Unknown |
| 🇩🇪 **Germany** | BÄK | No public API found | N/A |
| 🇧🇷 **Brazil** | CFM | Paid web service (R$772/year) | Paid |
| 🇨🇦 **Canada** | CPSO | Province-level APIs | Mixed |
| 🇮🇳 **India** | NMC | Surepass available | Paid |
| 🇸🇦 **Saudi Arabia** | SCFHS | No official API | N/A |
| 🇿🇦 **South Africa** | HPCSA | Need contributor to research | Unknown |
| 🇳🇬 **Nigeria** | MDCN | Need contributor to research | Unknown |

---

## Testing Requirements

When adding a new adapter, please include:

1. **Unit tests** in `src/infrastructure/adapters/registry/{cc}-{registry}.adapter.spec.ts`
2. **E2E test case** for the new country in `test/verification.e2e-spec.ts`
3. **Documentation** updates to this file and `README.md`

> 🎯 **Coverage Target: 100%** - All new code must have complete test coverage.

---

## Implemented Features ✅

| Feature | Status | Details |
|---------|--------|---------|
| **Batch Verification** | ✅ Done | POST /verify/batch (up to 50 providers) |
| **OIG LEIE Sanctions** | ✅ Done | CSV cache with monthly refresh |
| **GSA SAM Sanctions** | ✅ Done | Live API integration |
| **Webhook Notifications** | ✅ Done | 5 event types with HMAC signing |
| **120-Day Verification Windows** | ✅ Done | Auto-alerts and re-verification |
| **Continuous Monitoring** | ✅ Done | Daily/weekly scheduled jobs |

## Planned Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Credential Wallet** | Digital badges with QR verification | 🚧 Planned |
| **Interstate Compact Support** | IMLC/NLC recognition | 🚧 Planned |
| **NPDB Integration** | National Practitioner Data Bank | 🚧 Planned |
| **DEA Verification** | Drug Enforcement Administration | 🚧 Planned |
| **ABMS Board Verification** | Specialty certifications | 🚧 Planned |
| **Mobile SDK** | iOS/Android verification | 🚧 Planned |

---

## Questions?

Open an issue on GitHub or check existing adapters for reference.
