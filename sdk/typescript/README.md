# VeriMed TypeScript SDK

Official TypeScript/JavaScript SDK for the VeriMed Medical Provider Verification API.

## Installation

```bash
npm install @verimed/sdk
# or
yarn add @verimed/sdk
```

## Quick Start

```typescript
import { VeriMedClient } from '@verimed/sdk';

const client = new VeriMedClient({
  baseUrl: 'https://api.verimed.app',
  apiKey: 'your-api-key',
});

// Verify a US provider
const result = await client.verify({
  providerId: 'dr-123',
  countryCode: 'US',
  firstName: 'John',
  lastName: 'Smith',
  licenseNumber: '1234567890',
});

console.log(result.status); // 'VERIFIED', 'REJECTED', 'PENDING', 'MANUAL_REVIEW'
```

## Supported Countries

```typescript
const countries = client.getSupportedCountries();
// Returns list of 11 supported countries with API status
```

| Country | Code | API Status |
|---------|------|------------|
| USA | US | Full API |
| France | FR | Full API |
| UAE | AE | Full API |
| Netherlands | NL | Full API |
| Israel | IL | Full API |
| UK | GB | Manual Review |
| Canada | CA | Manual Review |
| Australia | AU | Manual Review |
| Germany | DE | Manual Review |
| South Africa | ZA | Manual Review |
| Brazil | BR | Manual Review |

## API Reference

### `verify(request)`

Submit a provider for verification.

```typescript
const result = await client.verify({
  providerId: 'unique-id',
  countryCode: 'US',
  firstName: 'John',
  lastName: 'Smith',
  licenseNumber: '1234567890',
  dateOfBirth: '1980-01-15', // Optional
});
```

### `verifyBatch(request)`

Verify multiple providers (Enterprise feature).

```typescript
const result = await client.verifyBatch({
  providers: [
    { providerId: '001', countryCode: 'US', ... },
    { providerId: '002', countryCode: 'FR', ... },
  ],
});
```

### `getVerification(transactionId)`

Get status of a previous verification.

```typescript
const status = await client.getVerification('tx-uuid-here');
```

### `health()`

Check API health status.

```typescript
const health = await client.health();
console.log(health.status); // 'ok'
```

## Error Handling

```typescript
import { VeriMedClient, VeriMedError } from '@verimed/sdk';

try {
  await client.verify({ ... });
} catch (error) {
  if (error instanceof VeriMedError) {
    console.error(`API Error: ${error.message} (${error.statusCode})`);
  }
}
```

## License

MIT
