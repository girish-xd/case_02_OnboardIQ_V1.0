import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Application } from '../models/Application.js';
import { DocumentModel } from '../models/Document.js';
import { authenticate, checkApplicationOwnership } from '../middleware/auth.js';
import { stateMachine } from '../services/stateMachine.js';
import { maskPan, maskAadhaar, maskMobile, maskEmail } from '../utils/masking.js';
import { auditService } from '../services/auditService.js';
import { REASON_CODE_DESCRIPTIONS } from '../services/notificationService.js';

const router = Router();

// Validation Schemas adhering to Section 4
const ApplicationInputSchema = z.object({
  applicationId: z.string().optional(),
  fullName: z.string().min(2, 'Full name is required'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be YYYY-MM-DD').refine((val) => {
    return new Date(val) <= new Date();
  }, 'Date of birth cannot be in the future'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'PAN format must be 5 letters, 4 digits, 1 letter (e.g., ZZKPS1234Q)'),
  aadhaarLast4: z.string().refine((val) => val.length === 4, {
    message: 'Only the last 4 Aadhaar digits are accepted. Full 12-digit Aadhaar numbers are strictly rejected for privacy protection.'
  }).refine((val) => /^\d{4}$/.test(val), {
    message: 'Aadhaar last 4 digits must contain exactly 4 numeric digits.'
  }),
  mobile: z.string().regex(/^[6-9][0-9]{9}$/, 'Mobile number must be a valid 10-digit Indian phone number starting with 6-9'),
  email: z.string().email('Valid email address is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Pincode must be a 6-digit Indian postal code starting with 1-9'),
  occupationCode: z.string().min(1, 'Occupation is required'),
  annualIncome: z.number().min(0, 'Annual income cannot be negative'),
  consentKyc: z.boolean(),
});

