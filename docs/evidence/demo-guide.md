# OnboardIQ — Evaluator Demo & Walkthrough Guide
**Application URL:** `http://localhost:5173` (Frontend) | `http://localhost:5000` (Backend API)  
**Quick Role Switcher:** Use the top-right header role switcher to change personas instantly without manual re-login.

---

## 1. Demo Credentials & User Roles

| Persona | Username | Password | Role Description | Key Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Applicant** | `applicant1` | `password123` | Individual Retail Customer | Fill application, upload IDs, autosave, view masked status, resubmit |
| **Maker 1** | `maker1` | `password123` | Senior KYC Officer | Claim cases, dual-pane OCR comparison, field corrections, recommendations |
| **Maker 2** | `maker2` | `password123` | Alternative KYC Officer | Demonstrates collaborative queue management and peer isolation |
| **Checker** | `checker1` | `password123` | Compliance & Risk Officer | Independent sign-off, screening resolution, approve/reject/send-back |
| **Admin** | `admin1` | `password123` | Operations Lead / Compliance Head | Executive KPIs, STP rate, search audit logs, export masked CSV |

---

## 2. End-to-End Guided Walkthrough Scenarios

### Scenario 1: Straight-Through Clean Application (Worked Example 1)
1. **Action:** Switch to **Applicant** (`applicant1`).
2. **Observation:** Review the pre-seeded clean application (`APP-SAMPLE-001`).
3. **Outcome:** Status is `APPROVED`. Name similarity is 1.0000, all document checks passed, sanctions and PEP clean. Risk category is `LOW`, Periodic Re-KYC scheduled for 10 years. Plain-language customer message: *"Your onboarding application has been successfully verified and approved."*

---

### Scenario 2: Maker Queue & Dual-Pane Document Review (Worked Example 4)
1. **Action:** Switch to **Maker 1** (`maker1`) and click **Maker Workspace**.
2. **Observation:** The FIFO review queue displays pending applications. Note the **Risk Badges** (`HIGH` risk prioritized at the top) and elapsed waiting time indicators.
3. **Select Case:** Click **Review Case** on `APP-SAMPLE-004` (Ravi Kumar Sharma).
4. **Dual-Pane Viewer:** Observe the dual-pane layout:
   - **Left Pane:** Extracted field values and confidence scores.
   - **Right Pane:** Raw document OCR text showing physical PAN card transcription.
5. **Rule Evidence:** Expand **KYC Rule Evaluation Findings**. Note that rule `R4: NAME_MISMATCH_MINOR` triggered because extracted name is `"Ravi K Sharma"` vs application name `"Ravi Kumar Sharma"` (Score: 0.7647).

---

### Scenario 3: Maker Field Correction with Tamper-Evident Audit (Worked Example 9)
1. **Action:** On case `APP-SAMPLE-009`, click the **Edit (Pencil)** icon next to the Name field.
2. **Modal Input:**
   - Change value to: `Ravi Kumar Sharma`
   - Mandatory Reason: `Verified physical PAN document confirms middle name Kumar`
3. **Submit Correction:** Click **Save Correction**.
4. **Verification:**
   - Case version automatically increments from `1` to `2`.
   - Rule engine re-runs immediately in the background with the corrected name.
   - A detailed audit record is appended with actor, previous value, new value, and reason.

---

### Scenario 4: Maker Recommendation & Maker-Checker Segregation
1. **Action:** On case `APP-SAMPLE-004`, claim the case, then scroll to the **Maker Recommendation** section.
2. **Submit Recommendation:**
   - Recommendation: `RECOMMEND_APPROVE`
   - Notes: `Verified minor name variation matches PAN card exactly. Identity confirmed.` (Min 10 characters).
   - Click **Submit Recommendation to Checker**.
3. **Segregation Check:**
   - Try approving the case as `maker1`. The interface and backend strictly forbid Maker approval. Case moves to `PENDING_CHECKER`.

---

### Scenario 5: Independent Checker Review & Core Banking Account Opening
1. **Action:** Switch to **Checker** (`checker1`) and navigate to **Checker Workspace**.
2. **Review Case:** Open `APP-SAMPLE-004` from the Checker FIFO queue.
3. **Evidence Inspection:**
   - Verify Maker's recommendation notes and case history.
   - Verify that the current case version is latest (`v1`).
4. **Final Decision:**
   - Select: `APPROVED`
   - Justification: `Independent compliance review completed. Discrepancy explained by documentary evidence.`
   - Click **Submit Final Decision**.
5. **Outcome:**
   - Case status updates to `APPROVED`.
   - **Mock Core Banking Integration triggers:** Displays generated Deccan Digital Bank Customer ID (`CUST-DDB-00004`) and Savings Account Number (`1001000004`).

---

### Scenario 6: Watchlist & Sanctions Exact Hit (Worked Example 2)
1. **Action:** As Maker or Checker, inspect case `APP-SAMPLE-002` (Ibrahim Dawood).
2. **Observation:**
   - Immediate automatic rejection: `AUTO_REJECTED`.
   - Trigger code: `R12: SANCTIONS_EXACT_MATCH`.
   - Decision Precedence: In accordance with Rule R16, `REJECT` overrides all other rules.

---

### Scenario 7: Politically Exposed Person (PEP) Assessment (Worked Example 5)
1. **Action:** Inspect case `APP-SAMPLE-005` (Priya Jayant Patil).
2. **Observation:**
   - Trigger code: `R14: PEP_POLITICAL_RISK`.
   - Status: `MANUAL_REVIEW_REQUIRED` with `HIGH` risk classification.
   - Re-KYC Period: Calculated leap-year safe review date is set to 2 years (e.g. `2028-01-20`).

---

### Scenario 8: Existing Customer Deduplication (Worked Example 10)
1. **Action:** Inspect case `APP-SAMPLE-010`.
2. **Observation:**
   - Trigger code: `R17: EXISTING_CUSTOMER_DEDUPLICATION`.
   - System identifies existing customer record and displays linked Customer ID (`CUST-000889`).
   - Requires manual verification to avoid duplicate CIF creation.

---

### Scenario 9: Admin Dashboard & Masked Audit Export
1. **Action:** Switch to **Admin** (`admin1`) and view the **Operations Dashboard**.
2. **Review KPIs:**
   - Operational cards displaying Total Applications (60), Approved (31), Review (24), Rejected (5).
   - Rates: Straight-Through Rate (51.7%), Review Rate (40.0%), Reject Rate (8.3%).
   - Top 5 Reason Codes bar visualization.
3. **Audit Trail Inspection:**
   - Filter audit events by Actor (`maker1`, `checker1`) and Action (`FIELD_CORRECTED`, `DECISION_APPROVED`).
4. **Masked CSV Export:**
   - In the Export modal, enter mandatory compliance reason: `QuarterlyRegulatoryAudit2026`
   - Click **Download Masked Audit Log (CSV)**.
   - Verify exported CSV: All PAN values are masked (`ABCXXXXX4F`) and Aadhaar restricted to last 4 digits.
