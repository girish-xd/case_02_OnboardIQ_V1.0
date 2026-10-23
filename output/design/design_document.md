# OnboardIQ — System Design & Architecture Document
**System Name:** OnboardIQ — Intelligent KYC Onboarding & Dual-Control Screening Platform  
**Target Organization:** Deccan Digital Bank (Fictional Scheduled Commercial Bank)  
**Hackathon Track:** Full Stack Web Engineer  
**Date:** October 2026  
**Document Version:** 1.0.0

---

## 1. Executive Summary & System Overview

**OnboardIQ** is an enterprise-grade digital onboarding, document extraction, automated KYC validation, and watchlist screening platform designed for Deccan Digital Bank. The system automates routine identity verification while enforcing rigorous human-in-the-loop governance through a server-enforced **Maker-Checker** dual-control workflow.

### Key Highlights:
- **Deterministic Rules Engine:** Implements 17 documented business rules (R1 through R17) with strict decision precedence (`REJECT` > `REVIEW` > `APPROVE`). Zero reliance on non-deterministic LLMs for credit or KYC outcomes.
- **Dual-Control Governance:** Physical segregation of Maker (investigator/recommender) and Checker (approver/rejecter) roles. Complete server-side prohibition against self-approval.
- **Privacy-by-Design:** Aadhaar restricted to last 4 digits; PAN masked in all public APIs, audit logs, and reports (`ABCXXXXX4F`).
- **Pluggable Architecture:** Flexible extraction providers (Mock CSV and Rule-based AI) and synthetic Core Banking integration.

---

## 2. Business Rules & Decision Precedence Flowchart (R1–R17)

```mermaid
flowchart TD
    Start([Application Submitted]) --> Ext[Extract Fields & Usability Check]
    Ext --> R3{R3: Confidence >= 0.80?}
    R3 -- No --> FlagR3[Flag R3: LOW_EXTRACTION_CONFIDENCE\nSet Status: REVIEW]
    R3 -- Yes --> R1{R1: Age < 18?}
    FlagR3 --> R1

    R1 -- Yes --> FlagR1[Flag R1: AGE_BELOW_18\nSet Status: REJECT]
    R1 -- No --> R2{R2: Age > 120?}
    FlagR1 --> R2

    R2 -- Yes --> FlagR2[Flag R2: AGE_EXCEEDS_120\nSet Status: REJECT]
    R2 -- No --> R12{R12: Sanctions Exact Match?}
    FlagR2 --> R12

    R12 -- Yes --> FlagR12[Flag R12: SANCTIONS_EXACT_MATCH\nSet Status: REJECT]
    R12 -- No --> R7{R7: PAN Mismatch?}
    FlagR12 --> R7

    R7 -- Yes --> FlagR7[Flag R7: PAN_NUMBER_MISMATCH\nSet Status: REJECT]
    R7 -- No --> R5{R5: Name Similarity < 0.70?}
    FlagR7 --> R5

    R5 -- Yes --> FlagR5[Flag R5: NAME_MISMATCH_MAJOR\nSet Status: REJECT]
    R5 -- No --> R4{R4: Name Sim 0.70 - 0.85?}
    FlagR5 --> R4

    R4 -- Yes --> FlagR4[Flag R4: NAME_MISMATCH_MINOR\nSet Status: REVIEW]
    R4 -- No --> R6{R6: DOB Mismatch?}
    FlagR4 --> R6

    R6 -- Yes --> FlagR6[Flag R6: DOB_MISMATCH\nSet Status: REVIEW]
    R6 -- No --> R8{R8: Aadhaar Last 4 Mismatch?}
    FlagR6 --> R8

    R8 -- Yes --> FlagR8[Flag R8: AADHAAR_LAST4_MISMATCH\nSet Status: REVIEW]
    R8 -- No --> R9{R9: State Mismatch?}
    FlagR8 --> R9

    R9 -- Yes --> FlagR9[Flag R9: ADDRESS_STATE_MISMATCH\nSet Status: REVIEW]
    R9 -- No --> R10{R10: Pincode Invalid?}
    FlagR9 --> R10

    R10 -- Yes --> FlagR10[Flag R10: PINCODE_INVALID\nSet Status: REVIEW]
    R10 -- No --> R11{R11: Unemployed High Income?}
    FlagR10 --> R11

    R11 -- Yes --> FlagR11[Flag R11: OCCUPATION_UNEMPLOYED_HIGH_INCOME\nSet Status: REVIEW]
    R11 -- No --> R13{R13: Sanctions Fuzzy Match?}
    FlagR11 --> R13

    R13 -- Yes --> FlagR13[Flag R13: SANCTIONS_FUZZY_MATCH\nSet Status: REVIEW]
    R13 -- No --> R14{R14: PEP Match?}
    FlagR13 --> R14

    R14 -- Yes --> FlagR14[Flag R14: PEP_POLITICAL_RISK\nSet Status: REVIEW & High Risk]
    R14 -- No --> R17{R17: Existing Customer PAN?}
    FlagR14 --> R17

    R17 -- Yes --> FlagR17[Flag R17: EXISTING_CUSTOMER_DEDUPLICATION\nSet Status: REVIEW]
    R17 -- No --> Precedence[Evaluate Precedence R16:\nREJECT > REVIEW > APPROVE]
    FlagR17 --> Precedence

    Precedence --> Outcome{Overall Outcome}
    Outcome -- Any REJECT --> OutReject[Decision: REJECT\nStatus: AUTO_REJECTED]
    Outcome -- Any REVIEW --> OutReview[Decision: REVIEW\nStatus: MANUAL_REVIEW_REQUIRED\nEnqueue to Maker FIFO]
    Outcome -- No Trigger --> OutApprove[Decision: APPROVE\nStatus: APPROVED\nOpen Core Banking Account]
```

