# HIPAA Compliance & Self-Hosting Guide

This guide provides instructions for healthcare organizations self-hosting VeriMed to maintain HIPAA (Health Insurance Portability and Accountability Act) compliance.

## 1. Data Encryption

### At-Rest Encryption
VeriMed supports PostgreSQL. Ensure your database disk is encrypted:
- **AWS RDS**: Enable Storage Encryption using KMS.
- **Self-Managed**: Use LUKS (Linux Unified Key Setup) or cloud-native block storage encryption.
- **SQLite**: **NOT RECOMMENDED** for PHI. Use PostgreSQL in production.

### In-Transit Encryption
- **TLS 1.3**: Always serve the API behind a reverse proxy (Nginx, Traefik) that enforces **TLS 1.3** only.
- **mTLS**: Consider mutual TLS for communication between your internal services and VeriMed.

## 2. Authentication & Access Control

- **API Keys**: Unique keys must be issued for each integrating application.
- **JWT Sessions**: Administrative sessions (reviews) use JWTs with a short expiration time.
- **Admin Passwords**: Must be hashed using Bcrypt (`npm run hash-password`). Rotate periodically.

## 3. Audit Logging

VeriMed logs every verification attempt to the `verification_log` table. 
- **PHI in Logs**: By default, VeriMed logs name and license number. Ensure access to the database is restricted.
- **External Logging**: Stream application logs (stdout/stderr) to a secure log management system (e.g., Elasticsearch, CloudWatch) with restricted access.

## 4. Business Associate Agreement (BAA)

If you are using VeriMed to process PHI on behalf of a covered entity, ensure you have a signed BAA with:
- Your Cloud Service Provider (AWS, GCP, Azure).
- OpenAI (if using AI Document Verification). **Note**: Using OpenAI for PHI requires an Enterprise agreement with OpenAI that includes a BAA.

## 5. Security Configuration Check

| Requirement | Config Item | Status |
|-------------|-------------|--------|
| Rate Limiting | `THROTTLE_LIMIT` | ✅ Implementation Included |
| Security Headers | `Helmet` | ✅ Implementation Included |
| CSRF Protection | N/A (Stateless API) | ➖ Not Applicable |
| Sensitive Data Masking | Custom Adapters | ⚠️ User Responsibility |

## 6. Self-Audit Checklist

1. [ ] Database encryption enabled?
2. [ ] TLS 1.3 enforced?
3. [ ] Default `API_KEY` changed in `.env`?
4. [ ] Admin password hashed and secure?
5. [ ] Minimal IAM permissions for the Docker container?

---

## 7. Upcoming Enterprise Compliance Features

VeriMed is developing the following compliance-enhancing features:

| Feature | Compliance Benefit |
|---------|-------------------|
| **Global Sanctions Checking** | Screen providers against OIG LEIE, SAM.gov, OFAC, UK GMC FtP |
| **Continuous Monitoring** | Automated alerts for license expirations, suspensions, revocations |
| **Batch Verification API** | Efficient bulk credentialing for enterprise onboarding |
| **Audit Log Enhancements** | Immutable logs for SOC 2 compliance |

---

*Disclaimer: This guide is for informational purposes and does not constitute legal advice. Please consult with your compliance officer.*

