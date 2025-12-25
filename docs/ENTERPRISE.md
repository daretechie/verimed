# VeriMed Enterprise

VeriMed Enterprise is a commercial extension of the open-source core, designed for high-volume and corporate environments.

## Features

### 1. Advanced Identity & Access

- **SAML 2.0 & OIDC**: Secure integration with Okta, Azure AD, Google Workspace, and Auth0.
- **Enterprise RBAC**: Hierarchical roles (Admin, Reviewer, Viewer) with granular permissions.
- **Auto-Provisioning**: Seamless user creation on first SSO login.

### 2. Bulk Operations

- **CSV Import Wrapper**: User-friendly interface for mass verification uploads.
- **Batch Engine Integration**: Direct integration with the high-performance core batch API.
- **Status Tracking**: Detailed results for every row in your dataset.

### 3. Compliance & Auditing

- **Audit Dashboard**: Comprehensive logs of every verification, login, and configuration change.
- **CSV Export**: Export audit trails for regulatory compliance or internal reporting.
- **System Statistics**: Monitor usage patterns and verification metrics.

### 4. Dedicated Support

- **Priority Email Support**: Direct access to the engineering team.
- **SLA**: Guaranteed response times.

## Installation

The Enterprise edition is delivered as a private Docker image.

### Prerequisites

- A valid **License Key** (contact [sales@verimed.com](mailto:sales@verimed.com))
- Access to the private container registry (granted upon purchase)

### Running with Docker

```bash
docker run -d \
  -p 3000:3000 \
  -e LICENSE_KEY="ENT-XXXX-XXXX" \
  -e DATABASE_URL="postgres://..." \
  ghcr.io/daretechie/verimed-enterprise:latest
```

## Get a License

To purchase a license or request a demo, please email **deeprince2020@gmail.com**.
