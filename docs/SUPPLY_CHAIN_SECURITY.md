# Supply Chain Security Plan (SLSA & SBOM)

## 1. Current State Assessment
*   **SLSA Level**: **Level 1** (Scripted Build). The build is fully scripted (`npm run build`, `docker build`) and runs on GitHub Actions.
*   **SBOM**: Implemented. `security.yml` generates a CycloneDX SBOM using `@cyclonedx/cyclonedx-npm`.
*   **Dependency Management**: Good. `package-lock.json` ensures pinning. Dependabot is active.
*   **Signing**: **Missing**. Docker images are pushed to GHCR but not signed.

## 2. Target: SLSA Level 2/3
To achieve higher SLSA levels, we need:
1.  **Build Service**: We use GitHub Actions (Hosted).
2.  **Authenticated Provenance**: We need to generate a provenance attestation that links the artifact to the source code and build instructions.
3.  **Isolation**: GitHub Actions `ubuntu-latest` provides ephemeral runners (good).

## 3. Implementation Plan

### A. Code Signing (Sigstore/Cosign)
We will implement "Keyless Signing" using Cosign and GitHub OIDC.
*   **Tool**: `cosign` (part of Sigstore).
*   **Identity**: GitHub Actions OIDC token.
*   **Action**: Add signing step to `ci.yml` after Docker push.

### B. Provenance Generation
We will use the generic SLSA generator for container images.
*   **Tool**: `slsa-framework/slsa-github-generator`.
*   **Action**: Create a new workflow or job that runs the SLSA generator.

### C. Dependency Hardening
*   **Typosquatting Protection**: currently using `npm audit`.
*   **Recommendation**: Add strict `npm audit` check in CI (fail on high/critical). `security.yml` currently has `continue-on-error: true`. We should change this to `false` for Critical.

## 4. Verification Check
*   Users can verify the image using:
    ```bash
    cosign verify \
      --certificate-identity-regexp "^https://github.com/daretechie/verimed/.*" \
      --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
      ghcr.io/daretechie/verimed-core:latest
    ```

## 5. Branch Protection (Existing)
*   Ensure `main` branch requires PR review and status checks (already in policy).
