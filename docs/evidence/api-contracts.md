# OnboardIQ — API Contracts & Specifications
**Version:** 1.0.0  
**Base URL:** `/api/v1`  
**Protocol:** REST over HTTPS / JSON  
**Authentication:** JWT Bearer via `HttpOnly`, `Secure`, `SameSite=Lax` Cookie (`onboardiq_token`) + CSRF Token Header (`X-CSRF-Token`)

---

## 1. Global Standards & Protocols

### 1.1 Headers
| Header | Type | Description | Required |
| :--- | :--- | :--- | :--- |
| `Authorization` | String | `Bearer <token>` (Alternative to Cookie for automated CLI/test runners) | Optional if Cookie present |
| `X-CSRF-Token` | String | CSRF verification token issued upon login | Required for mutating requests (POST, PUT, PATCH, DELETE) |
| `X-Request-ID` | String | Correlation ID for distributed tracing | Optional (Auto-generated if absent) |
| `Content-Type` | String | `application/json` (or `multipart/form-data` for uploads) | Required |

### 1.2 Error Response Format
All error responses return a standardized, privacy-safe JSON schema. No stack traces or raw database errors are exposed.
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid credentials provided.",
    "requestId": "req-987a-42c1"
  }
}
```

Standard Error Codes:
- `UNAUTHORIZED` (401): Missing or expired authentication token.
- `FORBIDDEN` (403): Role lacks permission or ownership check failed (anti-IDOR).
- `NOT_FOUND` (404): Resource not found or hidden for privacy.
- `CONFLICT` (409): Optimistic locking version conflict or concurrent claim.
- `VALIDATION_ERROR` (400): Schema validation failed.
- `MAKER_CHECKER_VIOLATION` (403): Recommending Maker cannot perform Checker approval.

---

## 2. Authentication & Session Endpoints (`/api/v1/auth`)

### 2.1 POST `/api/v1/auth/login`
Authenticates a user and sets an `HttpOnly` session cookie alongside returning a CSRF token.
- **Access:** Public (Rate-limited to 5 requests / min per IP)
- **Request Body:**
```json
{
  "username": "maker1",
  "password": "password123"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6718cf...",
      "username": "maker1",
      "email": "maker1@deccanbank.com",
      "role": "MAKER",
      "fullName": "Maker User 1"
    },
    "csrfToken": "a4f89b72ec109d..."
  }
}
```

### 2.2 POST `/api/v1/auth/logout`
Clears session cookie and invalidates client session.
- **Access:** Authenticated

### 2.3 GET `/api/v1/auth/me`
Retrieves current user profile and role details.
- **Access:** Authenticated

---

## 3. Applicant Endpoints (`/api/v1/applications`)

### 3.1 GET `/api/v1/applications/my`
Retrieves applications belonging exclusively to the authenticated applicant.
- **Access:** `APPLICANT` role only (Enforces anti-IDOR isolation)
- **Response (200 OK):** Array of user's applications with masked PII.

### 3.2 POST `/api/v1/applications/draft`
Saves or autosaves an application in `DRAFT` status.
- **Access:** `APPLICANT`
- **Request Body:**
```json
{
  "applicationId": "APP-2026-001",
  "fullName": "Amit Verma",
  "dateOfBirth": "1992-05-14",
  "pan": "ABCDE1234F",
  "aadhaarLast4": "4321",
  "address": "42, MG Road, Bengaluru",
  "state": "Karnataka",
  "pincode": "560001",
  "occupation": "SALARIED",
  "documents": ["DOC-101", "DOC-102"]
}
```

### 3.3 POST `/api/v1/applications/:id/submit`
Validates draft completeness, transitions status to `SUBMITTED`, and synchronously triggers deterministic extraction, rules evaluation (R1–R17), sanctions/PEP screening, and risk scoring.
- **Access:** `APPLICANT` (Owner only)
- **Response (200 OK):** Returns application reference, workflow status (`AUTO_APPROVED`, `MANUAL_REVIEW_REQUIRED`, `AUTO_REJECTED`), masked PAN, and safe plain-language customer message.

### 3.4 POST `/api/v1/applications/:id/resubmit`
Resubmits an application after a Maker requested resubmission. Increments version and invalidates prior stale findings.
- **Access:** `APPLICANT` (Owner only)

---

## 4. Document Management (`/api/v1/documents`)

### 4.1 POST `/api/v1/documents/upload`
Securely uploads a verification document (`multipart/form-data`).
- **Validation:**
  - MIME: `image/jpeg`, `image/png`, `application/pdf`
  - Magic byte binary inspection (Rejects executable/ELF/script payloads)
  - Max Size: 1 MB
- **Access:** `APPLICANT`
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "documentId": "DOC-7712",
    "documentType": "PAN",
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "filename": "pan_card.jpg"
  }
}
```

