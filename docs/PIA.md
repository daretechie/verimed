# Privacy Impact Assessment (PIA)

**Document Version**: 1.0
**Date**: December 2025
**System**: VeriMed Medical Verification API

---

## 1. Purpose of Processing

VeriMed processes personal data to verify the credentials of healthcare providers. This includes:
- **Names** (First, Last)
- **Professional License Numbers**
- **Date of Birth** (optional)
- **Document Images** (Medical Licenses, ID Cards)

## 2. Lawful Basis

| Data Type | Lawful Basis | Justification |
|-----------|--------------|---------------|
| Provider Names | Legitimate Interest | Required for name-matching verification |
| License Numbers | Legitimate Interest | Primary verification identifier |
| Document Images | Consent (Explicit) | Uploaded by data controller's client |

## 3. Data Minimization

*   **Ephemeral Processing**: Document images are processed in-memory and NOT stored on disk.
*   **Schema Validation**: Only required fields are extracted; extraneous data is discarded.
*   **Automated Redaction**: PII is anonymized after 90 days via `DataRetentionService`.

## 4. Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Verification Logs | 90 days (active), then anonymized | `[REDACTED]` overwrite |
| Document Buffers | 0 days (ephemeral) | Garbage Collection |
| AI Audit Logs | 1 year | Automated purge |

## 5. Data Subject Rights

*   **Right of Access**: API consumers can query `/v1/reviews` for their verification history.
*   **Right to Erasure**: Handled automatically by `DataRetentionService` (90-day policy).
*   **Right to Rectification**: Contact support for manual corrections.

## 6. Security Measures

*   **Encryption in Transit**: TLS 1.3 (mandatory).
*   **Encryption at Rest**: AES-256-GCM via `ICryptoService`.
*   **Access Control**: JWT Authentication + Role-Based Access.

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data Breach | Low | High | Encryption, Rate Limiting, Audit Logging |
| Unauthorized Access | Low | High | JwtAuthGuard, RBAC |
| AI Bias in Verification | Medium | Medium | Name Fuzzy Matching, HITL Queue |

## 8. Conclusion

VeriMed implements Privacy by Design. This assessment confirms compliance with GDPR Articles 5, 17, 25, and 32.

---

**Reviewed By**: [Data Protection Officer]
**Next Review Date**: December 2026
