# Quantum-Safe Cryptography Assessment & Migration Plan

## 1. Cryptographic Inventory

### A. Authentication & Authorization
*   **Mechanism**: JWT (JSON Web Tokens)
*   **Algorithm**: `HS256` (HMAC using SHA-256)
*   **Key Source**: `JWT_SECRET` (Symmetric Key)
*   **Quantum Risk**: **Low/Medium**. `HS256` is a symmetric algorithm. Grover's algorithm reduces effective key strength by half. A 256-bit key provides ~128 bits of security against a quantum adversary, which is generally considered acceptable for the near/medium term, provided the key has high entropy.
*   **Location**: `src/infrastructure/auth/auth.module.ts`, `src/infrastructure/auth/jwt.strategy.ts`

### B. Password Hashing
*   **Mechanism**: `bcrypt`
*   **Algorithm**: Blowfish-based variant
*   **Quantum Risk**: **Low**. Pre-image attacks via Grover's apply, but password hashing relies on work factors (salt + iterations) to defeat brute force. Quantum computers do not exponentially speed up these iterations.
*   **Location**: `src/infrastructure/auth/auth.service.ts`

### C. Data Encryption (Transit)
*   **Mechanism**: TLS (Transport Layer Security)
*   **Implementation**: Enforced via infrastructure (Ingress/Load Balancer) and `helmet` middleware.
*   **Quantum Risk**: **High**. Standard TLS key exchange (ECDHE, RSA) is vulnerable to Shor's algorithm (Harvest Now, Decrypt Later).
*   **Status**: Node.js and underlying OS handle TLS. Migration depends on OpenSSL/Node.js support for PQC (Post-Quantum Crypto) suites.

## 2. Risk Assessment: "Harvest Now, Decrypt Later"
*   **Critical Data**: Patient Provider Verifications, PII (Provider Data), API Keys.
*   **Threat**: An attacker captures encrypted traffic today and stores it until a quantum computer can break the TLS session keys (ECDHE/RSA) in the future.
*   **Mitigation**: The only prevention is using Quantum-Safe Key Exchange (e.g., CRYSTALS-Kyber) *now*. This requires infrastructure-level support (e.g., Cloudflare, AWS KMS support) or using hybrid key exchange.

## 3. Migration Strategy

### Phase 1: Immediate Hardening (Present)
*   [x] **Symmetric Token Hygiene**: Ensure `JWT_SECRET` is at least 64 characters (512 bits) long to robustly withstand Grover's attack (providing 256 bits of effective security).
*   [x] **Crypto Agility**: Abstract crypto calls. Currently, `AuthService` directly uses `bcrypt` and `JwtService`. We should wrap these in a `CryptoProvider` interface to swap implementations easier.
*   [ ] **Strict TLS**: Enforce TLS 1.3 only (which removes some older, weaker suites).

### Phase 2: Hybrid Adoption (2025-2026)
*   **Signature Migration**: If moving to asymmetric tokens (RS256/ES256), SKIP them and move to a hybrid scheme or stay on symmetric `HS512`.
*   **Signatures**: Prototype `CRYSTALS-Dilithium` or `SPHINCS+` for signing sensitive audit logs (e.g., `VerificationLogEntity` integrity).

### Phase 3: Full PQC (2027+)
*   Migrate all TLS termination to PQC-supported gateways.
*   Replace `bcrypt` with memory-hard, quantum-resistant hashes if standards evolve (unlikely to be urgent).

## 4. Action Plan
1.  **Refactor Auth**: Create `ICryptoService` to abstract hashing/signing.
2.  **Key Rotation**: Implement automated key rotation for `JWT_SECRET` (already present in `scripts/rotate-secrets.js` - *needs verification*).
3.  **Audit Logs**: unimplemented digital signatures for audit logs to ensure non-repudiation post-quantum.
