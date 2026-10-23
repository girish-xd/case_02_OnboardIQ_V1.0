# OnboardIQ — Production Deployment & Operations Guide
**Deployment Targets:** Vercel (Frontend SPA) + Railway (Backend API Service) + MongoDB Atlas (Database)  
**Security Profile:** Zero-Trust, TLS 1.3, Cookie Authentication with CSRF Protection

---

## 1. Cloud Architecture Overview

```text
 ┌────────────────────────────────┐
 │     Applicant / Bank Officer   │
 └──────────────┬─────────────────┘
                │ HTTPS (TLS 1.3)
                ▼
 ┌────────────────────────────────┐
 │     Vercel Edge Network        │
 │  (React + Vite SPA Frontend)   │
 └──────────────┬─────────────────┘
                │ API Requests with HttpOnly Cookie + CSRF
                ▼
 ┌────────────────────────────────┐
 │      Railway Container         │
 │ (Node.js Express + TypeScript) │
 └───────┬──────────────┬─────────┘
         │              │
         │ Mongoose     │ Encrypted Stream
         ▼              ▼
 ┌───────────────┐ ┌───────────────────────────┐
 │ MongoDB Atlas │ │ Cloudinary / Secure Local │
 │ (Primary DB)  │ │ (Private Document Storage)│
 └───────────────┘ └───────────────────────────┘
```

---

## 2. Environment Configuration & Secrets

Store all secrets in the respective cloud hosting dashboard. **Never commit actual production keys to source control.**

### 2.1 Backend Environment Variables (`backend/.env`)
| Variable Name | Required | Default / Format | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `5000` | Port for Express server |
| `NODE_ENV` | Yes | `production` | Enables secure cookies, strict CORS, and disables stack traces |
| `MONGODB_URI` | Yes | `mongodb+srv://user:pass@cluster.mongodb.net/onboardiq` | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | 64+ char random hex string | Secret key for signing JWT session tokens |
| `ALLOWED_ORIGINS`| Yes | `https://onboardiq.vercel.app,http://localhost:5173` | Comma-separated CORS origin allowlist |
| `GROQ_API_KEY` | No | `gsk_...` | Optional Groq API key for reviewer summaries (Falls back to deterministic summary) |
| `CLOUDINARY_URL`| No | `cloudinary://key:secret@cloud` | Optional Cloudinary URL for authenticated document assets |

### 2.2 Frontend Environment Variables (`frontend/.env`)
| Variable Name | Required | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | Yes (in prod) | Base URL of deployed Railway backend (e.g. `https://onboardiq-api.up.railway.app`) |

---

## 3. Step-by-Step Deployment Runbook

### Step 1: Provision MongoDB Atlas Cluster
1. Create a free M0 or production M10 cluster in MongoDB Atlas (region: `ap-south-1` Mumbai recommended).
2. Create a dedicated database user (e.g. `onboardiq_app`) with read/write privileges on `onboardiq`.
3. Add Railway's egress IP or `0.0.0.0/0` (with strong SCRAM authentication) to Atlas Network Access IP allowlist.
4. Copy the connection string into `MONGODB_URI`.

### Step 2: Deploy Backend to Railway
1. Log in to [Railway](https://railway.app) and create a New Project from GitHub.
2. Configure settings:
   - **Root Directory:** `backend` (or use root Dockerfile)
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
3. Add Environment Variables in Railway Dashboard:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `MONGODB_URI=<Your Atlas URI>`
   - `JWT_SECRET=<Generated Random Hex>`
   - `ALLOWED_ORIGINS=https://<your-frontend-subdomain>.vercel.app`
4. Set Health Check path: `/api/v1/health`
5. Deploy and copy the public Railway service domain.

### Step 3: Deploy Frontend to Vercel
1. Log in to [Vercel](https://vercel.com) and import the Git repository.
2. Configure project settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variable:
   - `VITE_API_URL=https://<your-railway-domain>.up.railway.app`
4. Click **Deploy**.

### Step 4: Run Initial Seed on Railway
Execute the idempotent database seeding script via Railway CLI or one-off command:
```bash
npm run seed
```
This initializes the reference tables (Occupations, Sanctions, PEPs, Existing Customers) and creates default demo user accounts (`applicant1`, `maker1`, `maker2`, `checker1`, `admin1`).

---

## 4. CI/CD GitHub Actions Pipeline

The repository includes `.github/workflows/ci.yml` automating continuous integration:
1. **Trigger:** Every `push` to `main` and all Pull Requests.
2. **Steps:**
   - Setup Node.js 20.
   - Install dependencies in `backend/` and `frontend/`.
   - Run linter & TypeScript type check (`tsc --noEmit`).
   - Execute Jest test suites (`rulesEngine.test.ts`, `api.test.ts`).
   - Run Vite production bundle build (`npm run build`).
3. **Release Gate:** PRs are blocked from merging if any unit test or type check fails.

---

## 5. Health Checks & Verification

After deployment, verify the services via curl:
```bash
# Verify backend readiness:
curl -I https://<railway-domain>/api/v1/health

# Expected response:
# HTTP/1.1 200 OK
# Content-Type: application/json
# {"status":"ok","dbConnected":true,"timestamp":"..."}
```
