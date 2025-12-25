# AI Model Card: VeriMed Document Verification

## Model Details
*   **Developers**:
    *   **Base Models**: OpenAI (`gpt-4o`, `gpt-4o-mini`).
    *   **System Integration**: VeriMed Open Source Community.
*   **Model Date**: December 2025.
*   **Model Version**: v1.0 (Integration Layer).
*   **License**: MIT (VeriMed Code); Proprietary (OpenAI Models).

## Intended Use
*   **Primary Uses**:
    *   Extraction of text fields (Name, License Number, Dates) from images of medical licenses and identity documents.
    *   Cross-referencing extracted data against user-provided attributes.
    *   Anomaly detection (e.g., mismatched fonts, obvious tampering).
*   **Intended Users**:
    *   Healthcare Credentialing Officers.
    *   Telehealth Platforms.
    *   Hospital HR Departments.
*   **Out of Scope**:
    *   **Medical Diagnosis**: The model must NOT be used to interpret medical data for patient care.
    *   **Final Decision Making**: The model provides a *recommendation* (`VERIFIED`, `MANUAL_REVIEW`, `REJECTED`). Human review is REQUIRED for all `MANUAL_REVIEW` or contested `REJECTED` outcomes.

## Factors
*   **Relevant Factors**:
    *   **Document Quality**: Performance correlates with image resolution and lighting.
    *   **Language**: Optimized for English, French, Dutch, Arabic, and Hebrew. Other languages may have lower accuracy.
    *   **Document Type**: Optimized for government-issued IDs and standard medical license certificates.

## Metrics
*   **Confidence Score**: A 0-1 float indicating the model's internal certainty.
    *   Score > 0.85 -> Auto-Verify (if data matches).
    *   Score < 0.85 -> Flag for Manual Review.

## Ethical Considerations
*   **Privacy**:
    *   **Data Minimization**: Raw images are processed ephemerally (in-memory) and not stored on disk.
    *   **Retention**: All verification metadata is anonymized after 90 days.
*   **Fairness & Bias**:
    *   **Demographic Neutrality**: System prompts explicitly instruct the model to ignore photo attributes (gender, race, age) on ID cards, focusing strictly on text matching.
    *   **Accessibility**: The API accepts standard image formats (JPEG, PNG, PDF) to support varying user capabilities.

## EU AI Act Compliance
*   **Risk Classification**: **HIGH RISK** (Healthcare Domain)
    *   VeriMed falls under Annex III, Section 5(a) of the EU AI Act as a system used in healthcare credentialing.
*   **Requirements Met**:
    *   ✅ Human Oversight: `ManualReviewController` for HITL queue.
    *   ✅ Data Governance: `DataRetentionService` for 90-day PII redaction.
    *   ✅ Transparency: This Model Card documents capabilities and limitations.
    *   ✅ Robustness: `ResilienceService` (Circuit Breakers) for graceful degradation.
*   **Conformity Assessment**: Self-assessment completed. Notified Body audit pending.

## Caveats and Recommendations
*   **Fallback**: In case of "Kill Switch" activation or Budget Exhaustion, the system gracefully degrades to a `MANUAL_REVIEW` status rather than failing silently.
*   **Adversarial Attacks**: The system includes a dedicated `PromptSecurityService` to detect and block prompt injection attempts (e.g., "Ignore previous instructions").
