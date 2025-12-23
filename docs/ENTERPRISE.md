# VeriMed Enterprise

VeriMed Enterprise is a commercial extension of the open-source core, designed for high-volume and corporate environments.

## Features

### 1. Single Sign-On (SSO)
- **SAML 2.0 Integration**: Connect with Okta, Azure AD, or any SAML-compliant Identity Provider.
- **Role-Based Access Control (RBAC)**: Manage granular permissions for your team.

### 2. Batch Verification
- **Bulk CSV Processing**: Upload thousands of providers for verification in a single request.
- **High Throughput**: Optimized for massive datasets.

### 3. Dedicated Support
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
