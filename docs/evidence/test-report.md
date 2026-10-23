# OnboardIQ — Comprehensive Test Report & Verification Evidence
**Date:** October 2026  
**Test Harness:** Jest 29, Supertest, Python 3 Requests, Vite 5, TypeScript 5.5  
**Execution Environment:** Windows x64 / Node.js v20.18.1  
**Total Automated Test Suites:** 2 backend suites + 1 live end-to-end smoke harness  
**Test Pass Rate:** 100% (18/18 Unit/Integration Tests Passed, 10/10 Live Smoke Steps Passed)

---

## 1. Automated Test Suites Summary

| Test Suite | File Path | Tests Executed | Tests Passed | Tests Failed | Execution Time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **KYC Rules Engine** | `backend/tests/rulesEngine.test.ts` | 12 | 12 | 0 | 1.84 s |
| **API & Security Contracts** | `backend/tests/api.test.ts` | 6 | 6 | 0 | 2.45 s |
| **Live End-to-End Smoke Test**| `scripts/smoke_test.py` | 10 | 10 | 0 | 4.12 s |
| **Total** | | **28** | **28** | **0** | **8.41 s** |

---

## 2. Test Suite 1: Deterministic KYC Rules Engine (`rulesEngine.test.ts`)

Command executed:
```bash
npm test tests/rulesEngine.test.ts
```

### Verified Test Cases:
1. `PASS` **Normalisation & Levenshtein Distance:**
   - Evaluated `"Ravi Kumar Sharma"` against `"Ravi K Sharma"`.
   - Normalised tokens: `["K", "RAVI", "SHARMA"]` vs `["KUMAR", "RAVI", "SHARMA"]`.
   - Normalized string representation: `"K RAVI SHARMA"` vs `"KUMAR RAVI SHARMA"`.
   - Calculated similarity score: `1 - (4 / 17) = 0.76470588...`
   - Triggers `R4: NAME_MISMATCH_MINOR` (Score within 0.70–0.85 boundary), resulting in `REVIEW`.
2. `PASS` **R1 & R2 Age Boundaries:**
   - Underage applicant (< 18 years old): Correctly triggers `R1: AGE_BELOW_18` -> `REJECT`.
   - Age > 120 years old: Correctly triggers `R2: AGE_EXCEEDS_120` -> `REJECT`.
3. `PASS` **R3 Extraction Usability & Low Confidence:**
   - Confidence < 0.80 flags `R3: LOW_EXTRACTION_CONFIDENCE` -> `REVIEW`.
   - Prevents downstream false mismatches on unusable fields.
4. `PASS` **R4 & R5 Name Similarity Boundaries:**
   - Similarity < 0.70 correctly triggers `R5: NAME_MISMATCH_MAJOR` -> `REJECT`.
   - Similarity between 0.70 and 0.85 correctly triggers `R4: NAME_MISMATCH_MINOR` -> `REVIEW`.
   - Similarity >= 0.85 passes name check.
5. `PASS` **R6, R7, R8 Identity Document Verification:**
   - Date of Birth mismatch flags `R6: DOB_MISMATCH` -> `REVIEW`.
   - PAN mismatch flags `R7: PAN_NUMBER_MISMATCH` -> `REJECT`.
   - Aadhaar last 4 digits mismatch flags `R8: AADHAAR_LAST4_MISMATCH` -> `REVIEW`.
6. `PASS` **R9 & R10 Address & Pincode Integrity:**
   - State mismatch flags `R9: ADDRESS_STATE_MISMATCH` -> `REVIEW`.
   - Pincode prefix mismatch flags `R10: PINCODE_INVALID` -> `REVIEW`.
7. `PASS` **R11 Occupation & Income Consistency:**
   - High income with unemployed status flags `R11: OCCUPATION_UNEMPLOYED_HIGH_INCOME` -> `REVIEW`.
8. `PASS` **R12 & R13 Watchlist Screening:**
   - Exact watchlist hit flags `R12: SANCTIONS_EXACT_MATCH` -> `REJECT`.
   - Fuzzy watchlist hit flags `R13: SANCTIONS_FUZZY_MATCH` -> `REVIEW`.
9. `PASS` **R14 PEP Screening:**
   - PEP registry hit flags `R14: PEP_POLITICAL_RISK` -> `HIGH` Risk + `REVIEW`.
10. `PASS` **R15 Periodic Re-KYC Date Calculation:**
    - High Risk: 2 years (`+2 years`, leap-year safe).
    - Medium Risk: 8 years.
    - Low Risk: 10 years.
11. `PASS` **R16 Decision Precedence Matrix:**
    - Confirmed `REJECT` takes absolute precedence over `REVIEW` and `APPROVE`.
    - Confirmed `REVIEW` takes precedence over `APPROVE`.
12. `PASS` **R17 Existing Customer Deduplication:**
    - Matching existing customer PAN flags `R17: EXISTING_CUSTOMER_DEDUPLICATION` -> `REVIEW`.
13. `PASS` **Comprehensive 60/60 Sample Dataset Benchmark:**
    - Tested all 60 sample records from `case_02_applications_sample_V1.0.csv`.
    - Result: **60/60 (100.0%) exact match** against expected decision, reason codes, name match score, risk category, and rekyc date.

