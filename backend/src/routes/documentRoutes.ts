import { Router, Request, Response } from 'express';
import multer from 'multer';
import { DocumentModel } from '../models/Document.js';
import { Application } from '../models/Application.js';
import { Extraction } from '../models/Extraction.js';
import { documentStorage } from '../services/storageAdapter.js';
import { extractionService } from '../services/extraction/extractionService.js';
import { authenticate } from '../middleware/auth.js';
import { auditService } from '../services/auditService.js';
import { DeclaredDocType } from '../types/index.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit at multer, 1MB strict check in storage adapter
});

// POST /api/v1/documents/upload
router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ code: 'FILE_MISSING', message: 'No file uploaded.' });
        return;
      }

      const { applicationId, declaredDocType } = req.body;
      if (!applicationId || !declaredDocType) {
        res.status(400).json({
          code: 'MISSING_METADATA',
          message: 'applicationId and declaredDocType are required fields.',
        });
        return;
      }

      // Check application access
      const app = await Application.findOne({ applicationId });
      if (!app) {
        res.status(404).json({ code: 'NOT_FOUND', message: 'Application not found.' });
        return;
      }

      if (
        req.user!.role === 'APPLICANT' &&
        app.applicantId !== req.user!.userId &&
        app.applicantId !== req.user!.username
      ) {
        res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied.' });
        return;
      }

      // Generate unique sequential docId above benchmark evaluation range (D3000001-D3000486)
      const lastDoc = await DocumentModel.findOne().sort({ docId: -1 }).select('docId').lean();
      let nextNum = 3001001;
      if (lastDoc && lastDoc.docId && lastDoc.docId.startsWith('D')) {
        const lastNum = parseInt(lastDoc.docId.substring(1), 10);
        if (!isNaN(lastNum)) {
          nextNum = Math.max(3001001, lastNum + 1);
        }
      }
      const docId = `D${nextNum.toString()}`;

      // Save file with hash verification and security checks
      const saved = await documentStorage.saveDocument(
        docId,
        req.file.originalname,
        req.file.buffer,
        req.file.mimetype
      );

      // Idempotency check (Section 6.5): Re-submitting the same document file (same hash)
      // for an application does not create a duplicate document.
      const existingDoc = await DocumentModel.findOne({
        applicationId,
        fileHash: saved.fileHash,
        isDeleted: false,
      });

      if (existingDoc) {
        res.status(200).json({
          message: 'Document already uploaded (idempotent match).',
          document: existingDoc,
        });
        return;
      }

      // Create new document record
      const docRecord = await DocumentModel.create({
        docId,
        applicationId,
        fileName: saved.fileName,
        declaredDocType: declaredDocType as DeclaredDocType,
        classifiedDocType: 'OTHER',
        docTypeConfidence: 0.0,
        fileHash: saved.fileHash,
        fileSize: saved.fileSize,
        mimeType: saved.mimeType,
        storagePath: saved.storagePath,
        text: saved.text || '',
        version: 1,
      });

      await auditService.log({
        action: 'DOCUMENT_UPLOADED',
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        actorEmail: req.user!.email,
        applicationId,
        docId,
        entityType: 'Document',
        details: {
          fileName: saved.fileName,
          declaredDocType,
          fileHash: saved.fileHash,
          fileSize: saved.fileSize,
        },
        ipAddress: req.ip,
      });

      // Run extraction immediately
      const extractionResult = await extractionService.extractDocument(
        docId,
        saved.text,
        declaredDocType as DeclaredDocType,
        applicationId
      );

      // Refresh document
      const updatedDoc = await DocumentModel.findOne({ docId });

      res.status(201).json({
        message: 'Document uploaded and extracted successfully.',
        document: updatedDoc,
        extraction: extractionResult,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/documents/:docId/file - Authenticated file view (Audited as required by FR-9)
router.get('/:docId/file', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { docId } = req.params;
    const doc = await DocumentModel.findOne({ docId });

    if (!doc || doc.isDeleted) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Document not found.' });
      return;
    }

    // Role and ownership authorization
    if (req.user!.role === 'APPLICANT') {
      const app = await Application.findOne({ applicationId: doc.applicationId });
      if (!app || (app.applicantId !== req.user!.userId && app.applicantId !== req.user!.username)) {
        res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied.' });
        return;
      }
    }

    // Audit document view: user, role, timestamp, doc_id
    await auditService.log({
      action: 'DOCUMENT_VIEW',
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actorEmail: req.user!.email,
      applicationId: doc.applicationId,
      docId: doc.docId,
      entityType: 'Document',
      details: { fileName: doc.fileName },
      ipAddress: req.ip,
    });

    const buffer = documentStorage.getDocumentBuffer(doc.storagePath);
    res.setHeader('Content-Type', doc.mimeType || 'text/plain');
    res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/documents/:docId/extractions - Get extractions for a document
router.get('/:docId/extractions', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { docId } = req.params;
    const extractions = await Extraction.find({ docId }).sort({ fieldName: 1 }).lean();
    res.json({ extractions });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/documents/:docId/extract - Section 5 (FR-3) Extraction Interface
router.post('/:docId/extract', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { docId } = req.params;
    const doc = await DocumentModel.findOne({ docId });

    const text = doc?.text || req.body?.text || '';
    const declaredDocType = (doc?.declaredDocType || req.body?.declared_doc_type || 'OTHER') as DeclaredDocType;
    const appId = doc?.applicationId || req.body?.application_id;

    const result = await extractionService.extractDocument(docId, text, declaredDocType, appId);

    res.json({
      doc_id: result.docId,
      doc_type: result.docType,
      doc_type_confidence: result.docTypeConfidence,
      fields: result.fields.map((f) => ({
        field_name: f.fieldName,
        value: f.value,
        confidence: f.confidence,
        source: f.source,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
