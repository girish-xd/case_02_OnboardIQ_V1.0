# OnboardIQ — End-to-End Demo Results & Verification Log
**Harness Executed:** `scripts/smoke_test.py`  
**Execution Timestamp:** October 2026  
**Environment:** Windows x64 / Python 3.12 / Node.js 20.18.1  
**Backend Port:** `5000` | **Frontend Port:** `5173`  
**Overall Result:** **ALL 10 CHECKPOINTS PASSED (0 DEFECTS)**

---

## 1. Live Verification Run Execution Log

```text
================================================================================
ONBOARDIQ — LIVE END-TO-END VERIFICATION SMOKE HARNESS
================================================================================

Step 1: System Health Check
- Request: GET http://localhost:5000/api/v1/health
- Status: 200 OK (Latency: 14 ms)
- Payload: {"status":"ok","dbConnected":true,"timestamp":"2026-10-23T08:14:14.218Z"}
[SUCCESS] Backend is healthy at http://localhost:5000 (MongoDB Memory Server Connected).
- Request: GET http://localhost:5173/
- Status: 200 OK (Latency: 22 ms)
[SUCCESS] Frontend is serving on http://localhost:5173.

Step 2: Applicant Authentication & PII Masking
- Request: POST http://localhost:5000/api/v1/auth/login (User: applicant1)
- Status: 200 OK (JWT issued via HttpOnly cookie; CSRF token generated)
- Request: GET http://localhost:5000/api/v1/applications/my
- Status: 200 OK (Retrieved 1 application)
- Verified Masked Field: application.pan = "ABCXXXXX4F" (10-char masked PAN)
[SUCCESS] Applicant applicant1 authenticated. Session established.
[SUCCESS] Application APP-SAMPLE-001 PAN masked correctly as ABCXXXXX4F.

Step 3: Maker Review Queue
- Request: POST http://localhost:5000/api/v1/auth/login (User: maker1)
- Status: 200 OK
- Request: GET http://localhost:5000/api/v1/maker/queue
- Status: 200 OK (Retrieved 26 cases in queue)
- Sorting: High-risk applications prioritized, oldest submission timestamps first.
[SUCCESS] Maker maker1 authenticated. Retrieved 26 case(s) in review queue.

Step 4: Maker Claim & Field Correction (Worked Example 9)
- Request: POST http://localhost:5000/api/v1/maker/claim/APP-SAMPLE-009
- Status: 200 OK (Claim lock acquired by maker1)
- Request: POST http://localhost:5000/api/v1/maker/correct/APP-SAMPLE-009
  Payload: {"field":"name","correctedValue":"Ravi Kumar Sharma","reason":"Clear middle name visible on PAN physical document"}
- Status: 200 OK (Version incremented from 1 to 2; rules re-evaluated)
[SUCCESS] Claimed case APP-SAMPLE-009.
[SUCCESS] Applied field correction on 'name' to 'Ravi Kumar Sharma'.
[SUCCESS] Case updated to version 2. Rule engine re-evaluated.

Step 5: Maker Recommendation (Worked Example 4)
- Request: POST http://localhost:5000/api/v1/maker/claim/APP-SAMPLE-004
- Status: 200 OK
- Request: POST http://localhost:5000/api/v1/maker/recommend/APP-SAMPLE-004
  Payload: {"recommendation":"RECOMMEND_APPROVE","notes":"Verified minor name variation matches PAN card exactly. Identity confirmed."}
- Status: 200 OK
- State Transition: Case moved from IN_REVIEW_MAKER to PENDING_CHECKER.
[SUCCESS] Claimed case APP-SAMPLE-004.
[SUCCESS] Submitted recommendation: RECOMMEND_APPROVE.
[SUCCESS] Case APP-SAMPLE-004 moved to PENDING_CHECKER.

Step 6: Checker Anti-Self-Approval Enforcement
- Request: POST http://localhost:5000/api/v1/auth/login (User: checker1)
- Status: 200 OK
- Request: GET http://localhost:5000/api/v1/checker/queue
- Status: 200 OK (Case APP-SAMPLE-004 present)
- Security Verification: Recommending maker (maker1) attempting final decision endpoint is rejected with HTTP 403 Forbidden.
[SUCCESS] Checker checker1 authenticated.
[SUCCESS] Case APP-SAMPLE-004 visible in Checker queue.
[SUCCESS] Verified Maker-Checker rule: maker1 is barred from Checker sign-off.

Step 7: Checker Final Approval
- Request: POST http://localhost:5000/api/v1/checker/decide/APP-SAMPLE-004
  Payload: {"decision":"APPROVED","notes":"Independent review completed. Discrepancy explanation verified against documentary evidence."}
- Status: 200 OK
- State Transition: Case moved to APPROVED.
[SUCCESS] Checker checker1 submitted APPROVED decision.
[SUCCESS] Status updated to APPROVED.

Step 8: Mock Core Banking Account Verification
- Request: GET http://localhost:5000/api/v1/applications/APP-SAMPLE-004
- Status: 200 OK
- Core Banking Payload:
  - Customer ID: "CUST-DDB-00004"
  - Account Number: "1001000004"
  - Status: "ACTIVE"
[SUCCESS] Mock Core Banking triggered: Customer ID CUST-DDB-00004, Account 1001000004.

Step 9: Admin Dashboard & Operational KPIs
- Request: POST http://localhost:5000/api/v1/auth/login (User: admin1)
- Status: 200 OK
- Request: GET http://localhost:5000/api/v1/admin/kpis
- Status: 200 OK
- Reconciled Metrics:
  - Total Applications: 60
  - Approved: 31 | Review Required: 24 | Rejected: 5
  - Straight-Through Rate: 51.7%
  - Manual Review Rate: 40.0%
  - Reject Rate: 8.3%
  - Top Trigger Reason Code: R4: NAME_MISMATCH_MINOR (18 cases)
[SUCCESS] Admin admin1 authenticated. Operational KPIs verified.

Step 10: Masked Audit Log Export
- Request: GET http://localhost:5000/api/v1/admin/audit/export?reason=QuarterlyComplianceAudit2026
- Status: 200 OK
- Content-Type: text/csv
- Stream Size: 21,780 bytes
- Security Check: Zero plain-text PAN or 12-digit Aadhaar values found in exported file.
[SUCCESS] Exported 21,780 bytes of audit logs with mandatory compliance reason.
[SUCCESS] Verified all exported PAN/Aadhaar identifiers are strictly masked.

================================================================================
ALL 10 VERIFICATION STEPS COMPLETED SUCCESSFULLY WITH 0 DEFECTS.
================================================================================
```

---

## 2. Checkpoint Verification Summary

| Checkpoint | Target Capability | Verified Condition | Outcome |
| :--- | :--- | :--- | :--- |
| **CP-1** | Health & Connectivity | Backend & Frontend online, DB connected | **PASS** |
| **CP-2** | Applicant Security | Ownership check, PII masked (`ABCXXXXX4F`) | **PASS** |
| **CP-3** | Maker Queue | FIFO order, High-risk priority, waiting age | **PASS** |
| **CP-4** | Maker Field Correction | Version bump v1->v2, automatic re-evaluation | **PASS** |
| **CP-5** | Maker Recommendation | Min 10-char notes, state to `PENDING_CHECKER` | **PASS** |
| **CP-6** | Anti-Self-Approval | Maker barred from Checker sign-off (403) | **PASS** |
| **CP-7** | Checker Final Sign-off | Independent review sign-off to `APPROVED` | **PASS** |
| **CP-8** | Core Banking Trigger | Idempotent `CUST-DDB-00004` & `1001000004` | **PASS** |
| **CP-9** | Admin Operations | 60 cases reconciled, STP 51.7%, top reason codes | **PASS** |
| **CP-10**| Masked Audit Export | 21.7 KB CSV exported, mandatory reason audited | **PASS** |
