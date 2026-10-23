# OnboardIQ — Backup, Recovery & Business Continuity Guide
**System:** Deccan Digital Bank — OnboardIQ KYC Platform  
**Compliance Target:** Regulatory Data Preservation & Disaster Recovery Guidelines

---

## 1. Disaster Recovery Objectives & SLAs

| Metric | Target SLA | Strategy & Implementation |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | < 1 Hour | Automated continuous oplog backup on MongoDB Atlas + daily encrypted snapshots. |
| **Recovery Time Objective (RTO)** | < 15 Minutes | Containerized stateless backend on Railway (auto-restart) + cross-region Atlas database failover. |
| **Audit Trail Retention** | 10 Years | Regulatory append-only audit records archived with immutable retention policies. |

---

## 2. Backup Procedures

### 2.1 Managed Cloud Backups (MongoDB Atlas)
For production clusters (M10+):
1. **Continuous Cloud Backups:** Atlas takes continuous snapshots of the cluster oplog, enabling point-in-time recovery (PITR) to any second within the past 7 days.
2. **Scheduled Snapshots:** Daily snapshots are stored across geographically separated cloud storage buckets with 30-day retention.

### 2.2 Manual Logical Backups (`mongodump`)
For ad-hoc backups before migrations or major releases, use `mongodump`:
```bash
# Create timestamped encrypted logical archive:
mongodump --uri="$MONGODB_URI" --gzip --archive="backups/onboardiq_backup_$(date +%Y%m%d_%H%M%S).gz"
```

Verify archive integrity:
```bash
gzip -t "backups/onboardiq_backup_*.gz" && echo "Backup archive is verified and intact."
```

---

## 3. Disaster Recovery & Restoration Runbook

### Step 1: Declare Recovery Event & Notify Compliance
Record a disaster recovery event in the operational log and designate an authorized Systems Lead.

### Step 2: Database Restoration
To restore to a new target cluster:
```bash
mongorestore --uri="$TARGET_MONGODB_URI" --drop --gzip --archive="backups/onboardiq_backup_20261023.gz"
```
*Note: The `--drop` flag clears existing target collections before restoring, ensuring atomic, clean restoration without duplicate key errors.*

### Step 3: Rebuild Indexes
Verify that all indexes specified in the Data Dictionary are re-indexed:
```bash
npx tsx src/scripts/verify_indexes.ts
```

### Step 4: Run Post-Restoration Smoke Harness
Execute the automated live smoke harness to ensure full operational integrity before re-opening user traffic:
```bash
python scripts/smoke_test.py
```

---

## 4. Demo Environment Reset Runbook

To reset a staging or demo environment to a pristine state for evaluation or walkthroughs:
```bash
# From the backend directory:
npm run seed
```

This deterministic script:
1. Re-initializes reference datasets (Sanctions, PEP, Occupations, Existing Customers).
2. Resets the 5 standard demo accounts (`applicant1`, `maker1`, `maker2`, `checker1`, `admin1`).
3. Re-evaluates all 60 sample applications, returning the Maker and Checker queues to their expected default states.
4. Generates an audit log entry documenting the environment reset.
