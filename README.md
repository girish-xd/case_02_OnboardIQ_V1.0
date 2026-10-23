# OnboardIQ — Intelligent KYC Onboarding & Dual-Control Screening Platform

**HCLTech BFSI Hackathon | Track: Full Stack Web Engineer**  
**Fictional Institution:** Deccan Digital Bank (Scheduled Commercial Bank)  
**Implementation Date:** October 2026

---

## 1. Executive Summary

**OnboardIQ** is a production-ready, enterprise-grade digital onboarding, document extraction, automated KYC validation, and watchlist screening platform. It streamlines retail customer onboarding through high straight-through processing (STP) while enforcing strict regulatory governance via a backend-enforced **Maker-Checker** dual-control workflow.

### Non-Negotiable Engineering Principles Implemented:
1. **Deterministic Rule Decisioning:** 17 documented business rules (R1 through R17) with explicit decision precedence (`REJECT` > `REVIEW` > `APPROVE`). Zero reliance on non-deterministic LLMs for credit or KYC decisions.
2. **Dual-Control Governance:** Physical segregation of Maker (investigator/recommender) and Checker (approver/rejecter) roles. Complete server-side prohibition against self-approval.
3. **Privacy-by-Design:** Aadhaar restricted to last 4 digits; PAN masked across all public APIs, audit logs, and reports (`ABCXXXXX4F`).
4. **Zero-Configuration Offline Portability:** Built-in automatic fallback to `MongoMemoryServer` enables 100% offline local running, evaluation, and automated testing without external database dependencies.
5. **AI-Integration:** Addition of Groq as LLm for rules engine

---

## 2. System Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                      FRONTEND (VITE SPA)                    │
 │    React 18 • TypeScript • Tailwind CSS • Lucide Icons      │
 │  Role Switcher • Dual-Pane OCR Viewer • Masked Audit Export │
 └──────────────────────────────┬──────────────────────────────┘
                                │ REST over HTTP / JSON
                                │ (HttpOnly Cookie + CSRF)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                    BACKEND (MODULAR API)                    │
 │       Node.js 20 • Express • TypeScript • Mongoose          │
 │  ┌────────────────────────────────────────────────────────┐ │
 │  │ State Machine & Dual-Control Transition Service        │ │
 │  ├────────────────────────────────────────────────────────┤ │
 │  │ Deterministic KYC Rules Engine (R1–R17 & Precedence)   │ │
 │  ├────────────────────────────────────────────────────────┤ │
 │  │ Watchlist Screening (Sanctions & PEP Registry)         │ │
 │  ├────────────────────────────────────────────────────────┤ │
 │  │ Pluggable Extraction Adapter & Mock Core Banking       │ │
 │  ├────────────────────────────────────────────────────────┤ │
 │  │ Append-Only Regulatory Audit Service (PII-Masked)      │ │
 │  └────────────────────────────────────────────────────────┘ │
 └──────────────┬──────────────────────────────┬───────────────┘
                │                              │
                ▼                              ▼
 ┌─────────────────────────────┐ ┌─────────────────────────────┐
 │       MONGODB ATLAS /       │ │    LOCAL SECURE STORAGE     │
 │   IN-MEMORY STORAGE ENGINE  │ │   (SHA-256 Validated Files) │
 └─────────────────────────────┘ └─────────────────────────────┘
