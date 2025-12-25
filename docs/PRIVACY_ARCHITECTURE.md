# Privacy by Design Architecture

**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2025-12-25

## 1. Executive Summary
VeriMed enforces a "Privacy by Design" approach, ensuring that data protection is not an afterthought but a core architectural component. This document defines the technical controls for Data Minimization, Encryption, and Retention.

## 2. Core Privacy Principles

### 2.1 Data Minimization & Ephemeral Processing
*   **Principle**: We only process data required for the specific verification request.
*   **Implementation**:
    *   **Ephemeral Buffers**: Document files (images, PDFs) are held in memory buffers only during the verification lifecycle. They are **NOT** persisted to disk storage unless explicitly configured for debugging (which is disabled in production).
    *   **Strict Schema Validation**: The API rejects any payload containing undefined fields to prevent accidental ingestion of unneeded PII.

### 2.2 Encryption Strategy
*   **Data in Transit**:
    *   **TLS 1.3**: Strictly enforced for all inbound and outbound traffic.
    *   **HSTS**: Enabled to prevent protocol downgrade attacks.
*   **Data at Rest**:
    *   **Database**: PII columns (e.g., `license_number`, `applicant_name`) are encrypted using AES-256-GCM via the `ICryptoService` abstraction.
    *   **Keys**: Encryption keys are managed via environment variables and rotated monthly.

### 2.3 Access Control (RBAC)
*   **Role Separation**:
    *   `ADMIN`: Full system access (requires MFA in future).
    *   `VERIFIER`: Read-only access to verification metadata.
    *   `API_CLIENT`: Access only to their own submission data.
*   **Audit Logging**: All access to PII is logged immutably, recording `WHO`, `WHEN`, and `WHAT`.

## 3. Data Retention & The "Right to be Forgotten"

### 3.1 Retention Policy
| Data Type | Retention Period | Action |
| :--- | :--- | :--- |
| **Raw Documents** (Images/PDFs) | **0 Minutes** (Ephemeral) | Discarded immediately after analysis. |
| **Verification Metadata** (Logs) | **90 Days** | Anonymized (PII scrubbed). |
| **System Logs** | **30 Days** | Rotated and archived. |

### 3.2 Automated Deletion Mechanism (GDPR)
*   **Components**: NestJS `@Cron` Job.
*   **Schedule**: Runs nightly at 00:00 UTC.
*   **Logic**:
    1.  Query `VerificationRequest` entities where `createdAt < NOW - 90 DAYS`.
    2.  Hard delete or Scrub PII fields (`firstName`, `lastName`, `licenseNumber` -> `[REDACTED]`).
    3.  Log the deletion event for compliance proof.

## 4. Compliance Mapping
*   **GDPR Art. 5(1)(c)** (Data Minimization) -> Ephemeral Processing.
*   **GDPR Art. 17** (Right to Erasure) -> Automated Cron Deletion.
*   **HIPAA Security Rule** (Encryption) -> TLS 1.3 + Column-level AES.
