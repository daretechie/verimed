# 2. AI Document Verification Fallback Strategy

Date: 2025-12-20

## Status

Accepted

## Context

Many countries do not expose a public, real-time API for verifying medical licenses. However, we still need to provide verification capabilities for these regions. Users can upload official documents (Medical Licenses, ID Cards) as proof.

## Decision

We will implement a **Fallback Strategy** using AI-driven document analysis when a live registry API is unavailable or fails.

### Logic
1. System attempts to resolve a `IRegistryAdapter` for the requested country code.
2. If **Adapter Exists**: It is executed.
   - If it returns `VERIFIED`, the flow ends.
   - If it returns `REJECTED` or fails (network error), the system proceeds to document verification (if documents are provided).
3. If **No Adapter Exists**: System immediately proceeds to document verification.

### Document Verification
We utilize an `IDocumentVerifier` port. The production implementation uses **OpenAI GPT-4o** with Vision capabilities to:
1. Extract text from the uploaded document image/PDF.
2. Compare extracted name/license number against the user-provided data using fuzzy matching logic.
3. Analyze security features (holograms, seals) if visible.

## Consequences

### Positive
- **Global Reach**: Allows VeriMed to support 195+ countries immediately via document upload, even without specific API integrations.
- **Resilience**: Provides a backup verification method if government APIs go down.

### Negative
- **Cost**: AI processing (OpenAI API) incurs usage costs per verification.
- **Accuracy Risk**: AI models can hallucinate or be spoofed, though risk is mitigated by requiring manual review for AI-verified providers (`MANUAL_REVIEW` status) unless confidence is extremely high.
