# VeriMed Architecture & Design Decisions

> **Version**: 1.0 | **Updated**: December 2025

## Overview

VeriMed is an open-source healthcare credential verification API designed for **NCQA 2025 compliance**. This document explains the architectural decisions and their rationale.

---

## Core Principles

| Principle | Rationale |
|-----------|-----------|
| **Official APIs Only** | Third-party APIs lack SLA guarantees; web scraping violates ToS |
| **Primary Source Verification** | NCQA requires PSV from original issuing organizations |
| **Document Required for Unsupported** | Ensures audit trail for countries without official APIs |
| **120-Day Verification Windows** | NCQA 2025 accreditation requirement |

---

## Country Coverage Strategy

### Supported Countries (5)

We only include countries with **free, official government APIs**:

| Country | Registry | API | Rationale |
|---------|----------|-----|-----------|
| 🇺🇸 USA | NPI | CMS NPPES | Federal gov, free, comprehensive |
| 🇫🇷 France | ANS | FHIR v2 | Gov agency, standardized |
| 🇦🇪 UAE | DHA | Dubai Pulse | Gov open data portal |
| 🇳🇱 Netherlands | BIG | CIBG SOAP | Official registry |
| 🇮🇱 Israel | MOH | CKAN | Gov data portal |

### Removed Countries (6)

| Country | Previous Method | Removal Reason |
|---------|-----------------|----------------|
| 🇬🇧 UK | Web scraping | Violates GMC Terms of Service, UK GDPR |
| 🇨🇦 Canada | RapidAPI | Third-party, no official source |
| 🇮🇳 India | Surepass | Paid third-party, no SLA |
| 🇸🇦 Saudi Arabia | Web scraping | No official API, legal risk |
| 🇰🇪 Kenya | Intellex | Paid third-party aggregator |
| 🇲🇽 Mexico | RapidAPI | Third-party, not official |

### Unsupported Countries

For countries without official APIs, users **must upload documents**:
- Medical license/certificate (required)
- National ID/Passport (recommended for higher confidence)

AI document verification provides fallback with confidence scoring.

---

## Compliance Features

### 1. Audit Trails

Every verification is logged to `verification_logs` table:
- Provider ID, country code, status, method
- Confidence score, metadata
- Timestamp (automatic)
- Verification source (PRIMARY_SOURCE, DOCUMENT_AI)

### 2. Sanctions Checking

For US providers, check federal exclusion lists:

| List | Source | Status |
|------|--------|--------|
| GSA SAM | api.sam.gov | ✅ Integrated |
| OIG LEIE | exclusions.oig.hhs.gov | ✅ Integrated |

### 3. 120-Day Verification Windows

NCQA 2025 requires PSV within 120 days for accreditation:

- `expiresAt` column tracks expiration (120 days from verification)
- Daily cron at 6 AM checks for expiring verifications (14-day warning)
- Weekly cron auto-reverifies expired providers
- `needsReverification()` method for on-demand checks

---

## Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                     Controller Layer                         │
│  VerificationController → Rate Limited → API Key Protected  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Use Case Layer                            │
│              VerifyProviderUseCase                           │
│     (orchestrates adapters, documents, sanctions)            │
└─────────────────────────────────────────────────────────────┘
                            │
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Registry    │  │  Document    │  │  Sanctions   │
│  Adapters    │  │  Verifier    │  │  Checker     │
│ (5 countries)│  │ (OpenAI)     │  │ (GSA/OIG)    │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Security Measures

| Feature | Implementation |
|---------|----------------|
| API Key Required | `X-API-Key` header on all endpoints |
| Rate Limiting | 10 requests per minute per IP |
| Input Validation | class-validator DTOs |
| File Upload Validation | MIME type + magic bytes |
| HTTPS Only | TLS 1.3 recommended |

---

## Future Considerations

| Feature | Priority | Status |
|---------|----------|--------|
| Batch Verification API | Medium | Not yet |
| Webhook Notifications | Medium | Not yet |
| Additional Countries | Low | Community-contributed |

---

## References

- [NCQA 2025 Credentialing Standards](https://www.ncqa.org/)
- [OIG LEIE Database](https://oig.hhs.gov/exclusions/)
- [GSA SAM.gov API](https://api.sam.gov/)
