# OnboardIQ — Data Dictionary & Schema Specifications
**Database System:** MongoDB / Mongoose  
**Encryption:** Managed encryption-at-rest; TLS 1.3 in-transit  
**Privacy Strategy:** Strict PII minimization; keyed hashing for sensitive lookups; full PAN/Aadhaar never stored in plain-text audit or logs.

---

## 1. Entity Overview

The schema is divided into 10 distinct collections:
1. `users` — System authentication, user profiles, and RBAC roles.
2. `applications` — Core onboarding state machine, identity attributes, and workflow decisions.
3. `documents` — Metadata, SHA-256 integrity hashes, storage pointers, and version history.
4. `extractions` — OCR extracted key-value pairs, field confidence scores, and usability flags.
5. `audit_logs` — Append-only, tamper-evident regulatory audit trail.
6. `notifications` — In-app customer notification outbox.
7. `sanctions_list` — Fictional watchlist dataset for OFAC/UN screening simulation.
8. `pep_list` — Politically Exposed Persons registry for risk assessment.
9. `existing_customers` — Core banking registry for existing customer deduplication (R17).
10. `occupations` — Regulatory risk classification table for occupations (R14).

---

## 2. Detailed Collection Schemas

### 2.1 `users` Collection
Stores user credentials, contact details, and role assignments.
| Field | Type | Required | Constraints / Description | PII Classification |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Primary Key | Internal |
| `username` | String | Yes | Unique, lowercase, indexed | Confidential |
| `email` | String | Yes | Valid email format, lowercase | Confidential PII |
| `passwordHash`| String | Yes | Salted bcrypt hash (rounds = 10) | Sensitive Secret |
| `role` | String | Yes | Enum: `APPLICANT`, `MAKER`, `CHECKER`, `ADMIN` | Internal |
| `fullName` | String | Yes | Display name | Public |
| `createdAt` | Date | Yes | Default: `Date.now` | Internal |

---

### 2.2 `applications` Collection
Central record tracking application status, KYC evaluation, dual-control workflow, and core banking integration.
| Field | Type | Required | Constraints / Description | PII Classification |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Primary Key | Internal |
| `applicationId`| String | Yes | Unique business ID (e.g. `APP-2026-001`), indexed | Public Reference |
| `applicantId` | ObjectId | Yes | Foreign Key referencing `users._id`, indexed | Internal |
| `version` | Number | Yes | Optimistic locking revision (increments on every mutation) | Internal |
| `status` | String | Yes | Enum: `DRAFT`, `SUBMITTED`, `AUTO_APPROVED`, `MANUAL_REVIEW_REQUIRED`, `PENDING_MAKER`, `IN_REVIEW_MAKER`, `PENDING_CHECKER`, `APPROVED`, `REJECTED`, `REQUEST_RESUBMISSION` | Internal State |
| `fullName` | String | Yes | Applicant provided full legal name | Confidential PII |
| `dateOfBirth` | String | Yes | Format `YYYY-MM-DD` | Confidential PII |
| `pan` | String | Yes | 10-char PAN (Masked as `ABCXXXXX4F` in API) | Highly Sensitive PII |
| `aadhaarLast4` | String | Yes | 4 digits only (Never full 12 digits) | Highly Sensitive PII |
| `address` | String | Yes | Street address | Confidential PII |
| `state` | String | Yes | State/Province name | Public |
| `pincode` | String | Yes | 6-digit postal code | Public |
| `occupation` | String | Yes | Regulatory occupation code (e.g. `SALARIED`, `POLITICIAN`) | Internal |
| `evaluation` | Object | No | Contains automated rule engine findings: | Internal |
| ↳ `decision` | String | Yes | Enum: `APPROVE`, `REVIEW`, `REJECT` | Internal |
| ↳ `reasonCodes`| [String]| Yes | List of triggered rule reason codes (e.g. `R4: NAME_MISMATCH_MINOR`) | Internal |
| ↳ `nameMatchScore`| Number | Yes | Token-sorted Levenshtein similarity score (0.0000 - 1.0000) | Internal |
| ↳ `riskCategory`| String | Yes | Enum: `LOW`, `MEDIUM`, `HIGH` | Internal |
| ↳ `rekycDate` | String | Yes | Calculated leap-year-safe periodic review date (`YYYY-MM-DD`) | Internal |
| `makerReview` | Object | No | Dual-control Maker review details: | Internal |
| ↳ `claimedBy` | ObjectId | No | Ref `users._id` (locked for concurrent review) | Internal |
| ↳ `recommendation`| String | No | Enum: `RECOMMEND_APPROVE`, `RECOMMEND_REJECT`, `REQUEST_RESUBMISSION` | Internal |
| ↳ `notes` | String | No | Investigation notes (min 10 characters) | Internal |
| ↳ `corrections` | [Object]| No | Audit log of manual field overrides with reasons | Internal |
| `checkerReview`| Object | No | Dual-control Checker final decision: | Internal |
| ↳ `checkerId` | ObjectId | No | Ref `users._id` (Must NOT equal `makerReview.claimedBy`) | Internal |
| ↳ `decision` | String | No | Enum: `APPROVED`, `REJECTED`, `SEND_BACK` | Internal |
| ↳ `notes` | String | No | Checker sign-off justification (min 10 characters) | Internal |
| `coreBanking` | Object | No | Idempotent mock core banking generation: | Internal |
| ↳ `customerId` | String | No | Deccan Digital Bank Customer ID (e.g. `CUST-DDB-00101`) | Internal |
| ↳ `accountNumber`| String | No | Deccan Digital Bank Savings Account No (e.g. `1001928374`) | Sensitive Account |

