# ONES AI — Current Compliance & Risk Controls Summary

**Prepared:** March 2, 2026  
**Purpose:** Overview of existing safety, consent, and risk controls for legal/regulatory review  
**Platform:** ONES AI — personalized supplement formula platform (React + Express + PostgreSQL)

---

## 1. Disclaimers & Consent Points in the User Journey

| Touchpoint | Mechanism | Blocking? |
|------------|-----------|-----------|
| **Website footer** | Links to Medical Disclaimer (`/disclaimer`), Terms of Service (`/terms`), Privacy Policy (`/privacy`) on every page | — |
| **Medical Disclaimer page** | 10-section page covering: not medical advice, consult your provider, FDA disclaimer, not HIPAA compliant, pregnancy/nursing warning, allergies responsibility, medical emergencies (call 911), no accuracy warranties | — |
| **Terms of Service** | States ONES "does not provide medical advice or replace consultation with healthcare professionals"; requires users be 18+ | Implied acceptance ("By accessing or using Ones, you agree…") |
| **Checkout / Order** | **Mandatory checkbox** — cannot place an order without checking: *"I have disclosed all medications, conditions, and allergies and will consult my physician before starting. Not medical advice; not evaluated by the FDA."* Links to full disclaimer. Order button is disabled until checked. | **Yes — blocking** |
| **Lab data upload** | **Consent dialog** required before any lab file upload or AI analysis. User must click "I Consent" after reviewing: secure storage, AI biomarker analysis, personalized recommendations. Consent recorded in `user_consents` table with timestamp, IP, user agent, and full consent text. | **Yes — blocking** |
| **SMS reminders** | TCPA-style opt-in: *"I agree to receive recurring SMS accountability and supplement reminders from ONES. Msg frequency varies. Msg and data rates may apply. Reply STOP to opt out, HELP for help."* Server verifies consent record before sending any SMS. | **Yes — blocking** |
| **Shared formula view** | Displays: *"This formula is personalized for the individual user and shared for informational purposes only. It is not intended to diagnose, treat, cure, or prevent any disease."* | — |
| **PDF formula export** | Bold "NOT a substitute for professional medical advice, diagnosis, or treatment" + standard FDA supplement disclaimer printed on every exported PDF. | — |
| **AI-generated formulas** | AI system prompt mandates disclaimer text in every formula JSON output: *"This is not medical advice"*, *"Consult healthcare provider before starting."* | — |

---

## 2. Data Collected for Contraindication Screening

The platform collects a structured health profile before formula generation:

- **Demographics:** Age, sex, weight, height
- **Vitals:** Blood pressure (systolic/diastolic), resting heart rate
- **Lifestyle:** Sleep hours, exercise frequency, stress level (1–10), smoking status, alcohol intake
- **Safety-critical fields:**
  - `conditions` — free-text array of medical conditions
  - `medications` — free-text array of current medications
  - `allergies` — free-text array of known allergies
  - `medicationDisclosedAt` — timestamp proving user completed medication disclosure (null = never answered)
- **Health goals:** User-selected objectives (energy, sleep, cognition, etc.)
- **Lab results:** Uploaded PDFs processed by AI; biomarker values extracted and stored

All of this data is serialized and injected into the AI system prompt for every chat/formula interaction, ensuring the AI has full context for safety-aware recommendations.

---

## 3. What Is Logged as Proof

| Record Type | Storage | Details |
|-------------|---------|---------|
| **Consent grants/revocations** | `user_consents` table | Who, what type (lab processing, AI analysis, SMS, medication disclosure, etc.), when granted, when revoked, consent version, IP address, user agent, full consent text, source metadata |
| **Consent audit log** | Server console (structured) | `"HIPAA AUDIT LOG - Consent Granted"` / `"Consent Revoked"` / `"Consent Violation"` / `"Consent Verified"` with timestamp, userId, consentType, IP |
| **File operation audit** | `audit_logs` table + GCS object metadata | Every upload/view/download/delete/share/access-denied logged with userId, action, object path, IP, user agent, success/failure, error message, metadata. Last 100 entries retained per cloud object. |
| **Conversation history** | `messages` table | Every user and AI message persisted with role, content, AI model used, formula JSON (if generated), timestamp — linked to chat sessions |
| **Formula versions** | `formulas` + `formulaVersionChanges` tables | Every formula revision tracked with version number, change summary, rationale, and timestamp |
| **Medication disclosure timestamp** | `healthProfiles.medicationDisclosedAt` | Records when user last disclosed/updated medications |
| **File retention (soft delete)** | `fileUploads.deletedAt` / `deletedBy` | PHI files are soft-deleted, never hard-deleted, preserving audit trail |

---

## 4. Safety & Interaction Controls

### 4.1 Ingredient Catalog (Whitelist)
- **~200+ individual ingredients** and **18 system supports** defined in a single source-of-truth catalog
- Each ingredient has: standard dose, minimum dose, maximum dose
- System supports have fixed-dose multipliers (1×/2×/3×)
- Ingredient safety profiles include documented interactions (e.g., "May interact with thyroid medications")

### 4.2 Server-Side Formula Validation (Immutable)
Server enforces hard limits that cannot be overridden by user input or AI output:
- Capsule counts restricted to 6, 9, or 12
- Total mg capped at capsule budget + 2.5% tolerance (e.g., 9 caps = max 5,074 mg)
- Minimum 90% budget utilization (prevents trivially small formulas)
- Per-ingredient dose clamped to catalog min/max ranges
- Minimum 8, maximum 50 ingredients per formula
- **Every ingredient validated against the approved catalog** — unauthorized ingredients rejected or silently removed with a logged warning

