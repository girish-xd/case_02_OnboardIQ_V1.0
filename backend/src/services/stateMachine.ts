import { Application, IApplication } from '../models/Application.js';
import { DocumentModel } from '../models/Document.js';
import { Extraction } from '../models/Extraction.js';
import { SanctionsList, PepList, ExistingCustomer, Occupation } from '../models/Watchlists.js';
import { getRulesConfig } from '../config/rulesConfig.js';
import { evaluateApplicationRules, ScreeningContext } from './rulesEngine.js';
import { coreBankingMock } from './coreBankingMock.js';
import { auditService } from './auditService.js';
import { notificationService, REASON_CODE_DESCRIPTIONS } from './notificationService.js';
import { extractionService } from './extraction/extractionService.js';
import { ApplicationStatus, UserRole } from '../types/index.js';

export class WorkflowStateMachine {
  /**
   * Helper to load active screening context from database
   */
  public async loadScreeningContext(): Promise<ScreeningContext> {
    const [sanctionsEntries, pepEntries, existingCusts, occupations] = await Promise.all([
      SanctionsList.find().lean(),
      PepList.find().lean(),
      ExistingCustomer.find().lean(),
      Occupation.find().lean(),
    ]);

    const sanctions = sanctionsEntries.map((s) => ({
      id: s.listId,
      name: s.name,
      alias: s.alias,
      dob: s.dob,
    }));

    const peps = pepEntries.map((p) => ({
      id: p.pepId,
      name: p.name,
      dob: p.dob,
    }));

    const existingCustomerPans = new Set(existingCusts.map((c) => c.panNumber));
    const occupationRiskLevels: Record<string, string> = {};
    for (const occ of occupations) {
      occupationRiskLevels[occ.occupationCode] = occ.riskLevel;
    }

    return {
      sanctions,
      peps,
      existingCustomerPans,
      occupationRiskLevels,
    };
  }

  /**
   * Run extraction and deterministic rules engine for an application
   */
  public async processApplication(applicationId: string, actorId: string, actorRole: UserRole) {
    const app = await Application.findOne({ applicationId });
    if (!app) throw new Error(`Application ${applicationId} not found.`);

    // Set status to EXTRACTING
    app.status = 'EXTRACTING';
    await app.save();

    await auditService.log({
      action: 'PROCESS_STARTED',
      actorId,
      actorRole,
      applicationId,
      entityType: 'Application',
      details: { status: 'EXTRACTING' },
    });

    // Fetch documents
    const docs = await DocumentModel.find({ applicationId, isDeleted: false }).lean();

    // Run extraction on each document if not already extracted
    for (const d of docs) {
      await extractionService.extractDocument(d.docId, d.text, d.declaredDocType, applicationId);
    }

    // Reload documents & extractions from database
    const refreshedDocs = await DocumentModel.find({ applicationId, isDeleted: false }).lean();
    const allExtractions = await Extraction.find({ applicationId }).lean();

    const documentInputs = refreshedDocs.map((d) => {
      const docFields = allExtractions.filter((e) => e.docId === d.docId);
      const fieldMap: Record<string, { value: string; confidence: number; source?: string }> = {};
      for (const f of docFields) {
        fieldMap[f.fieldName] = {
          value: f.value,
          confidence: f.confidence,
          source: f.source,
        };
      }

      return {
        docId: d.docId,
        declaredDocType: d.declaredDocType,
        classifiedDocType: d.classifiedDocType,
        docTypeConfidence: d.docTypeConfidence,
        fields: fieldMap,
      };
    });

    const screeningContext = await this.loadScreeningContext();
    const config = getRulesConfig();

    const evalResult = evaluateApplicationRules(
      {
        applicationId: app.applicationId,
        applicationDate: app.applicationDate,
        fullName: app.fullName,
        dob: app.dob,
        panNumber: app.panNumber,
        aadhaarLast4: app.aadhaarLast4,
        pincode: app.pincode,
        occupationCode: app.occupationCode,
        annualIncome: app.annualIncome,
      },
      documentInputs,
      screeningContext,
      config
    );

    // Update application with rule results
    app.decision = evalResult.decision;
    app.status = evalResult.status;
    app.reasonCodes = evalResult.reasonCodes;
    app.nameMatchScore = evalResult.nameMatchScore;
    app.riskCategory = evalResult.riskCategory;
    app.rekycDueDate = evalResult.rekycDueDate;
    app.lastEvaluatedAt = evalResult.evaluatedAt;
    app.version += 1;

    // If AUTO_APPROVED, open core-banking account immediately
    if (app.status === 'AUTO_APPROVED') {
      const account = await coreBankingMock.openAccount(app.applicationId);
      app.coreBankingAccount = {
        customerId: account.customerId,
        accountNumber: account.accountNumber,
        openedAt: account.openedAt,
      };

      await notificationService.notifyUser(
        app.applicantId,
        'APPLICANT',
        app.applicationId,
        'Application Approved!',
        `Congratulations! Your savings account (${account.accountNumber}) at Deccan Digital Bank has been opened.`
      );
    } else if (app.status === 'IN_REVIEW') {
      await notificationService.notifyUser(
        app.applicantId,
        'APPLICANT',
        app.applicationId,
        'Application Under Review',
        'Your application is undergoing verification by our KYC Operations team. We will update you shortly.'
      );
    } else if (app.status === 'PENDING_CHECKER') {
      await notificationService.notifyUser(
        app.applicantId,
        'APPLICANT',
        app.applicationId,
        'Application Under Compliance Review',
        'Your application is with our compliance department for final verification.'
      );
    } else if (app.status === 'AUTO_REJECTED') {
      const firstReason = app.reasonCodes[0] || 'CRITERIA_NOT_MET';
      const plainMsg = REASON_CODE_DESCRIPTIONS[firstReason] || 'Application could not be approved based on KYC eligibility criteria.';
      await notificationService.notifyUser(
        app.applicantId,
        'APPLICANT',
        app.applicationId,
        'Application Not Approved',
        `We regret to inform you that your savings account application could not be approved. Reason: ${plainMsg}`
      );
    }

    await app.save();

    await auditService.log({
      action: 'RULES_EVALUATED',
      actorId,
      actorRole,
      applicationId: app.applicationId,
      entityType: 'Application',
      details: {
        decision: app.decision,
        status: app.status,
        reasonCodes: app.reasonCodes,
        riskCategory: app.riskCategory,
        nameMatchScore: app.nameMatchScore,
        rekycDueDate: app.rekycDueDate,
        version: app.version,
      },
    });

    return app;
  }