---

### 2.3 `documents` Collection
Tracks uploaded verification evidence and digital file fingerprints.
| Field | Type | Required | Constraints / Description | PII Classification |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Primary Key | Internal |
| `documentId` | String | Yes | Unique document reference (e.g. `DOC-001`), indexed | Public Reference |
| `applicationId`| String | Yes | Foreign Key referencing `applications.applicationId` | Public Reference |
| `documentType`| String | Yes | Enum: `PAN`, `AADHAAR`, `PASSPORT`, `VOTER_ID`, `DRIVING_LICENSE`, `UTILITY_BILL` | Internal |
| `filename` | String | Yes | Sanitized storage filename | Public |
| `mimeType` | String | Yes | Validated MIME: `image/jpeg`, `image/png`, `application/pdf` | Technical |
| `sizeBytes` | Number | Yes | Max 1,048,576 bytes (1 MB) | Technical |
| `sha256` | String | Yes | Cryptographic SHA-256 checksum for integrity & anti-tampering | Security Hash |
| `storagePath` | String | Yes | Local secure path or private cloud storage pointer | Internal |
| `ocrText` | String | No | Extracted raw text for Maker side-by-side inspection | Unstructured Text |
| `isDeleted` | Boolean | Yes | Tombstone flag for soft-deletion (Default: `false`) | Internal |

---

### 2.4 `audit_logs` Collection
Regulatory tamper-evident audit journal. Mutation operations (`update`, `delete`) are strictly blocked at schema and service levels.
| Field | Type | Required | Constraints / Description | PII Classification |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Primary Key | Internal |
| `timestamp` | Date | Yes | Default: `Date.now`, indexed | Technical |
| `actorId` | ObjectId | No | Ref `users._id` (Null for system events) | Internal |
| `actorUsername`| String | Yes | Username of the acting principal | Internal |
| `actorRole` | String | Yes | Role at time of action (`APPLICANT`, `MAKER`, `CHECKER`, `ADMIN`, `SYSTEM`) | Internal |
| `action` | String | Yes | Action code (e.g. `CASE_SUBMITTED`, `FIELD_CORRECTED`, `DECISION_APPROVED`) | Internal |
| `entityType` | String | Yes | Enum: `APPLICATION`, `DOCUMENT`, `USER`, `CONFIG` | Internal |
| `entityId` | String | Yes | Reference to target entity | Public Reference |
| `details` | Object | Yes | Masked metadata diff (Never contains raw PAN/Aadhaar/Passwords) | Internal |
| `ipAddress` | String | No | Client IP address for fraud attribution | Confidential |
| `requestId` | String | Yes | Distributed tracing correlation ID | Technical |

---

## 3. Database Indexes

| Collection | Indexed Fields | Type | Purpose |
| :--- | :--- | :--- | :--- |
| `users` | `username` | Unique | Fast credential lookup & unique constraint |
| `users` | `email` | Unique | Unique applicant account email |
| `applications`| `applicationId` | Unique | Business ID lookup & idempotency |
| `applications`| `applicantId` | Standard | Anti-IDOR user case isolation |
| `applications`| `status`, `createdAt` | Compound | Fast FIFO queue sorting for Maker & Checker |
| `documents` | `documentId` | Unique | Document reference lookup |
| `documents` | `applicationId` | Standard | Linking documents to case |
| `audit_logs` | `timestamp` | Descending | Reverse-chronological audit inspection |
| `audit_logs` | `entityId`, `action` | Compound | Entity lifecycle investigation & export |