### 4.3 Medication–Supplement Interaction Checker (19 Drug Categories)
A deterministic, server-side function checks the user's disclosed medications against the formula and returns warnings or critical removals:

| Severity | Action | Example |
|----------|--------|---------|
| **Critical / Remove** | Ingredient auto-removed from formula | St. John's Wort + any SSRI/SNRI; Red Yeast Rice + statins; St. John's Wort + immunosuppressants |
| **Warning** | Warning text added to formula output | Omega-3 + blood thinners; Ashwagandha + thyroid meds; Berberine + diabetes meds |
| **Physician Required** | Flags that physician approval is needed | Any supplement + chemotherapy agents |
| **Antiplatelet Stacking** | Triggered without any medication | ≥3 blood-thinning supplements in one formula |

Covers: blood thinners, SSRIs/SNRIs, thyroid, diabetes, blood pressure, immunosuppressants, chemotherapy, statins, hormones, seizure meds, sedatives/benzos, opioids, ADHD stimulants, PPIs, antibiotics, corticosteroids, cardiac glycosides, CYP450 narrow-therapeutic-index drugs, and kidney impairment.

**Fallback** (no medications disclosed): Formula includes blanket warning — *"If you take any prescription medications, consult your physician or pharmacist before starting this formula."*

### 4.4 AI Prompt Safety Rules
The AI system prompt includes:
- **Full 19-category interaction table** with step-by-step instructions: review medications → identify categories → scan formula → add warnings → remove absolute contraindications
- **Anti-hallucination rule:** *"NEVER invent lab results, biomarker values, or test data… this is medical misinformation and extremely dangerous."*
- **Mandatory disclaimer:** Every formula must include physician consultation language

### 4.5 Infrastructure Security
- Rate limiting: 200 req/15 min (general), 10 req/15 min (auth), 50 req/hr (AI chat)
- Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`
- JWT authentication (7-day expiry), bcrypt password hashing (10 rounds)
- AES-256-GCM encryption for stored OAuth tokens (wearable integrations)
- Consent-gated file operations: lab uploads/downloads/AI analysis require verified consent records

---

## 5. What We Do NOT Do

- **We do not diagnose.** All disclaimer and prompt language explicitly states the platform does not diagnose medical conditions.
- **We do not treat, cure, or prevent disease.** Standard FDA DSHEA disclaimer language is present on the disclaimer page, PDF exports, checkout, shared formula views, and in AI-generated output.
- **We do not provide medical advice.** Stated in Terms of Service, Medical Disclaimer, checkout consent, AI prompts, and PDF exports.
- **We are not HIPAA compliant.** Explicitly disclaimed on both the Medical Disclaimer and Privacy Policy pages: *"Ones is not HIPAA compliant… we are not certified for HIPAA compliance. Do not use Ones for storing or transmitting protected health information (PHI) that requires HIPAA compliance."* (The platform does implement HIPAA-style controls — ACLs, audit logs, consent gating, soft deletes, encryption flags — but holds no certification.)
- **We do not replace a physician.** Users are told to consult their healthcare provider before starting any supplement regimen, and this is a blocking requirement at checkout.
- **We do not sell user data.** Privacy policy states data is not sold; sharing is limited to service providers.

---

## 6. Top 5 Gaps to Address Next

| # | Gap | Risk | Recommended Action |
|---|-----|------|--------------------|
| **1** | **No explicit Terms/Disclaimer acceptance at registration** | User could complete sign-up and interact with the AI without ever agreeing to Terms of Service or Medical Disclaimer. Current acceptance is implied ("By using Ones, you agree…") rather than affirmative. | Add a mandatory checkbox at registration: *"I agree to the Terms of Service and have read the Medical Disclaimer."* Record acceptance in `user_consents` with timestamp, IP, and consent text. |
| **2** | **Medication interaction rules are hand-coded, not backed by a clinical database** | The 19-category interaction checker is comprehensive but static. New drugs, reclassifications, or edge-case interactions may be missed. No automated update mechanism. | Evaluate integrating a licensed drug–supplement interaction database (e.g., Natural Medicines, Lexicomp) or establish a periodic clinical review cadence for the rule set. |
| **3** | **No centralized, tamper-evident audit log aggregation** | Audit entries are split across the database (`audit_logs`, `user_consents`), GCS object metadata, and server console output. Console logs are ephemeral and not reliably retained. No SIEM or immutable log store. | Implement centralized logging (e.g., Datadog, AWS CloudWatch, or a write-once audit table) with retention policies aligned to regulatory requirements. |
| **4** | **Checkout consent is client-side only — not persisted server-side** | The "I have disclosed all medications…" checkbox at checkout gates the UI button but the acknowledgment is not recorded in the `user_consents` table as a durable, timestamped record. | On order submission, send the consent acknowledgment to the server and persist it as a `medication_disclosure` consent record with IP, timestamp, and consent text. |
| **5** | **No formal data retention or deletion policy** | Files use soft-delete and a `retentionPolicyId` field exists but no retention schedule is defined or enforced. No documented process for user data deletion requests (right to erasure / CCPA). | Define and implement a data retention policy (e.g., 7 years for health data) and a user data export/deletion workflow for privacy regulation compliance (GDPR Art. 17, CCPA). |

---

*This document reflects the state of the codebase as of March 2, 2026. It is intended for internal use and discussion with legal counsel — it does not constitute legal advice.*