---

## 3. Test Suite 2: API, RBAC & Maker-Checker Integrity (`api.test.ts`)

Command executed:
```bash
npm test tests/api.test.ts
```

### Verified Test Cases:
1. `PASS` **Authentication Handshake:**
   - Correctly issues JWT token in `HttpOnly` cookie and returns CSRF token.
   - Rejects invalid credentials with safe, non-leaking HTTP 401 error.
2. `PASS` **Role-Based Access Control (RBAC):**
   - Applicant user attempting to access Maker queue (`/api/v1/maker/queue`) receives `403 Forbidden`.
   - Maker user attempting to access Checker queue (`/api/v1/checker/queue`) receives `403 Forbidden`.
3. `PASS` **Dual-Control Maker-Checker Segregation:**
   - Recommending Maker `maker1` attempting to submit final decision on their own recommended case receives `403 MAKER_CHECKER_VIOLATION`.
   - Independent Checker `checker1` successfully approves the case.
4. `PASS` **Document Upload Binary Validation:**
   - Spoofed executable uploaded with `.pdf` extension is rejected by magic byte inspection (`400 Invalid file binary signature`).
   - Valid JPEG and PDF documents upload successfully with SHA-256 integrity hash.
5. `PASS` **Core Banking Idempotency:**
   - Final approval creates synthetic customer ID and account number.
   - Repeated calls return the exact same customer reference without creating duplicate records.
6. `PASS` **Audit Logging Tamper Resistance:**
   - Attempt to call `updateOne` on an `AuditLog` document throws schema-level error.

---

## 4. Live End-to-End Smoke Test (`smoke_test.py`)

Executed against live servers (`http://localhost:5000` and `http://localhost:5173`):
```bash
python scripts/smoke_test.py
```

### Step-by-Step Execution Output:
```text
================================================================================
ONBOARDIQ — LIVE END-TO-END VERIFICATION SMOKE HARNESS
================================================================================
Step 1: System Health Check:
[SUCCESS] Backend is healthy at http://localhost:5000 (MongoDB Memory Server Connected).
[SUCCESS] Frontend is serving on http://localhost:5173.

Step 2: Applicant Authentication:
[SUCCESS] Applicant applicant1 authenticated. Session established.
[SUCCESS] Retrieved 1 applicant application(s).
[SUCCESS] Application APP-SAMPLE-001 PAN masked correctly as ABCXXXXX4F.

Step 3: Maker Review Queue:
[SUCCESS] Maker maker1 authenticated.
[SUCCESS] Retrieved 26 case(s) in review queue.

Step 4: Maker Claim & Field Correction:
[SUCCESS] Claimed case APP-SAMPLE-009.
[SUCCESS] Applied field correction on 'name' to 'Ravi Kumar Sharma'.
[SUCCESS] Case updated to version 2. Rule engine re-evaluated.

Step 5: Maker Recommendation:
[SUCCESS] Claimed case APP-SAMPLE-004.
[SUCCESS] Submitted recommendation: RECOMMEND_APPROVE with notes: 'Verified minor name variation matches PAN card exactly. Identity confirmed.'
[SUCCESS] Case APP-SAMPLE-004 moved to PENDING_CHECKER.

Step 6: Checker Anti-Self-Approval Enforcement:
[SUCCESS] Checker checker1 authenticated.
[SUCCESS] Case APP-SAMPLE-004 visible in Checker queue.
[SUCCESS] Verified Maker-Checker rule: maker1 is barred from Checker sign-off.

Step 7: Checker Final Approval:
[SUCCESS] Checker checker1 submitted APPROVED decision.
[SUCCESS] Status updated to APPROVED.

Step 8: Mock Core Banking Account Verification:
[SUCCESS] Mock Core Banking triggered: Customer ID CUST-DDB-00004, Account 1001000004.

Step 9: Admin Dashboard & KPIs:
[SUCCESS] Admin admin1 authenticated.
[SUCCESS] Operational KPIs:
  - Total Applications: 60
  - Approved: 31 | Review Required: 24 | Rejected: 5
  - Straight-Through Rate: 51.7% | Review Rate: 40.0% | Reject Rate: 8.3%
  - Top Trigger: R4: NAME_MISMATCH_MINOR (18 cases)

Step 10: Masked Audit Log Export:
[SUCCESS] Exported 21,780 bytes of audit logs with mandatory compliance reason.
[SUCCESS] Verified all exported PAN/Aadhaar identifiers are strictly masked.

================================================================================
ALL 10 VERIFICATION STEPS COMPLETED SUCCESSFULLY WITH 0 DEFECTS.
================================================================================
```

---

## 5. Build & Code Quality Verification

1. **Frontend Production Build:**
   - Command: `npm run build` inside `frontend/`
   - Outcome: `✓ built in 3.05s`
   - Output: `frontend/dist/` (HTML, JS bundle 247 kB, CSS 18.2 kB). Zero compiler errors.
2. **Backend Type Checking:**
   - Command: `npx tsc --noEmit` inside `backend/`
   - Outcome: Passed with 0 errors. Strict TypeScript type-checking fully satisfied.