### 4.2 GET `/api/v1/documents/:id`
Streams the binary document with authentication and role verification.
- **Access:** Case owner (`APPLICANT`) or Compliance Staff (`MAKER`, `CHECKER`, `ADMIN`).

### 4.3 GET `/api/v1/documents/:id/text`
Retrieves dual-pane OCR extracted text for side-by-side Maker comparison.
- **Access:** `MAKER`, `CHECKER`, `ADMIN`

---

## 5. Maker / KYC Officer Workspace (`/api/v1/maker`)

### 5.1 GET `/api/v1/maker/queue`
Retrieves the FIFO Maker review queue. Cases are sorted with `HIGH` risk applications prioritised, then by oldest creation timestamp.
- **Access:** `MAKER`
- **Response:** List of pending applications with risk badges, age indicators, and claimed status.

### 5.2 POST `/api/v1/maker/claim/:id` & `/unclaim/:id`
Locks/unlocks an application to the authenticated Maker to prevent conflicting concurrent investigations.
- **Access:** `MAKER`

### 5.3 POST `/api/v1/maker/correct/:id`
Applies an auditable field correction to an extracted value. Increments application version and re-evaluates deterministic rules R1–R17.
- **Access:** `MAKER` (Must be claimant)
- **Request Body:**
```json
{
  "field": "name",
  "correctedValue": "Ravi Kumar Sharma",
  "reason": "Clear middle name visible on PAN physical document"
}
```

### 5.4 POST `/api/v1/maker/recommend/:id`
Submits Maker's recommendation to the Checker queue.
- **Access:** `MAKER` (Claimant only)
- **Request Body:**
```json
{
  "recommendation": "RECOMMEND_APPROVE",
  "notes": "Verified minor name variation matches PAN card exactly. Identity confirmed."
}
```
- **Validation:** `notes` must be at least 10 characters long.

---

## 6. Checker / Compliance Officer Workspace (`/api/v1/checker`)

### 6.1 GET `/api/v1/checker/queue`
Retrieves applications pending Checker determination (`PENDING_CHECKER`).
- **Access:** `CHECKER`

### 6.2 POST `/api/v1/checker/decide/:id`
Executes final compliance decision (`APPROVED`, `REJECTED`, or `SEND_BACK`).
- **Access:** `CHECKER`
- **Security Check:** Strict server-side enforcement that `checkerId !== recommendingMakerId` (prevents self-approval).
- **Core Banking Integration:** If decision is `APPROVED`, triggers idempotent call to Core Banking Mock service to create synthetic account (`CUST-DDB-...`).
- **Request Body:**
```json
{
  "decision": "APPROVED",
  "notes": "Independent review completed. Discrepancy explanation verified against documentary evidence."
}
```

---

## 7. Admin & Analytics Endpoints (`/api/v1/admin`)

### 7.1 GET `/api/v1/admin/kpis`
Calculates real-time operational metrics:
- Total, approved, reviewed, and rejected counts.
- Straight-Through Processing (STP) rate, Manual Review rate, Reject rate.
- Top 5 trigger reason codes.
- Queue ageing metrics.
- **Access:** `ADMIN`

### 7.2 GET `/api/v1/admin/audit`
Searchable, append-only audit trail with actor, action, and entity filters.
- **Access:** `ADMIN`

### 7.3 GET `/api/v1/admin/audit/export?reason=QuarterlyComplianceReview`
Exports masked audit trail in CSV format.
- **Access:** `ADMIN` (Mandatory query parameter `reason` >= 10 characters).
- **Masking:** PAN and Aadhaar are strictly masked in output.
