# VeriMed API Guide

> **Quick Start Guide for API Users**

## Authentication

All API requests require an API key in the header:

```http
X-API-Key: your-api-key-here
```

---

## Quick Start

### 1. Verify a US Provider (NPI)

```bash
curl -X POST http://localhost:3000/verify \
  -H "X-API-Key: <YOUR_API_KEY_HERE>" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "provider-001",
    "countryCode": "US",
    "firstName": "John",
    "lastName": "Smith",
    "licenseNumber": "1234567890"
  }'
```

**Response:**
```json
{
  "transactionId": "abc123-...",
  "status": "VERIFIED",
  "method": "API_REGISTRY",
  "confidenceScore": 100,
  "verifiedAt": "2025-12-21T12:00:00Z",
  "expiresAt": "2025-04-20T12:00:00Z"
}
```

---

## Endpoints

### Core Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/verify` | Submit verification request |
| `POST` | `/verify/batch` | Batch verify (max 50) |
| `GET` | `/verify/:id` | Get verification status |
| `PUT` | `/verify/:id/review` | Admin review (JWT required) |

### Credential Badges

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/badge` | Create QR badge |
| `GET` | `/badge/verify/:code` | Public verification (no auth) |
| `GET` | `/badge/:id` | Get badge by ID |
| `GET` | `/badge/provider/:id` | Get all provider badges |
| `DELETE` | `/badge/:id` | Revoke badge |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check (no auth) |
| `GET` | `/` | API info |

---

## Supported Countries

### Official API Countries (Instant Verification)

| Country | Code | Required Fields |
|---------|------|-----------------|
| 🇺🇸 USA | `US` | `licenseNumber` (NPI) |
| 🇫🇷 France | `FR` | `licenseNumber` (RPPS) |
| 🇦🇪 UAE | `AE` | `licenseNumber` (DHA) |
| 🇳🇱 Netherlands | `NL` | `licenseNumber` (BIG) |
| 🇮🇱 Israel | `IL` | `licenseNumber` (MOH) |

### Other Countries (Document Required)

For unsupported countries, upload a medical license document:

```bash
curl -X POST http://localhost:3000/verify \
  -H "X-API-Key: <YOUR_API_KEY_HERE>" \
  -F "providerId=provider-002" \
  -F "countryCode=DE" \
  -F "firstName=Hans" \
  -F "lastName=Mueller" \
  -F "documents=@medical-license.pdf"
```

---

## Batch Verification

Verify up to **50 providers** in one request:

```bash
curl -X POST http://localhost:3000/verify/batch \
  -H "X-API-Key: <YOUR_API_KEY_HERE>" \
  -H "Content-Type: application/json" \
  -d '{
    "providers": [
      {"providerId": "001", "countryCode": "US", "firstName": "John", "lastName": "Smith", "licenseNumber": "1234567890"},
      {"providerId": "002", "countryCode": "FR", "firstName": "Marie", "lastName": "Dupont", "licenseNumber": "12345678901"}
    ]
  }'
```

---

## Credential Badges

### Create Badge

```bash
curl -X POST http://localhost:3000/badge \
  -H "X-API-Key: <YOUR_API_KEY_HERE>" \
  -H "Content-Type: application/json" \
  -d '{"verificationId": "tx-abc123", "providerName": "Dr. John Smith"}'
```

**Response:**
```json
{
  "id": "badge-123",
  "shortCode": "ABCD1234",
  "verificationUrl": "http://localhost:3000/badge/verify/ABCD1234",
  "qrCodeDataUrl": "data:image/png;base64,...",
  "expiresAt": "2025-04-20T12:00:00Z"
}
```

### Public Verification (No Auth)

Anyone can verify a badge using the short code:

```bash
curl http://localhost:3000/badge/verify/ABCD1234
```

---

## Webhooks

Configure webhooks to receive real-time notifications:

**Environment Variables:**
```env
WEBHOOK_URL=https://your-app.com/webhook
WEBHOOK_SECRET=your-hmac-secret
```

**Events:**
- `verification.completed` - Verification finished
- `verification.expiring_soon` - 14 days before expiration
- `verification.expired` - Verification window passed
- `batch.completed` - Batch processing finished
- `sanctions.match` - Provider on exclusion list

**Payload:**
```json
{
  "event": "verification.completed",
  "timestamp": "2025-12-21T12:00:00Z",
  "data": {
    "transactionId": "tx-abc123",
    "providerId": "provider-001",
    "status": "VERIFIED"
  }
}
```

**Signature Verification:**
```
X-Webhook-Signature: sha256=<HMAC-SHA256 of payload>
```

---

## Response Statuses

| Status | Meaning |
|--------|---------|
| `VERIFIED` | Provider credentials confirmed |
| `REJECTED` | Credentials invalid or not found |
| `PENDING` | Awaiting processing |
| `MANUAL_REVIEW` | Needs human review |
| `EXPIRED` | 120-day window passed |

---

## Error Responses

```json
{
  "statusCode": 400,
  "message": "Invalid license number format",
  "error": "Bad Request"
}
```

| Code | Meaning |
|------|---------|
| `400` | Invalid request data |
| `401` | Missing or invalid API key |
| `404` | Verification not found |
| `429` | Rate limit exceeded |
| `500` | Server error |

---

## Rate Limits

- **10 requests/minute** per API key
- Batch endpoint counts as 1 request

---

## Postman Collection

Import our [Postman Collection](postman/VeriMed-API.postman_collection.json) for interactive testing.

---

## Support

📧 [Contact Support](mailto:deeprince2020@gmail.com)