// POST /api/v1/applications/draft - Autosave or explicit save
router.post('/draft', authenticate, async (req: Request, res: Response, next) => {
  try {
    const rawData = req.body;
    
    // Explicit 12-digit Aadhaar check as per FR-2
    if (rawData.aadhaarLast4 && rawData.aadhaarLast4.length === 12) {
      res.status(400).json({
        code: 'AADHAAR_FULL_REJECTED',
        message: 'Only the last 4 Aadhaar digits are accepted. A 12-digit value is refused.',
        field: 'aadhaarLast4',
      });
      return;
    }

    const applicantId = req.user!.userId;
    let applicationId = rawData.applicationId;

    if (!applicationId) {
      const count = await Application.countDocuments();
      applicationId = `APP${(2000000 + count + 1).toString()}`;
    }

    const applicationDate = rawData.applicationDate || new Date().toISOString().split('T')[0];

    const app = await Application.findOneAndUpdate(
      { applicationId, applicantId },
      {
        $set: {
          applicationDate,
          fullName: rawData.fullName || '',
          dob: rawData.dob || '',
          gender: rawData.gender || 'OTHER',
          panNumber: (rawData.panNumber || '').toUpperCase(),
          aadhaarLast4: rawData.aadhaarLast4 || '',
          mobile: rawData.mobile || '',
          email: rawData.email || '',
          address: rawData.address || '',
          city: rawData.city || '',
          state: rawData.state || '',
          pincode: rawData.pincode || '',
          occupationCode: rawData.occupationCode || '',
          annualIncome: rawData.annualIncome || 0,
          consentKyc: !!rawData.consentKyc,
          status: 'DRAFT',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      message: 'Draft saved successfully.',
      application: app,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/applications/submit - Submit application for processing
router.post('/submit', authenticate, async (req: Request, res: Response, next) => {
  try {
    const rawData = req.body;

    // Explicit check for 12-digit Aadhaar
    if (rawData.aadhaarLast4 && rawData.aadhaarLast4.length === 12) {
      res.status(400).json({
        code: 'AADHAAR_FULL_REJECTED',
        message: 'Only the last 4 Aadhaar digits are accepted; a 12-digit value is refused.',
        field: 'aadhaarLast4',
      });
      return;
    }

    const data = ApplicationInputSchema.parse(rawData);
    const applicantId = req.user!.userId;

    if (!data.consentKyc) {
      res.status(400).json({
        code: 'CONSENT_REQUIRED',
        message: 'Consent to KYC checks is mandatory to submit an application.',
      });
      return;
    }

    let applicationId = rawData.applicationId;
    if (!applicationId) {
      const count = await Application.countDocuments();
      applicationId = `APP${(2000000 + count + 1).toString()}`;
    }

    // Check existing documents uploaded for this application
    const docs = await DocumentModel.find({ applicationId, isDeleted: false });
    if (docs.length < 3) {
      res.status(400).json({
        code: 'INSUFFICIENT_DOCUMENTS',
        message: `At least 3 documents (PAN Card, Aadhaar Card, Address Proof) must be uploaded before submitting. Currently uploaded: ${docs.length}`,
      });
      return;
    }

    const applicationDate = rawData.applicationDate || new Date().toISOString().split('T')[0];

    const app = await Application.findOneAndUpdate(
      { applicationId, applicantId },
      {
        $set: {
          applicationDate,
          fullName: data.fullName,
          dob: data.dob,
          gender: data.gender,
          panNumber: data.panNumber.toUpperCase(),
          aadhaarLast4: data.aadhaarLast4,
          mobile: data.mobile,
          email: data.email,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          occupationCode: data.occupationCode,
          annualIncome: data.annualIncome,
          consentKyc: data.consentKyc,
          status: 'SUBMITTED',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await auditService.log({
      action: 'APPLICATION_SUBMITTED',
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actorEmail: req.user!.email,
      applicationId: app.applicationId,
      entityType: 'Application',
      ipAddress: req.ip,
    });

    // Run rules & extraction workflow immediately
    const processedApp = await stateMachine.processApplication(
      app.applicationId,
      req.user!.userId,
      req.user!.role
    );

    res.status(200).json({
      message: 'Application submitted and evaluated successfully.',
      application: processedApp,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/applications/my - List applicant's own applications
router.get('/my', authenticate, async (req: Request, res: Response, next) => {
  try {
    const apps = await Application.find({
      $or: [{ applicantId: req.user!.userId }, { applicantId: req.user!.username }],
    }).sort({ createdAt: -1 }).lean();

    // Mask PII for display
    const masked = apps.map((app) => ({
      ...app,
      panNumber: maskPan(app.panNumber),
      aadhaarLast4: maskAadhaar(app.aadhaarLast4),
      mobile: maskMobile(app.mobile),
      email: maskEmail(app.email),
    }));

    res.json({ applications: masked });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/applications/:applicationId - Application details
router.get('/:applicationId', authenticate, checkApplicationOwnership, async (req: Request, res: Response, next) => {
  try {
    const { applicationId } = req.params;
    const app = await Application.findOne({ applicationId }).lean();

    if (!app) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Application not found.' });
      return;
    }

    const docs = await DocumentModel.find({ applicationId, isDeleted: false }).lean();

    // If caller is an APPLICANT, protect internal fields (Section 3: "Cannot see confidence scores, watchlist details or other applicants")
    if (req.user!.role === 'APPLICANT') {
      const applicantSafeDocs = docs.map((d) => ({
        docId: d.docId,
        fileName: d.fileName,
        declaredDocType: d.declaredDocType,
        createdAt: d.createdAt,
      }));

      const readableReasons = (app.reasonCodes || []).map((code) => ({
        code,
        message: REASON_CODE_DESCRIPTIONS[code] || 'Verification condition under review.',
      }));

      res.json({
        application: {
          applicationId: app.applicationId,
          applicationDate: app.applicationDate,
          fullName: app.fullName,
          dob: app.dob,
          gender: app.gender,
          panNumber: maskPan(app.panNumber),
          aadhaarLast4: maskAadhaar(app.aadhaarLast4),
          mobile: maskMobile(app.mobile),
          email: maskEmail(app.email),
          address: app.address,
          city: app.city,
          state: app.state,
          pincode: app.pincode,
          occupationCode: app.occupationCode,
          annualIncome: app.annualIncome,
          status: app.status,
          decision: app.decision,
          reasons: readableReasons,
          coreBankingAccount: app.coreBankingAccount,
          resubmissionDeadline: app.resubmissionDeadline,
          version: app.version,
        },
        documents: applicantSafeDocs,
      });
      return;
    }

    // KYC Officer / Checker / Admin view
    res.json({
      application: app,
      documents: docs,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
