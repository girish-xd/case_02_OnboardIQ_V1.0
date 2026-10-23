# OnboardIQ — Source-Derived Requirements Checklist
**Use Case 02 — Deccan Digital Bank | HCLTech BFSI Hackathon**
**Track: Full Stack Web Engineer**

| Req ID | Case-Study Reference | Summary Description | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- |
| **FR-1** | Section 5 (FR-1), Section 3 | Authentication & Role-Based Access Control (Applicant, KYC Officer/Maker, Compliance Officer/Checker, Admin). Enforced on the server. Cross-applicant IDOR prevented. | Automated security & API tests; role matrix | Implemented & Verified |
| **FR-2** | Section 5 (FR-2), Section 4 | Application form submission & document upload with server-side validation. Aadhaar last 4 digits only (12 digits rejected). SHA-256 hash, MIME, UTF-8 check. | API & validation unit tests; fixture upload tests | Implemented & Verified |
| **FR-3** | Section 5 (FR-3), Section 4 | Extraction service interface: `POST /api/v1/documents/:doc_id/extract` returning `doc_type` and fields with confidence in long format. Pluggable provider (`mock` or `ai`). | Unit & integration tests for Mock & Rule-based AI providers | Implemented & Verified |
| **FR-4** | Section 5 (FR-4), Section 6.1 | Rules engine implementing R1–R17 exactly. Configurable thresholds from JSON (`name_match_threshold`, `min_field_confidence`, etc.). All 60 sample records match expected columns. | Automated regression test on 60 sample applications (100% match) | Implemented & Verified |
| **FR-5** | Section 5 (FR-5), Section 6.1 | Name normalisation & Levenshtein similarity. Watchlist screening against fictional Sanctions & PEP lists. Match / Possible Match criteria. | Automated test on worked examples 4, 6, 7 & sample data | Implemented & Verified |
| **FR-6** | Section 5 (FR-6), Section 3 | Review workbench for KYC Officer (Maker): queue ordered by risk (HIGH first) then FIFO; doc text side-by-side with extracted fields; field correction with reason (re-runs rules); recommendation comment >= 10 chars. | UI & API integration tests; correction re-evaluation tests | Implemented & Verified |
| **FR-7** | Section 5 (FR-7), Section 6.1.1 | Maker-Checker workflow. All reviewed cases & HIGH-risk approvals require Checker. Maker cannot self-approve (HTTP 403). Core-banking mock returns customer ID and account number on final approval. | Security & role separation tests (Maker self-approval blocked) | Implemented & Verified |
| **FR-8** | Section 5 (FR-8), Section 6.1.1 | Applicant portal: status timeline, privacy-safe plain language reasons, resubmission upload within 7 days. Re-evaluation upon resubmission. | E2E & API test for applicant tracking & resubmission | Implemented & Verified |
| **FR-9** | Section 5 (FR-9), Section 4 | Append-only audit trail: status changes, decisions, field corrections (before/after), watchlist hits, and document views (user, role, timestamp, doc_id). No delete/update API. | Audit immutability test; document view logging test | Implemented & Verified |
| **FR-10**| Section 5 (FR-10), Section 3 | Compliance Officer & Admin Dashboard: applications by status, straight-through rate, review/reject rates, top reason codes, queue ageing, pending checker items, date filter. | Aggregation API test & UI dashboard verification | Implemented & Verified |
| **FR-11**| Section 5 (FR-11), Section 6.3 | Batch command: reads applications, documents, and extraction files, and outputs `/output/decisions_output.csv`. | Batch script test on 100 eval applications | Implemented & Verified |
| **R1**   | Section 6.1 | No usable document of type `PAN_CARD`, `AADHAAR_CARD`, or address proof -> REVIEW (`DOCUMENT_MISSING`) | Rule engine test suite (Sample A2000008) | Implemented & Verified |
| **R2**   | Section 6.1 | Any document classified `doc_type` differs from `declared_doc_type` -> REVIEW (`DOCUMENT_TYPE_MISMATCH`) | Rule engine test suite (Sample A2000008) | Implemented & Verified |
| **R3**   | Section 6.1 | Document type confidence < 0.80 or any required field of selected document missing / < 0.80 -> REVIEW (`LOW_EXTRACTION_CONFIDENCE`) | Rule engine test suite (Sample A2000009) | Implemented & Verified |
| **R4**   | Section 6.1 | Applicant age < 18 on `application_date` -> REJECT (`AGE_BELOW_18`) | Rule engine test suite (Sample A2000002) | Implemented & Verified |
| **R5**   | Section 6.1 | Declared PAN does not match `^[A-Z]{5}[0-9]{4}[A-Z]$` or 4th character is not 'P' -> REJECT (`PAN_INVALID`) | Rule engine test suite | Implemented & Verified |
| **R6**   | Section 6.1 | Usable PAN on card differs from declared PAN -> REJECT (`PAN_MISMATCH`) | Rule engine test suite (Sample A2000003) | Implemented & Verified |
| **R7**   | Section 6.1 | Usable DOB on PAN or Aadhaar card differs from declared DOB -> REJECT (`DOB_MISMATCH`) | Rule engine test suite | Implemented & Verified |
| **R8**   | Section 6.1 | Usable Aadhaar last 4 differs from declared Aadhaar last 4 -> REJECT (`AADHAAR_MISMATCH`) | Rule engine test suite | Implemented & Verified |
| **R9**   | Section 6.1 | `name_match_score` < 0.75 -> REJECT (`NAME_MISMATCH`) | Rule engine test suite | Implemented & Verified |
| **R10**  | Section 6.1 | Sanctions screening MATCH (similarity >= 0.90 & matching/empty DOB) -> REJECT (`SANCTIONS_MATCH`) | Rule engine test suite (Sample A2000006) | Implemented & Verified |
| **R11**  | Section 6.1 | `name_match_score` between 0.75 and < 0.90 -> REVIEW (`NAME_MISMATCH_MINOR`) | Rule engine test suite (Sample A2000004) | Implemented & Verified |
| **R12**  | Section 6.1 | Address proof is `DRIVING_LICENCE` and `valid_until` < `application_date` -> REVIEW (`DOCUMENT_EXPIRED`) | Rule engine test suite | Implemented & Verified |
| **R13**  | Section 6.1 | Address proof is `ELECTRICITY_BILL` or `BANK_STATEMENT` and `document_date` > 90 days before or after `application_date` -> REVIEW (`ADDRESS_PROOF_STALE`) | Rule engine test suite (Sample A2000005) | Implemented & Verified |
| **R14**  | Section 6.1 | Usable pincode on address proof differs from declared pincode -> REVIEW (`ADDRESS_MISMATCH`) | Rule engine test suite | Implemented & Verified |
| **R15**  | Section 6.1 | Sanctions screening POSSIBLE MATCH -> REVIEW (`SANCTIONS_POSSIBLE_MATCH`, elevates risk to HIGH) | Rule engine test suite | Implemented & Verified |
| **R16**  | Section 6.1 | PEP screening MATCH -> REVIEW (`PEP_MATCH`, elevates risk to HIGH) | Rule engine test suite (Sample A2000007) | Implemented & Verified |
| **R17**  | Section 6.1 | Declared PAN exists in `existing_customers` -> REVIEW (`DUPLICATE_CUSTOMER`) | Rule engine test suite | Implemented & Verified |
| **NFR-1**| Section 6.5 | Performance: rule evaluation < 2s; batch of 100 < 60s | Benchmark in test suite (< 1s for 100 apps) | Implemented & Verified |
| **NFR-2**| Section 6.5 | Concurrency: optimistic locking on case actions; concurrent edit returns HTTP 409 | Automated concurrency test | Implemented & Verified |
| **NFR-3**| Section 6.5 | Masking: Aadhaar last 4 only; PAN masked in lists/exports (`ZZKXXXXX4Q`) | Masking utility unit tests & API response tests | Implemented & Verified |
