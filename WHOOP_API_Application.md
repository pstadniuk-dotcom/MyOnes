# WHOOP API Access Application

**Ones — Personalized Micronutrient Optimization Platform**
**April 2026**

---

## 1. About Ones

Ones is a direct-to-consumer personalized supplement platform where users design custom vitamin formulas tailored to their health goals — energy, immunity, recovery, sleep, and more. Users select micronutrients, customize dosages within evidence-based ranges, and receive custom-formulated capsules delivered monthly.

Our users are athletes, fitness enthusiasts, and biohackers — the same demographic that wears WHOOP.

**Website:** www.ones.health

---

## 2. What We Want to Build

We're requesting read-only API access to integrate WHOOP recovery and strain data into our monthly formula optimization process.

**Endpoints requested:**
- Strain (0–21 scale)
- Recovery (0–100%)
- Sleep duration and sleep stages (REM, Deep, Light %)
- Resting Heart Rate (BPM)

**How we'll use the data:**

Users who connect their WHOOP account will see their physiological trends reflected in their next monthly formula. For example:

- **Consistently high strain** → formula adjusts Magnesium, Zinc, and Omega-3 upward for the next cycle
- **Chronically low REM sleep** → formula incorporates Magnesium Glycinate, L-Theanine, Vitamin B6
- **Low recovery trends** → formula emphasizes Vitamin D and B-Complex support

We aggregate 30 days of WHOOP data to inform each monthly formula update — this is trend-based optimization, not daily reactivity. Users always review and approve changes before their next order ships.

Over time, users will also see correlation insights in their dashboard (e.g., "Months where your Magnesium intake was optimized correlated with 12% higher average recovery scores"), reinforcing the value of both platforms.

---

## 3. Technical Implementation

| Component | Detail |
|---|---|
| **Authentication** | OAuth 2.0 — user-initiated, explicit consent required |
| **Data access** | Read-only. We will never modify WHOOP data. |
| **Sync frequency** | Daily pull at 6:00 AM UTC, cached for 24 hours |
| **Rate limits** | Will respect all WHOOP rate limits with exponential backoff |
| **Fallback** | If API is unavailable, we fall back to last-known data. Users are notified of stale data status. Service degrades gracefully. |

**System flow:**

User → Ones App → WHOOP OAuth Login → WHOOP API → Ones Backend → 30-Day Trend Analysis → Monthly Formula Recommendation → User Review & Approval → Manufacturing

**Infrastructure:** Hosted on AWS. All services monitored with automated alerting.

---

## 4. Data Security & Privacy

**Storage & Encryption**
- All WHOOP data encrypted at rest (AES-256) and in transit (TLS 1.3)
- OAuth tokens are never logged or persisted beyond the active session
- Stored in a secure AWS environment with automated backups

**Access Controls**
- Users can only access their own data
- Internal access is role-based and audit-logged
- No WHOOP data is shared with third parties — ever

**Data Retention**
- Rolling 30-day window for active recommendations
- Users can request full data deletion at any time, fulfilled within 30 days

**Compliance**
- GDPR and CCPA compliant
- Privacy policy will explicitly disclose WHOOP data usage and scope
- Will execute any Data Processing Agreement WHOOP requires

**Security Commitments**
- Penetration testing prior to go-live
- Annual third-party security audits
- SOC 2 Type II certification targeted within 12 months of launch

---

## 5. Implementation Timeline

| Phase | Timeline | Deliverables |
|---|---|---|
| **Setup** | Weeks 1–2 | DPA executed, API credentials provisioned, OAuth flow built |
| **Development** | Weeks 3–8 | Data sync pipeline, trend analysis engine, dashboard UI |
| **Testing** | Weeks 9–11 | Internal QA, security audit, beta with initial user cohort |
| **Launch** | Week 12 | Public launch of WHOOP integration |

**Post-launch success metrics:**
- API uptime: >99.5%
- Recommendation latency: <2 hours after daily sync
- User satisfaction with WHOOP integration: >4.5/5

---

## Contact

**Company:** Ones
**Website:** www.ones.health
**Email:**

*This application is confidential and intended for WHOOP's internal review.*