---

## 3. Workflow State Machine & Lifecycle Transitions

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Applicant Creates Application
    DRAFT --> DRAFT: Autosave Form & Upload Documents
    DRAFT --> SUBMITTED: Applicant Submits Application
    SUBMITTED --> AUTO_APPROVED: All Checks Clean (STP)
    SUBMITTED --> AUTO_REJECTED: Severe Rule Trigger (R1, R2, R5, R7, R12)
    SUBMITTED --> MANUAL_REVIEW_REQUIRED: Discrepancy Triggered (R3, R4, R6, R8-11, R13, R14, R17)

    MANUAL_REVIEW_REQUIRED --> IN_REVIEW_MAKER: Maker Claims Case
    IN_REVIEW_MAKER --> IN_REVIEW_MAKER: Maker Corrects Field (Version Increment)
    IN_REVIEW_MAKER --> MANUAL_REVIEW_REQUIRED: Maker Releases Claim
    IN_REVIEW_MAKER --> REQUEST_RESUBMISSION: Maker Requests Customer Update
    REQUEST_RESUBMISSION --> SUBMITTED: Applicant Submits Corrected Evidence

    IN_REVIEW_MAKER --> PENDING_CHECKER: Maker Recommends (APPROVE / REJECT)
    PENDING_CHECKER --> IN_REVIEW_MAKER: Checker Sends Back for Re-investigation
    PENDING_CHECKER --> REJECTED: Checker Signs Off Final Rejection
    PENDING_CHECKER --> APPROVED: Independent Checker Signs Off Final Approval

    AUTO_APPROVED --> [*]: Account Opened (Core Banking)
    APPROVED --> [*]: Account Opened (Core Banking)
    AUTO_REJECTED --> [*]: Privacy-Safe Notice Sent
    REJECTED --> [*]: Privacy-Safe Notice Sent
