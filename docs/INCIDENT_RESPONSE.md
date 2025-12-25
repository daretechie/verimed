# AI Incident Response Runbook

**Document Version**: 1.0
**Date**: December 2025
**System**: VeriMed AI Agent

---

## 1. Incident Categories

| Severity | Category | Example | Response Time |
|----------|----------|---------|---------------|
| **P1 (Critical)** | Safety | AI outputs patient harm recommendation | < 15 min |
| **P2 (High)** | Security | Prompt injection bypass detected | < 1 hour |
| **P3 (Medium)** | Accuracy | High false-positive rate in verifications | < 4 hours |
| **P4 (Low)** | Performance | Slow response times | < 24 hours |

---

## 2. Immediate Response Actions

### P1: Safety Incident
1. **KILL SWITCH**: Set `AI_KILL_SWITCH=true` in environment.
2. **Notify**: Alert engineering lead + DPO immediately.
3. **Isolate**: Block affected provider ID from further requests.
4. **Preserve**: Capture `AIAuditLog` entries for forensics.

### P2: Security Incident (Prompt Injection)
1. **Log Review**: Check `PromptSecurityService` detection logs.
2. **Pattern Update**: Add new attack pattern to heuristics.
3. **Redeploy**: Push hotfix to detection layer.
4. **Notify**: File internal security incident report.

### P3: Accuracy Incident
1. **Metrics Review**: Pull confidence score distribution from logs.
2. **Threshold Adjustment**: Consider lowering auto-verify threshold.
3. **Model Review**: Escalate to AI/ML team if systemic.

---

## 3. Kill Switch Procedure

```bash
# Production
heroku config:set AI_KILL_SWITCH=true -a verimed-prod

# Docker
docker exec verimed sed -i 's/AI_KILL_SWITCH=false/AI_KILL_SWITCH=true/' .env
docker restart verimed
```

**Effect**: All AI verification requests return `MANUAL_REVIEW` status immediately.

---

## 4. Post-Incident Actions

1. **Root Cause Analysis (RCA)**: Document within 48 hours.
2. **Backlog Items**: Create tickets for preventive measures.
3. **Stakeholder Communication**: Notify affected customers if data involved.
4. **Regulatory Reporting**: File with authorities if required (GDPR Art. 33).

---

## 5. Contact List

| Role | Contact |
|------|---------|
| Engineering Lead | [PLACEHOLDER] |
| Security Team | security@example.com |
| Data Protection Officer | dpo@example.com |
| Regulatory Affairs | legal@example.com |

---

**Last Drill Date**: [TO BE SCHEDULED]
**Next Drill Date**: Q1 2026
