# VeriMed API

[![CI](https://github.com/daretechie/verimed/actions/workflows/ci.yml/badge.svg)](https://github.com/daretechie/verimed/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-24_LTS-green.svg)](https://nodejs.org/)
[![Sponsor](https://img.shields.io/badge/Sponsor-VeriMed-pink?logo=github-sponsors)](https://github.com/sponsors/daretechie)
[![Coverage](<https://img.shields.io/badge/Coverage-~75%25%20(illustrative)-green.svg>)](#)

> **Global Medical Provider Verification Engine**

<p align="center">
  <img src="docs/social-preview.png" alt="VeriMed - Global Medical Provider Verification API" width="800">
</p>

VeriMed is a professional-grade, hybrid verification platform designed to validate healthcare providers globally. It bridges the gap between official registries (e.g., US NPI) and AI-driven document analysis.

Check out our [Architecture Decision Records (ADR)](docs/adr) to understand the design choices behind VeriMed.

---

## 🚨 The Problem

Healthcare fraud costs **$68 billion annually**. In 2025, the DOJ charged 193 defendants in telemedicine fraud totaling $1.17 billion. Yet there's no unified, affordable way to verify if a "doctor" is actually licensed.

**Current reality:**

- 50+ different U.S. state licensing requirements
- Every country has different APIs (REST, SOAP, FHIR, CKAN)
- Enterprise solutions cost $25K-$50K+/year
- Manual credentialing takes **months** per provider

**VeriMed is an open-source API that standardizes medical provider verification across **11 Official Government Registries** (Points of Truth). It replaces inconsistent web scraping with direct, primary-source government integrations.

> 💡 **Want to help expand global coverage?** Contributors with knowledge of their country's medical registry can help add new adapters! See our [Contribution Guide](CONTRIBUTING.md).

---

## 🌍 Global Coverage

VeriMed integrates with **11 official government medical registries**:

### Full API Integration
| Country            | Registry     | API Technology | Source                       |
| ------------------ | ------------ | -------------- | ---------------------------- |
| 🇺🇸 **USA**         | NPI (NPPES)  | REST           | CMS Federal Gov              |
| 🇫🇷 **France**      | RPPS (ANS)   | FHIR v2        | Agence du Numérique en Santé |
| 🇦🇪 **UAE**         | DHA          | REST           | Dubai Pulse Gov Portal       |
| 🇳🇱 **Netherlands** | BIG-register | SOAP           | CIBG Gov Agency              |
| 🇮🇱 **Israel**      | MOH          | CKAN           | data.gov.il                  |

### Manual Review Integration
| Country            | Registry     | License Format | Status                       |
| ------------------ | ------------ | -------------- | ---------------------------- |
| 🇬🇧 **UK**          | GMC          | 7 digits       | Online Register Search       |
| 🇨🇦 **Canada**      | Provincial   | Province-specific | CPSO, CPSBC, CPSA, CMQ    |
| 🇦🇺 **Australia**   | AHPRA        | MED0001234567  | PIE API (Contract Required)  |
| 🇩🇪 **Germany**     | BÄK          | Arztnummer     | 17 State Chambers            |
| 🇿🇦 **South Africa**| HPCSA        | MP/MPS+digits  | iRegister Portal             |
| 🇧🇷 **Brazil**      | CFM          | CRM-XX/NUMBER  | 27 Regional Councils         |
### 🤖 AI Document Verification (All Other Countries)

For countries **without official free APIs**, VeriMed uses AI-powered document verification:

| Feature                | Description                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| **Document Required**  | Medical license/certificate upload is mandatory                                                        |
| **AI Analysis**        | OpenAI Vision extracts and validates credentials                                                       |
| **Confidence Scoring** | 0-100% confidence based on document quality                                                            |
| **Audit Trail**        | All uploads logged for compliance                                                                      |
| **BYOK Architecture**  | **Bring Your Own Key**: You strictly control your own OpenAI API keys. Data never leaves your control. |

> [!IMPORTANT]
> For unsupported countries, uploading a valid **Medical License** document is **required**. Adding a **National ID/Passport** increases confidence scores.

---

## 🛠 Two-Path Strategy

VeriMed is designed for both rapid exploration by developers and robust deployment by DevOps engineers.

## 🚀 Quick Start

### Quick Start (Source)

Since VeriMed is currently in active development, valid extraction from source is the recommended method.

1.  **Clone the repository**

    ```bash
    git clone https://github.com/daretechie/verimed.git
    cd verimed
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Generate Secrets**

    ```bash
    npm run generate-secrets
    ```

4.  **Start the Server**
    ```bash
    npm run start:dev
    ```

## 💎 Enterprise Edition

Need **SSO (Okta/Azure)**, **Batch Verification**, or **Audit Logs**?
Upgrade to VeriMed Enterprise to unlock these features effectively.

- [x] **Single Sign-On (SAML 2.0)**
- [x] **Batch Processing APIs**
- [x] **Dedicated Support**

[**Contact Sales for a License Key**](mailto:sales@verimed.com) or [**Read the Docs**](docs/ENTERPRISE.md).

## 🔒 Configuration

### 1. The Developer Path (KISS)

Designed for local development and rapid testing.

- **Database:** Auto-configured SQLite (`verimed.sqlite`).
- **Schema:** Automatically kept in sync for local iterations.
- **Fast Start:**
  ```bash
  npm install
  cp .env.example .env
  npm run generate-secrets  # <--- CRITICAL: Generates secure keys for .env
  npm run start:dev
  ```

### 2. The Enterprise Path (Production)

Designed for high-scale, secure deployment.

- **Security:** Strict API Key enforcement + JWT-protected Administrative reviews.
- **Intelligence:** Built-in **Fuzzy Name Matching** to handle registry name variations.
- **Reliability:** Deep health monitoring (`/health`) for DB and AI services.
- **DevOps Ready:**
  - **Docker:** Multi-stage, secure-slim build.
  - **Kubernetes:** Manifests included for HPA-ready deployments.
  - **Migrations:** Professional TypeORM migration infra (no auto-sync in production).

---

## 🚀 Pro-Features

### Fuzzy Identity Validation

The engine uses **Fuse.js** logic to compare user-provided names with official registry data, allowing for variations (e.g., "Greg" vs "Gregory") while maintaining security.

### Batch Verification

Verify up to **50 providers** in a single API call:

```bash
curl -X POST http://localhost:3000/verify/batch \
  -H "x-api-key: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"providers": [{"providerId": "001", "countryCode": "US", ...}, ...]}'
```

### Webhook Notifications

Receive real-time notifications for verification events:

- `verification.completed` - When verification finishes
- `verification.expiring_soon` - 14 days before expiration
- `verification.expired` - When 120-day window passes
- `batch.completed` - When batch processing finishes
- `sanctions.match` - When provider is on exclusion list

### Credential Badges with QR Codes

Generate portable, verifiable credentials for providers:

- **QR Code Generation** - Instant mobile verification
- **Short Codes** - 8-character codes for easy sharing (e.g., `ABCD1234`)
- **Public Verification** - No API key needed for badge verification

### DEA Verification (US Only)

Validates DEA registration numbers for controlled substance prescribers:

- **Checksum Validation** - Official DEA algorithm
- **Registrant Type Detection** - 16 provider types
- **Last Name Matching** - Additional fraud prevention

> [!NOTE]
> DEA numbers are issued by the US Drug Enforcement Administration. This feature applies only to US-licensed providers.

### Interstate Compact Support (US Only)

Track multi-state licensure eligibility:

- **IMLC** - 45 member states (physicians)
- **NLC** - 42 member states (nurses)
- Cross-state license sharing validation

> [!NOTE]
> Interstate compacts are agreements between US states. This feature helps US providers determine which states they can practice in without additional licenses.

### Sanctions Checking (US Only)

Federal exclusion list verification for US providers:

- **OIG LEIE** - Medicare/Medicaid exclusions (monthly CSV cache)
- **GSA SAM** - Federal debarment list (live API)

> [!NOTE]
> OIG LEIE and GSA SAM are US federal databases. Other countries have their own exclusion systems (e.g., NHS Counter Fraud Authority in the UK).

### Deep Health Checks

Equipped with `@nestjs/terminus` to provide real-time status of upstream dependencies and database connectivity.

---

## 🐳 DevOps & Deployment

### Production Docker

```bash
docker build -t verimed-api:latest .
```

### Kubernetes (K8s)

```bash
kubectl apply -f k8s/deployment.yaml
```

### Database Migrations

Strictly required for production environments:

```bash
npm run migration:run
```

---

## 🧪 Verification

```bash
npm run test          # Run unit tests (including Fuzzy/Security logic)
npm run test:e2e      # Full end-to-end flow
```

---

## 📡 API Usage Examples

### Submit a Verification Request (US Provider)

```bash
curl -X POST http://localhost:3000/verify \
  -H "x-api-key: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "provider-001",
    "countryCode": "US",
    "firstName": "John",
    "lastName": "Smith",
    "licenseNumber": "1234567890"
  }'
```

### Check Verification Status

```bash
curl http://localhost:3000/verify/{transactionId} \
  -H "x-api-key: <YOUR_API_KEY>"
```

### Administrative Review (JWT Required)

```bash
# First, log in to get a JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"user": "admin", "pass": "<YOUR_ADMIN_PASSWORD>"}'

# Then approve a pending verification
curl -X PUT http://localhost:3000/verify/{transactionId}/review \
  -H "x-api-key: <YOUR_API_KEY>" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "VERIFIED", "reason": "Documents validated"}'
```

### Health Check

```bash
curl http://localhost:3000/health
```

### Create Credential Badge

```bash
curl -X POST http://localhost:3000/badge \
  -H "x-api-key: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"verificationId": "<TX_ID>", "providerName": "Dr. John Smith"}'
```

### Verify Badge (Public - No Auth)

```bash
curl http://localhost:3000/badge/verify/ABCD1234
```

### Verify DEA Number (US)

```bash
curl -X POST http://localhost:3000/us/dea/verify \
  -H "x-api-key: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"deaNumber": "AB1234563", "lastName": "Smith"}'
```

### Check Interstate Compact Eligibility

```bash
# Check if a Texas physician can practice in other states
curl http://localhost:3000/us/compact/TX?providerType=PHYSICIAN \
  -H "x-api-key: <YOUR_API_KEY>"

# Check if a provider can practice across specific states
curl http://localhost:3000/us/compact/CO/can-practice/AZ \
  -H "x-api-key: <YOUR_API_KEY>"
```

### Check Federal Exclusion Lists (Sanctions)

```bash
curl -X POST http://localhost:3000/us/sanctions/check \
  -H "x-api-key: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"npi": "1234567890", "firstName": "John", "lastName": "Smith"}'
```

> [!TIP]
> Import our [Postman Collection](postman/VeriMed-API.postman_collection.json) for a full interactive API reference.

---

## 🔐 Security

VeriMed is built with security-first principles for medical data:

- **Bcrypt Hashing**: All administrative credentials must be hashed.
- **Magic Number Validation**: File uploads are verified by their binary signature, not just extensions.
- **Configurable CORS**: Strict origin whitelisting for production deployments.
- **Rate Limiting**: Built-in protection against brute-force and DDoS.
- **Secrets Rotation**: Provided utility to rotate critical keys (`npm run rotate-secrets`).

For organizations requiring regulatory compliance, see our [HIPAA Compliance Guide](docs/HIPAA_COMPLIANCE.md).

See [SECURITY.md](SECURITY.md) for detailed hardening instructions.

## 🤝 Contributing

We welcome contributions of new country adapters! If you have public API access to a national medical registry, please see our [Contribution Guide](CONTRIBUTING.md) for implementation details.

---

## 🏢 Enterprise Support

Need help integrating VeriMed into your stack, or require a 99.9% uptime SLA?

**VeriMed Enterprise** offers:

- Priority 24/7 Support
- Custom Registry Integrations
- Managed Hosting (SaaS)
- Commercial Licensing

📧 [Contact for Enterprise](mailto:deeprince2020@gmail.com)

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
