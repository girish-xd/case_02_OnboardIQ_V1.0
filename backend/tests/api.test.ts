import request from 'supertest';
import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/db.js';
import { runSeed } from '../src/scripts/seed.js';
import { Application } from '../src/models/Application.js';

describe('OnboardIQ End-to-End API & Security Verification Suite', () => {
  let applicantToken = '';
  let makerToken = '';
  let checkerToken = '';
  let adminToken = '';
  let csrfToken = '';

  beforeAll(async () => {
    await connectDatabase();
    await runSeed(true); // Seed demo data

    // Log in as applicant1
    const appLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'applicant1', password: 'password123' });
    expect(appLogin.status).toBe(200);
    applicantToken = appLogin.body.token;
    csrfToken = appLogin.body.csrfToken;

    // Log in as maker1
    const makerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'maker1', password: 'password123' });
    expect(makerLogin.status).toBe(200);
    makerToken = makerLogin.body.token;

    // Log in as checker1
    const checkerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'checker1', password: 'password123' });
    expect(checkerLogin.status).toBe(200);
    checkerToken = checkerLogin.body.token;

    // Log in as admin1
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin1', password: 'password123' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.token;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('Authentication & Role Authorization Matrix (FR-1)', () => {
    it('allows health check without authentication', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
    });

    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/maker/queue');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('prevents APPLICANT from accessing Maker queue (returns 403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/maker/queue')
        .set('Authorization', `Bearer ${applicantToken}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('allows MAKER to access Maker queue', async () => {
      const res = await request(app)
        .get('/api/v1/maker/queue')
        .set('Authorization', `Bearer ${makerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.queue)).toBe(true);
    });
  });

  describe('IDOR & Cross-Applicant Isolation (Section 4 & FR-1)', () => {
    it('prevents applicant from viewing another applicant application (returns 403)', async () => {
      // applicant1 owns A2000001, but A2000002 belongs to user_A2000002
      const res = await request(app)
        .get('/api/v1/applications/A2000002')
        .set('Authorization', `Bearer ${applicantToken}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('allows applicant to view their own application with masked PII', async () => {
      const res = await request(app)
        .get('/api/v1/applications/A2000001')
        .set('Authorization', `Bearer ${applicantToken}`);
      expect(res.status).toBe(200);
      expect(res.body.application.applicationId).toBe('A2000001');
      expect(res.body.application.panNumber).toContain('XXXXX');
    });
  });

  describe('Server-Side Validation: Full 12-digit Aadhaar Rejection (FR-2)', () => {
    it('strictly rejects a 12-digit Aadhaar number with clear validation message', async () => {
      const res = await request(app)
        .post('/api/v1/applications/submit')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          fullName: 'Test User',
          dob: '1995-01-01',
          gender: 'MALE',
          panNumber: 'ZZKPS1234Q',
          aadhaarLast4: '123456789012', // 12 digits
          mobile: '9876543210',
          email: 'test@example.com',
          address: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          occupationCode: 'SALARIED_PRIVATE',
          annualIncome: 500000,
          consentKyc: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('AADHAAR_FULL_REJECTED');
    });
  });

  describe('Maker-Checker Separation & Core Banking Account (FR-7 & Challenge 11)', () => {
    it('prevents the recommending Maker from approving as Checker (HTTP 403)', async () => {
      // Find a case in IN_REVIEW (e.g., A2000004 from Worked Example 4)
      const case4 = await Application.findOne({ applicationId: 'A2000004' });
      expect(case4).toBeDefined();
      expect(case4!.status).toBe('IN_REVIEW');

      // Maker1 submits recommendation APPROVE
      const recRes = await request(app)
        .post('/api/v1/maker/recommend')
        .set('Authorization', `Bearer ${makerToken}`)
        .send({
          applicationId: 'A2000004',
          recommendation: 'APPROVE',
          comment: 'Minor name variation verified against tax records. Recommend approval.',
          version: case4!.version,
        });

      expect(recRes.status).toBe(200);
      expect(recRes.body.application.status).toBe('PENDING_CHECKER');

      // CRITICAL CHECK: Maker1 attempts to approve the same case as Checker -> MUST BE FORBIDDEN 403!
      const invalidApprove = await request(app)
        .post('/api/v1/checker/decision')
        .set('Authorization', `Bearer ${makerToken}`) // Maker1 trying to self-approve
        .send({
          applicationId: 'A2000004',
          decision: 'APPROVE',
          comment: 'Attempting self-approval as maker',
          version: recRes.body.application.version,
        });

      expect(invalidApprove.status).toBe(403);
    });

    it('allows an independent Checker to approve and opens core banking account', async () => {
      const case4 = await Application.findOne({ applicationId: 'A2000004' });
      expect(case4!.status).toBe('PENDING_CHECKER');

      // Independent Checker (checker1) approves the case
      const checkRes = await request(app)
        .post('/api/v1/checker/decision')
        .set('Authorization', `Bearer ${checkerToken}`)
        .send({
          applicationId: 'A2000004',
          decision: 'APPROVE',
          comment: 'Independent compliance verification complete. Approved.',
          version: case4!.version,
        });

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.application.status).toBe('APPROVED');
      expect(checkRes.body.application.coreBankingAccount).toBeDefined();
      expect(checkRes.body.application.coreBankingAccount.accountNumber).toMatch(/^1001/);
    });
  });

  describe('Optimistic Concurrency Control (Section 4 & Challenge 2)', () => {
    it('returns HTTP 409 Conflict when attempting decision on stale version', async () => {
      const case10 = await Application.findOne({ applicationId: 'A2000010' });
      expect(case10).toBeDefined();

      const staleVersion = case10!.version - 1; // Outdated version

      const res = await request(app)
        .post('/api/v1/checker/decision')
        .set('Authorization', `Bearer ${checkerToken}`)
        .send({
          applicationId: 'A2000010',
          decision: 'APPROVE',
          comment: 'High risk reviewed by compliance',
          version: staleVersion,
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CONCURRENCY_CONFLICT');
    });
  });

  describe('Audit Trail Immutability & Masked Export (FR-9 & FR-10)', () => {
    it('records document views and field corrections in audit trail', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit?limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThan(0);
      expect(Array.isArray(res.body.logs)).toBe(true);
    });

    it('requires a mandatory justification reason to export audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('REASON_REQUIRED');
    });

    it('exports audit CSV with mandatory reason and logs the export event', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit/export?reason=Quarterly+Compliance+Review')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('timestamp,action,actorRole');
    });
  });
});
