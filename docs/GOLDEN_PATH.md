# VeriMed Golden Path: Service Standards (2026)

**Version**: 2.0.0
**Status**: Active
**Enforcement**: Mandatory for all new microservices.

## 1. Introduction
The "Golden Path" is the paved road for high-velocity, high-quality development at VeriMed. Adhering to these standards ensures that every service is secure, observable, compliant, and scalable *by default*.

## 2. Core Architecture
*   **Framework**: NestJS (Latest LTS) is the standard backend framework.
*   **Language**: TypeScript (Strict Mode required).
*   **Structure**: Domain-Driven Design (DDD) is enforced.
    *   `src/domain`: Entities, Logic, Interfaces (No external dependencies).
    *   `src/application`: Use Cases (Orchestration).
    *   `src/infrastructure`: Database, APIs, Adapters.
    *   `src/presentation`: Controllers, DTOs.

## 3. Mandatory Security ("Secure by Default")
*   **Transport**: TLS 1.3 is required for all ingress/egress. HTTP/1.1 or H2 plaintext is FORBIDDEN in production.
*   **Authentication**:
    *   All endpoints (excluding `/health`) must be protected by `JwtAuthGuard`.
    *   Services must use `AuthService` logic for token validation.
*   **Secrets**: No secrets in code. Use `ConfigService` (via `.env`).
*   **Data Protection**:
    *   Use `ICryptoService` for encrypting PII at rest.
    *   Implement `DataRetentionService` (Cron) for 90-day PII redaction.
    *   **NO** permanent storage of raw document images (Ephemeral Buffers only).

## 4. Observability 2.0
*   **Tracing**: OpenTelemetry (OTel) MUST be initialized before app bootstrap.
    *   **Production**: Configure OTLP Exporter via `OTEL_EXPORTER_OTLP_ENDPOINT`.
    *   **Development**: Use `ConsoleSpanExporter`.
*   **Metrics**: Prometheus execution metrics (via `@willsoto/nestjs-prometheus` or similar) are recommended.
*   **Logs**: Structured JSON logging. `console.log` is forbidden; use `Logger` service.

## 5. Quality Assurance
*   **Unit Tests**: Min 80% coverage. 100% required for Domain Logic.
*   **E2E Tests**: Critical user flows (e.g., Verification) must be covered.
*   **Static Analysis**: `eslint` and `prettier` must pass in CI pipeline.

## 6. Deployment & Docker
*   **Base Image**: Use `node:alpine` or distroless images for minimal attack surface.
*   **Multi-Stage Build**:
    1.  `build`: Install devDependencies, build TS.
    2.  `production`: Copy `dist/` and `package.json`, install only production runtimes.
*   **Health Checks**: Implement Terminus with `/health/live` (Liveness) and `/health/ready` (Readiness).

## 7. Checklist for New Services
- [ ] Is OTel initialized?
- [ ] Is TLS 1.3 enforced?
- [ ] Are PII fields encrypted?
- [ ] Is the Docker image multi-stage?
- [ ] Is there a Swagger/OpenAPI spec?
