# Carbon Footprint & Sustainability Strategy

## 1. Energy Analysis
*   **Hotspots**:
    *   **Database Queries**: `MonitoringService` currently fetches *all* expired verifications into memory. As the dataset grows, this becomes an O(N) memory and DB operation.
    *   **AI Inference**: Calls to OpenAI are energy-intensive. We use `MockDocumentVerifier` for dev/test (Good). We should implement aggressive caching for AI results (Already partially in `AICacheService`).

## 2. Optimization Plan
*   [ ] **Query Optimization**: Update `findExpiredVerifications` to support pagination/limits. Do not fetch full datasets for batch processing.
*   [ ] **Carbon-Aware Scheduling**: The daily check runs at 6AM. If hosted in a region where solar is high at noon, we might move non-urgent jobs to midday.
*   [ ] **Payload Size**: Ensure API responses are compressed (Gzip/Brotli). Enable `compression` middleware in NestJS (already present in `package.json`, check `main.ts`).

---

# Zero-Trust Security Migration

## 1. Identity & Access (IAM)
*   **Current**: JWT (Bearer Token) for API access. Basic Auth/Hardcoded for Admin (Needs improvement).
*   **Goal**: Move Admin auth to a proper Identity Provider (Auth0/Cognito) or OIDC.
*   **Action**: Remove hardcoded `ADMIN_USER`/`ADMIN_PASS` in favor of OIDC integration in future.

## 2. Micro-segmentation & Network
*   **Current**: Monochronic application (Modular Monolith).
*   **Goal**: If splitting into microservices, must enforce mTLS.
*   **Action**: Deploy `Linkerd` or `Istio` in k8s cluster.

## 3. Data Sensitivity
*   **Class**: Provider Data (PII - Public but sensitive in aggregate).
*   **Action**: Encrypt sensitive columns (License Numbers) using `TypeORM` encryption transformers if higher security is needed.