  /**
   * KYC Officer (Maker) field correction
   */
  public async correctField(
    applicationId: string,
    docId: string,
    fieldName: string,
    newValue: string,
    reason: string,
    officerId: string,
    currentVersion: number
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new Error('Correction reason must be at least 5 characters long.');
    }

    const app = await Application.findOne({ applicationId });
    if (!app) throw new Error(`Application ${applicationId} not found.`);

    if (app.status !== 'IN_REVIEW') {
      throw new Error(`Cannot correct fields when application status is ${app.status}. Must be IN_REVIEW.`);
    }

    if (app.version !== currentVersion) {
      const conflictError: any = new Error('Concurrency conflict: Application data was modified by another user. Please refresh.');
      conflictError.status = 409;
      throw conflictError;
    }

    // Find existing extraction
    const existing = await Extraction.findOne({ docId, fieldName });
    const oldValue = existing ? existing.value : '';

    // Update extraction to source: OFFICER, confidence: 1.00 as per Section 6.1.2
    await Extraction.findOneAndUpdate(
      { docId, fieldName },
      {
        value: newValue.trim(),
        confidence: 1.0,
        source: 'OFFICER',
        originalValue: oldValue,
        correctionReason: reason.trim(),
        correctedBy: officerId,
        correctedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    await auditService.log({
      action: 'FIELD_CORRECTION',
      actorId: officerId,
      actorRole: 'MAKER',
      applicationId,
      docId,
      entityType: 'Extraction',
      details: {
        fieldName,
        before: oldValue,
        after: newValue.trim(),
        reason: reason.trim(),
      },
    });

    // Re-run rules with corrected value
    return this.processApplication(applicationId, officerId, 'MAKER');
  }

  /**
   * KYC Officer (Maker) recommendation
   */
  public async submitMakerRecommendation(
    applicationId: string,
    recommendation: 'APPROVE' | 'REJECT' | 'REQUEST_RESUBMISSION',
    comment: string,
    officerId: string,
    currentVersion: number
  ) {
    if (!comment || comment.trim().length < 10) {
      throw new Error('Recommendation comment must be at least 10 characters long as per Section 3.');
    }

    const app = await Application.findOne({ applicationId });
    if (!app) throw new Error(`Application ${applicationId} not found.`);

    if (app.status !== 'IN_REVIEW') {
      throw new Error(`Application must be IN_REVIEW to make a recommendation. Current status: ${app.status}`);
    }

    if (app.version !== currentVersion) {
      const conflictError: any = new Error('Concurrency conflict: Application was updated. Please refresh.');
      conflictError.status = 409;
      throw conflictError;
    }

    app.assignedMakerId = officerId;
    app.makerRecommendation = {
      outcome: recommendation,
      comment: comment.trim(),
      recommendedBy: officerId,
      recommendedAt: new Date(),
    };
    app.version += 1;

    if (recommendation === 'REQUEST_RESUBMISSION') {
      app.status = 'RESUBMISSION_REQUESTED';
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);
      app.resubmissionDeadline = deadline;

      await notificationService.notifyUser(
        app.applicantId,
        'APPLICANT',
        applicationId,
        'Document Resubmission Requested',
        `A KYC Officer has requested new documents for your application: "${comment.trim()}". Please re-upload within 7 days.`
      );
    } else {
      // Recommending APPROVE or REJECT routes to PENDING_CHECKER
      app.status = 'PENDING_CHECKER';
    }

    await app.save();

    await auditService.log({
      action: 'MAKER_RECOMMENDATION',
      actorId: officerId,
      actorRole: 'MAKER',
      applicationId,
      entityType: 'Application',
      details: {
        recommendation,
        comment: comment.trim(),
        newStatus: app.status,
      },
    });

    return app;
  }