```

---

## 3. Quick Start & Local Execution

### Prerequisites
- Node.js v20.x or higher
- npm v10.x or higher
- Python 3.10+ (for optional live smoke test runner)

### Step 1: Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend & frontend packages
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### Step 2: Seed the Database
Initialize reference datasets (Sanctions, PEPs, Occupations, Existing Customers) and seed standard demo accounts:
```bash
npm run seed
```

### Step 3: Start the Application
Run both backend and frontend concurrently:
```bash
npm run dev
```
- **Frontend URL:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 4. Demo Walkthrough & Seeded Personas

The application features a **1-Click Demo Role Switcher** located in the top-right header, allowing evaluators to switch personas instantly without manual logout:

| Role | Username | Password | Key Capabilities to Explore |
| :--- | :--- | :--- | :--- |
| **Applicant** | `applicant1` | `password123` | Digital KYC submission form, document upload, status tracker, privacy-safe notes. |
| **Maker 1** | `maker1` | `password123` | FIFO review queue (high risk prioritized), dual-pane OCR comparison, field correction modal, recommendation. |
| **Maker 2** | `maker2` | `password123` | Alternative KYC Officer demonstrating queue locking and collaborative investigation. |
| **Checker** | `checker1` | `password123` | Independent sign-off, screening resolution, approve/reject/send-back actions. (Self-approval strictly barred). |
| **Admin** | `admin1` | `password123` | Operational KPIs (STP rate, review rate, top 5 reason codes), searchable audit journal, masked CSV export. |

---

## 5. Verification & Test Execution

### 5.1 Automated Jest Test Suites (18 of 18 Passed)
Execute the complete automated test suite covering deterministic KYC rules (R1–R17), RBAC permissions, Maker-Checker segregation, upload validation, and core banking idempotency:
```bash
npm test
```

### 5.2 Live End-to-End Smoke Test Harness (10 of 10 Steps Passed)
Execute the live HTTP smoke test against the running servers to verify the complete applicant-to-checker-to-admin lifecycle:
```bash
python scripts/smoke_test.py
```

### 5.3 Batch Evaluation on 100 Evaluation Records (FR-11)
Execute the batch evaluation script over the 100 evaluation applications (`case_02_applications_eval_V1.0.csv`) to produce the evaluation output CSV:
```bash
npm run batch
```
- **Generated Artifact:** [`output/decisions_output.csv`](output/decisions_output.csv) (100 evaluated records: 51 APPROVE, 31 REVIEW, 18 REJECT).

---

## 6. Official Evidence Pack & Deliverables

All documentation and hackathon deliverables are organized in [`docs/evidence/`](docs/evidence/) and [`output/`](output/):

| Document / Artifact | Description |
| :--- | :--- |
| [`output/decisions_output.csv`](output/decisions_output.csv) | Final batch decisions for all 100 evaluation applications (FR-11). |
| [`output/design/design_document.md`](output/design/design_document.md) | Flowcharts (R1–R17), status lifecycle, ER diagram, and API contracts. |
| [`docs/evidence/architecture.md`](docs/evidence/architecture.md) | Technical architecture, component boundaries, and security design. |
| [`docs/evidence/requirements-checklist.md`](docs/evidence/requirements-checklist.md) | Source requirement mapping (FR-1 through FR-11) and verification status. |
| [`docs/evidence/gap-register.md`](docs/evidence/gap-register.md) | Source ambiguities, assumptions, and safe default behaviors. |
| [`docs/evidence/api-contracts.md`](docs/evidence/api-contracts.md) | REST API schemas, request/response formats, error codes, and headers. |
| [`docs/evidence/data-dictionary.md`](docs/evidence/data-dictionary.md) | Database collections, Mongoose schemas, PII classifications, and indexes. |
| [`docs/evidence/security-review.md`](docs/evidence/security-review.md) | Comprehensive security review, OWASP risk analysis, and controls matrix. |
| [`docs/evidence/test-report.md`](docs/evidence/test-report.md) | Complete unit, integration, and live smoke test execution report. |
| [`docs/evidence/evaluation-report.md`](docs/evidence/evaluation-report.md) | Evaluation methodology, sample benchmark results, and metrics disclosure. |
| [`docs/evidence/deployment-guide.md`](docs/evidence/deployment-guide.md) | Production cloud deployment guide (Vercel, Railway, Atlas, Cloudinary). |
| [`docs/evidence/recovery-guide.md`](docs/evidence/recovery-guide.md) | Backup, disaster recovery runbook, and demo environment reset procedures. |
| [`docs/evidence/demo-guide.md`](docs/evidence/demo-guide.md) | Step-by-step evaluator walkthrough script for all 10 worked examples. |
| [`docs/evidence/demo-results.md`](docs/evidence/demo-results.md) | Actual execution logs and checkpoint evidence from live smoke harness. |

---

## 7. Known Limitations & Responsible Disclosures

1. **Third-Party Simulation:** Identity verification against PAN, Aadhaar, UIDAI, and Core Banking is simulated via deterministic mock adapters in strict adherence to the hackathon specification.
2. **Evaluation Ground Truth Isolation:** Ground truth labels for the 100 evaluation applications were reserved for the hackathon judging committee. In accordance with anti-fabrication principles, accuracy metrics are reported solely on the 60 sample records where ground truth was provided (100.0% exact match).
3. **In-Memory Database Option:** In local development without an external `MONGODB_URI`, the platform uses `MongoMemoryServer` to ensure zero setup friction for evaluators. For persistent production deployments, MongoDB Atlas should be configured.
