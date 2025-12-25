# VeriMed Python SDK

Official Python SDK for the VeriMed Medical Provider Verification API.

## Installation

```bash
pip install verimed-sdk
```

## Quick Start

```python
from verimed_sdk import VeriMedClient, VerificationRequest

client = VeriMedClient(
    base_url='https://api.verimed.app',
    api_key='your-api-key'
)

# Verify a US provider
request = VerificationRequest(
    providerId='dr-123',
    countryCode='US',
    firstName='John',
    lastName='Smith',
    licenseNumber='1234567890'
)

result = client.verify(request)
print(result.status) # 'VERIFIED', 'REJECTED', 'PENDING', 'MANUAL_REVIEW'
```

## Supported Countries

```python
countries = client.get_supported_countries()
# Returns list of 11 supported countries with API status
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

```python
result = client.verify(VerificationRequest(
    providerId='unique-id',
    countryCode='US',
    firstName='John',
    lastName='Smith',
    licenseNumber='1234567890',
    dateOfBirth='1980-01-15' # Optional
))
```

### `verify_batch(providers)`

Verify multiple providers (Enterprise feature).

```python
result = client.verify_batch([
    VerificationRequest(providerId='001', countryCode='US', ...),
    VerificationRequest(providerId='002', countryCode='FR', ...),
])
```

### `get_verification(transaction_id)`

Get status of a previous verification.

```python
status = client.get_verification('tx-uuid-here')
```

### `health()`

Check API health status.

```python
health = client.health()
print(health['status']) # 'ok'
```

## Error Handling

```python
from verimed_sdk import VeriMedError

try:
    client.verify(request)
except VeriMedError as e:
    print(f"API Error: {e} ({e.status_code})")
```

## License

MIT
