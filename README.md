# VeriMed API

[![CI](https://github.com/daretechie/verimed/actions/workflows/ci.yml/badge.svg)](https://github.com/daretechie/verimed/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-24_LTS-green.svg)](https://nodejs.org/)
[![Sponsor](https://img.shields.io/badge/Sponsor-VeriMed-pink?logo=github-sponsors)](https://github.com/sponsors/daretechie)

> **Global Medical Provider Verification Engine**

VeriMed is a professional-grade, hybrid verification platform designed to validate healthcare providers globally. It bridges the gap between official registries (e.g., US NPI) and AI-driven document analysis.

## 🌍 Global Coverage

VeriMed now integrates with **7 national medical registries** across 4 continents:

| Country | Registry | API Technology | Key Access |
|---------|----------|----------------|------------|
| 🇺🇸 **USA** | NPI (NPPES) | REST | Public |
| 🇫🇷 **France** | RPPS (ANS) | FHIR | Public |
| 🇦🇪 **UAE** | DHA (Dubai Pulse) | REST | Public |
| 🇰🇪 **Kenya** | KMPDC | REST | `KE_INTELLEX_API_KEY` |
| 🇳🇱 **Netherlands** | BIG-register | **SOAP** | Public |
| 🇮🇱 **Israel** | MOH | **CKAN** | Public |
| 🇲🇽 **Mexico** | SEP | REST | `MX_RAPIDAPI_KEY` |

> [!TIP]
> **Faster High-Security Verification**: For countries without a live API registry, uploading **both** a Medical License and a National ID/Passport will result in significantly faster automated verification and higher confidence scores.

---

## 🛠 Two-Path Strategy

VeriMed is designed for both rapid exploration by developers and robust deployment by DevOps engineers.

### 1. The Developer Path (KISS)
Designed for local development and rapid testing.
- **Database:** Auto-configured SQLite (`verimed.sqlite`).
- **Schema:** Automatically kept in sync for local iterations.
- **Fast Start:**
  ```bash
  npm install
  cp .env.example .env
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

## 🔐 Security

VeriMed is built with security-first principles for medical data:
- **Bcrypt Hashing**: All administrative credentials must be hashed.
- **Magic Number Validation**: File uploads are verified by their binary signature, not just extensions.
- **Configurable CORS**: Strict origin whitelisting for production deployments.
- **Rate Limiting**: Built-in protection against brute-force and DDoS.

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
