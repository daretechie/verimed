# Security Best Practices for VeriMed API

This document provides guidelines for securely deploying and maintaining a VeriMed API instance.

## 1. Secrets Management
Never commit your `.env` file to version control. Use a secrets manager (HashiCorp Vault, AWS Secrets Manager, or Kubernetes Secrets) for production.

### Generate Strong Keys
Generate unique, high-entropy keys for:
- `API_KEY`: X-API-KEY header protection
- `JWT_SECRET`: Admin session security

Example using OpenSSL:
```bash
openssl rand -base64 32
```

## 2. Admin Authentication
VeriMed uses Bcrypt for password hashing. **DO NOT** store plain-text passwords in your environment variables.

1.  Generate a secure password.
2.  Create a hash: `npm run hash-password your-secure-password`
3.  Store the resulting hash in `ADMIN_PASS`.

## 3. Network Security
### Transport Layer Security (TLS)
Always run the API behind a reverse proxy (Nginx, Caddy, Traefik) that enforces HTTPS/TLS termination.

### CORS Hardening
Restrict CORS origins to your trusted frontend domains:
```
CORS_ORIGINS=https://app.verimed-client.com,https://admin.verimed-client.com
```

## 4. File Uploads
VeriMed performs magic-number validation on all uploads to prevent MIME spoofing. Only JPEG, PNG, WEBP, and PDF files are allowed.

## 5. Security Updates
Monitor the [advisories](https://github.com/verimed/api/security/advisories) and keep your dependencies updated:
```bash
npm update
```
