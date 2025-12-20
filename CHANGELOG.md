# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-12-20

### Added
- **Global Coverage**: Initial release supporting 7 national medical registries:
  - 🇺🇸 USA (NPI/NPPES)
  - 🇫🇷 France (RPPS/ANS)
  - 🇦🇪 UAE (DHA/Dubai Pulse)
  - 🇰🇪 Kenya (KMPDC)
  - 🇳🇱 Netherlands (BIG-register)
  - 🇮🇱 Israel (MOH)
  - 🇲🇽 Mexico (SEP)
- **Core Engine**: NestJS-based API with Ports and Adapters architecture.
- **AI Fallback**: Intelligent document verification using OpenAI/Mock fallback when registry APIs are unavailable or fail.
- **Security**: 
  - API Key authentication for client applications.
  - JWT authentication for administrative review endpoints.
  - Rate limiting via `@nestjs/throttler`.
  - Helmet security headers and CORS configuration.
  - Strict file upload validation (magic number checks).
- **Persistence**: 
  - PostgreSQL support for production.
  - SQLite zero-config support for local development.
  - Verification request logging and status tracking.
- **DevOps**:
  - Multi-stage Docker build pipeline (Node.js 24-slim).
  - Kubernetes manifests (Deployment, Service, HPA).
  - GitHub Actions CI/CD pipeline with E2E testing.
- **Documentation**:
  - Comprehensive OpenAPI/Swagger documentation (`/api`).
  - Architecture Decision Records (ADR).