  /**
   * Compliance Officer (Checker) decision
   */
  public async submitCheckerDecision(
    applicationId: string,
    decision: 'APPROVE' | 'REJECT' | 'SEND_BACK',
    comment: string,
    checkerId: string,
    currentVersion: number
  ) {
    if (!comment || comment.trim().length < 5) {
      throw new Error('Checker comment must be provided with a reason.');
    }

    const app = await Application.findOne({ applicationId });
    if (!app) throw new Error(`Application ${applicationId} not found.`);

    if (app.status !== 'PENDING_CHECKER') {
      throw new Error(`Application must be PENDING_CHECKER to make a final decision. Current status: ${app.status}`);
    }

    // CRITICAL SECURITY INVARIANT: Maker and Checker MUST differ! (Section 3, FR-7, Challenge 11)
    if (app.makerRecommendation && app.makerRecommendation.recommendedBy === checkerId) {
      const forbiddenError: any = new Error('Maker-Checker Violation: The recommending officer cannot check or approve the same case.');
      forbiddenError.status = 403;
      throw forbiddenError;
    }

    if (app.version !== currentVersion) {
      const conflictError: any = new Error('Concurrency conflict: Application was modified. Please refresh.');
      conflictError.status = 409;
      throw conflictError;
    }

    app.assignedCheckerId = checkerId;
    app.checkerDecision = {
      outcome: decision,
      comment: comment.trim(),
      decidedBy: checkerId,
      decidedAt: new Date(),
    };
    app.version += 1;

    if (decision === 'APPROVE') {
      app.status = 'APPROVED';
      const account = await coreBankingMock.openAccount(applicationId);
      app.coreBankingAccount = {
        customerId: account.customerId,
        accountNumber: account.accountNumber,
        openedAt: account.openedAt,
      };

      await notificationService.notifyUser(
        app.applicantId,
        'APPLICANT',
        applicationId,
        'Application Approved!',
        `Your application has been approved by Compliance. Account No: ${account.accountNumber}. Welcome to Deccan Digital Bank!`
      );
    } else if (decision === 'REJECT') {
      app.status = 'REJECTED';
      await notificationService.notifyUser(
        app.applicantId,
        'APPLICANT',
        applicationId,
        'Application Rejected',
        `Your application has been rejected by Compliance. Comment: ${comment.trim()}`
      );
    } else if (decision === 'SEND_BACK') {
      app.status = 'IN_REVIEW';
      await notificationService.notifyUser(
        app.applicantId,
        'APPLICANT',
        applicationId,
        'Application Under Re-verification',
        'Compliance has returned your application for further review by the operations team.'
      );
    }

    await app.save();

    await auditService.log({
      action: 'CHECKER_DECISION',
      actorId: checkerId,
      actorRole: 'CHECKER',
      applicationId,
      entityType: 'Application',
      details: {
        decision,
        comment: comment.trim(),
        newStatus: app.status,
      },
    });

    return app;
  }
}

export const stateMachine = new WorkflowStateMachine();