```

---

## 4. Entity Relationship (ER) Diagram

```mermaid
erDiagram
    USER ||--o{ APPLICATION : "submits"
    USER ||--o{ AUDIT_LOG : "generates"
    USER ||--o{ NOTIFICATION : "receives"
    APPLICATION ||--|{ DOCUMENT : "contains"
    APPLICATION ||--o{ EXTRACTION : "has"
    APPLICATION ||--o{ AUDIT_LOG : "audited by"

    USER {
        ObjectId id PK
        string username UK
        string email UK
        string passwordHash
        string role "APPLICANT, MAKER, CHECKER, ADMIN"
        string fullName
        date createdAt
    }

    APPLICATION {
        ObjectId id PK
        string applicationId UK
        ObjectId applicantId FK
        number version "Optimistic Locking"
        string status "DRAFT, SUBMITTED, APPROVED, etc."
        string fullName
        string dateOfBirth
        string pan "Masked ABCXXXXX4F"
        string aadhaarLast4 "Last 4 Digits"
        string address
        string state
        string pincode
        string occupation
        json evaluation "Decision, ReasonCodes, Score, Risk"
        json makerReview "ClaimedBy, Notes, Corrections"
        json checkerReview "CheckerId, Decision, Notes"
        json coreBanking "CustomerId, AccountNumber"
        date createdAt
    }

    DOCUMENT {
        ObjectId id PK
        string documentId UK
        string applicationId FK
        string documentType "PAN, AADHAAR, PASSPORT, etc."
        string filename
        string mimeType
        number sizeBytes
        string sha256 "Integrity Checksum"
        string storagePath
        string ocrText
        boolean isDeleted
        date createdAt
    }

    EXTRACTION {
        ObjectId id PK
        string documentId FK
        string applicationId FK
        json fields "Key, Value, Confidence, isUsable"
        date createdAt
    }

    AUDIT_LOG {
        ObjectId id PK
        date timestamp
        ObjectId actorId FK
        string actorUsername
        string actorRole
        string action
        string entityType
        string entityId
        json details "Masked metadata diff"
        string ipAddress
        string requestId
    }

    NOTIFICATION {
        ObjectId id PK
        ObjectId recipientId FK
        string applicationId
        string title
        string message "Privacy-safe generic message"
        boolean isRead
        date createdAt
    }
```

---

## 5. Maker-Checker Sequence & Core Banking Integration

```mermaid
sequenceDiagram
    autonumber
    actor Maker as Maker (KYC Officer)
    participant API as OnboardIQ Backend
    participant SM as State Machine
    participant DB as MongoDB Atlas
    actor Checker as Checker (Compliance Officer)
    participant CBS as Mock Core Banking

    Maker->>API: POST /api/v1/maker/claim/:id
    API->>DB: Lock case to maker1
    Maker->>API: POST /api/v1/maker/correct/:id (Field edit)
    API->>SM: Increment version (v1 -> v2) & re-run R1-R17
    API->>DB: Save correction & append audit log
    Maker->>API: POST /api/v1/maker/recommend/:id (RECOMMEND_APPROVE)
    API->>SM: Transition to PENDING_CHECKER
    API->>DB: Save recommendation

    Checker->>API: POST /api/v1/checker/decide/:id (APPROVED)
    API->>SM: Verify checkerId != makerId (Anti-Self-Approval)
    Note over API,SM: If checkerId == makerId -> Throw 403 MAKER_CHECKER_VIOLATION
    SM->>CBS: CreateAccount(applicationId, customerDetails)
    CBS-->>SM: Return CustomerID (CUST-DDB-001) & AccountNo (1001000001)
    SM->>DB: Update status to APPROVED & store coreBanking credentials
    API->>DB: Append immutable audit record
    API-->>Checker: 200 OK (Case Approved & Account Opened)
```

---

## 6. Architecture & Non-Functional Specifications

1. **Deterministic Execution:** No AI or external LLM makes decisions. All outcomes are derived purely from rule triggers, Levenshtein distance calculations, and documented thresholds.
2. **Optimistic Locking:** Application records maintain an integer `version` field. Stale client updates are rejected with `409 Conflict`, requiring a client refresh.
3. **Double-Submit CSRF Protection:** Mutating endpoints require `X-CSRF-Token` header matching the issued token.
4. **Binary Signature Verification:** Uploaded files undergo magic byte inspection to reject executable or script payloads regardless of file extension.
5. **Append-Only Regulatory Audit:** Mongoose schema hooks strictly block any update or delete operation on the `audit_logs` collection.
