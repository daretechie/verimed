# VeriMed API Documentation

## Overview

VeriMed is a healthcare provider credential verification API that supports 8 countries via official government registry integrations and AI-powered document verification.

---

## Authentication

All endpoints require authentication via API Key:

```http
x-api-key: your-api-key-here
```

For admin endpoints (reviews, chaos), JWT Bearer token is also required:

```http
Authorization: Bearer your-jwt-token
```

---

## Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://api.verimed.app/v1` |
| Staging | `https://staging.verimed.app/v1` |
| Local | `http://localhost:3000/v1` |

---

## Endpoints

### 1. Provider Verification

#### POST /v1/verify

Submit a healthcare provider for credential verification.

**Request Body (multipart/form-data)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `providerId` | string | Yes | Your internal provider ID |
| `countryCode` | string | Yes | ISO 3166-1 alpha-2 country code |
| `firstName` | string | Yes | Provider's first name |
| `lastName` | string | Yes | Provider's last name |
| `licenseNumber` | string | Yes | Professional license number |
| `dateOfBirth` | string | No | Date of birth (YYYY-MM-DD) |
| `documents` | file[] | No | Medical license documents (PDF/JPEG/PNG) |
| `idDocument` | file | No | National ID or passport |

**Example Request**

```bash
curl -X POST https://api.verimed.app/v1/verify \
  -H "x-api-key: your-api-key" \
  -F "providerId=dr-12345" \
  -F "countryCode=US" \
  -F "firstName=Gregory" \
  -F "lastName=House" \
  -F "licenseNumber=1234567893"
```

**Response (200 OK)**

```json
{
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "VERIFIED",
  "method": "API_REGISTRY",
  "confidenceScore": 0.95,
  "verifiedAt": "2024-12-25T08:00:00Z",
  "details": {
    "source": "NPPES_API",
    "npi": "1234567893",
    "providerName": "Gregory House"
  }
}
```

**Status Values**

| Status | Description |
|--------|-------------|
| `VERIFIED` | Credentials confirmed via registry |
| `REJECTED` | Credentials not found or invalid |
| `MANUAL_REVIEW` | Requires human review |
| `PENDING` | Registry temporarily unavailable |

---

### 2. Get Verification Status

#### GET /v1/verify/:id

Retrieve the status of a previously submitted verification.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Transaction UUID |

**Example**

```bash
curl https://api.verimed.app/v1/verify/550e8400-e29b-41d4-a716 \
  -H "x-api-key: your-api-key"
```

---

### 3. Batch Verification (Enterprise)

#### POST /v1/verify/batch

Submit multiple providers for batch verification. Requires Enterprise license.

**Request Body (JSON)**

```json
{
  "providers": [
    {
      "providerId": "dr-001",
      "countryCode": "US",
      "firstName": "John",
      "lastName": "Smith",
      "licenseNumber": "1234567890"
    },
    {
      "providerId": "dr-002",
      "countryCode": "FR",
      "firstName": "Marie",
      "lastName": "Curie",
      "licenseNumber": "10001234567"
    }
  ]
}
```

---

### 4. Manual Review Queue

#### GET /v1/reviews

List all verifications pending manual review.

#### POST /v1/reviews/:id/approve

Approve a pending verification.

#### POST /v1/reviews/:id/reject

Reject a pending verification (reason required).

---

## Supported Countries

| Country | Code | Registry | Integration |
|---------|------|----------|-------------|
| 🇺🇸 USA | `US` | NPI (NPPES) | ✅ Full API |
| 🇫🇷 France | `FR` | ANS | ✅ Full API |
| 🇳🇱 Netherlands | `NL` | BIG-register | ✅ Full API |
| 🇮🇱 Israel | `IL` | MOH | ✅ Full API |
| 🇦🇪 UAE | `AE` | DHA | ✅ Full API |
| 🇩🇪 Germany | `DE` | Bundesärztekammer | ⚠️ Manual Review |
| 🇿🇦 South Africa | `ZA` | HPCSA | ⚠️ Manual Review |
| 🇧🇷 Brazil | `BR` | CFM | ⚠️ Manual Review |
| Other | `*` | AI Document Verification | 🤖 AI-Powered |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| All endpoints | 10 requests/minute |
| AI verification | 5 requests/minute |
| Batch verification | 1 request/minute |

Rate limit headers:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1640000000
```

---

## Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid API key |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 502 | Bad Gateway - External registry unavailable |

**Error Response Format**

```json
{
  "statusCode": 400,
  "message": "Invalid license number format",
  "error": "Bad Request"
}
```

---

## Webhooks

Configure webhook URL via `WEBHOOK_URL` environment variable.

**Webhook Payload**

```json
{
  "event": "verification.completed",
  "timestamp": "2024-12-25T08:00:00Z",
  "data": {
    "transactionId": "...",
    "providerId": "dr-123",
    "status": "VERIFIED",
    "method": "API_REGISTRY"
  }
}
```

---

## SDKs

Official SDKs coming soon:
- JavaScript/TypeScript
- Python
- Go

---

## Support

- **Documentation**: https://docs.verimed.app
- **Status Page**: https://status.verimed.app
- **Email**: support@verimed.app
