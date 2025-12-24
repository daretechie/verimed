# VeriMed Testing Guide

This guide covers how to run tests and security scans for VeriMed.

## Quick Start

```bash
# Install dependencies
npm ci

# Run all unit tests
npm test

# Run tests with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e
```

---

## Test Types

### Unit Tests

Located in `src/**/*.spec.ts`, unit tests validate individual functions and services.

```bash
# Run all unit tests
npm test

# Run specific test file
npm test -- --testPathPatterns="auth.service.spec"

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:cov
```

### E2E Tests

Located in `test/*.e2e-spec.ts`, E2E tests validate complete API flows.

```bash
# Run all E2E tests
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- --testPathPatterns="security"
```

**E2E Test Suites:**
| Suite | Description |
|-------|-------------|
| `verification.e2e-spec.ts` | Complete verification workflow |
| `security.e2e-spec.ts` | Auth bypass, rate limiting, headers |
| `enterprise.e2e-spec.ts` | Batch verification, enterprise features |

---

## Security Scans

### Local Scans

```bash
# Dependency vulnerability scan
npm audit

# Run ESLint security rules
npm run lint

# Check for secrets (if TruffleHog installed)
trufflehog git file://. --only-verified
```

### CI/CD Scans

Security scans run automatically on every push via `.github/workflows/security.yml`:

1. **Dependency Scan**: `npm audit --audit-level=high`
2. **SAST (Semgrep)**: Static code analysis for vulnerabilities
3. **Secret Detection**: TruffleHog scans for leaked credentials
4. **License Check**: Validates OSS license compliance

---

## Coverage Requirements

**Minimum Thresholds:**

- Overall: 80%
- Functions: 75%
- Branches: 70%

```bash
# View coverage report
npm run test:cov

# Open HTML report
open coverage/lcov-report/index.html
```

---

## Pre-Commit Hooks

Pre-commit hooks run automatically via Husky:

1. **lint-staged**: ESLint + Prettier on staged files
2. **Secret Detection**: Warning for potential secrets

To bypass (not recommended):

```bash
git commit --no-verify
```

---

## Database Setup for E2E

E2E tests can use either SQLite (default) or PostgreSQL:

**SQLite (default):**

```bash
npm run test:e2e
```

**PostgreSQL:**

```bash
# Start PostgreSQL container
docker-compose up -d db

# Run E2E with Postgres
DATABASE_URL=postgres://verimed_user:secret_password@localhost:5432/verimed_db npm run test:e2e
```

---

## Troubleshooting

### Tests Timeout

Increase Jest timeout in `jest.config.js`:

```javascript
testTimeout: 30000;
```

### Database Lock Errors

SQLite may lock during parallel tests. Run sequentially:

```bash
npm test -- --runInBand
```

### Mock Issues

Clear Jest cache:

```bash
npm test -- --clearCache
```
