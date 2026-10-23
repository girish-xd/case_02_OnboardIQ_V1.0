import {
  DecisionOutcome,
  ApplicationStatus,
  RiskCategory,
  RuleEvaluationResult,
  EvaluationOutcome,
  DeclaredDocType,
} from '../types/index.js';
import { RulesConfig } from '../config/rulesConfig.js';
import { calculateNameSimilarity } from '../utils/levenshtein.js';

export interface ApplicationInput {
  applicationId: string;
  applicationDate: string; // YYYY-MM-DD
  fullName: string;
  dob: string; // YYYY-MM-DD
  panNumber: string;
  aadhaarLast4: string;
  pincode: string;
  occupationCode: string;
  annualIncome: number;
}

export interface DocumentInput {
  docId: string;
  declaredDocType: DeclaredDocType;
  classifiedDocType: DeclaredDocType;
  docTypeConfidence: number;
  fields: Record<string, { value: string; confidence: number; source?: string }>;
}

export interface WatchlistEntry {
  id: string;
  name: string;
  alias?: string;
  dob?: string;
}

export interface ScreeningContext {
  sanctions: WatchlistEntry[];
  peps: WatchlistEntry[];
  existingCustomerPans: Set<string>;
  occupationRiskLevels: Record<string, string>; // occupationCode -> LOW | MEDIUM | HIGH
}

export function parseDate(dStr: string | undefined | null): Date | null {
  if (!dStr) return null;
  const parts = dStr.trim().split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dt = new Date(Date.UTC(y, m, d));
    if (!isNaN(dt.getTime())) return dt;
  }
  return null;
}

export function formatDate(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addYears(dt: Date, years: number): Date {
  const y = dt.getUTCFullYear() + years;
  const m = dt.getUTCMonth();
  const d = dt.getUTCDate();
  // Handle Feb 29 leap year moving to Feb 28
  if (m === 1 && d === 29) {
    const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    return new Date(Date.UTC(y, 1, isLeap ? 29 : 28));
  }
  return new Date(Date.UTC(y, m, d));
}

export function computeAge(dob: Date, appDate: Date): number {
  let age = appDate.getUTCFullYear() - dob.getUTCFullYear();
  const mDiff = appDate.getUTCMonth() - dob.getUTCMonth();
  if (mDiff < 0 || (mDiff === 0 && appDate.getUTCDate() < dob.getUTCDate())) {
    age--;
  }
  return age;
}

export function evaluateApplicationRules(
  app: ApplicationInput,
  documents: DocumentInput[],
  screening: ScreeningContext,
  config: RulesConfig
): EvaluationOutcome {
  const appDate = parseDate(app.applicationDate);
  const declDob = parseDate(app.dob);
  const minConf = config.min_field_confidence;
  const titleTokens = config.name_title_tokens;

  // Sort documents by docId ascending for deterministic selection (Section 6.1)
  const sortedDocs = [...documents].sort((a, b) => a.docId.localeCompare(b.docId));

  // Select primary documents
  const panDoc = sortedDocs.find((d) => d.classifiedDocType === 'PAN_CARD');
  const aadhaarDoc = sortedDocs.find((d) => d.classifiedDocType === 'AADHAAR_CARD');
  const addrDoc = sortedDocs.find((d) =>
    ['ELECTRICITY_BILL', 'BANK_STATEMENT', 'DRIVING_LICENCE'].includes(d.classifiedDocType)
  );

  // Helper for usable field check
  const getUsableField = (
    doc: DocumentInput | undefined,
    fieldName: string
  ): { value: string | null; isUsable: boolean } => {
    if (!doc) return { value: null, isUsable: false };
    const f = doc.fields[fieldName];
    if (!f || f.value === undefined || f.value === null) {
      return { value: null, isUsable: false };
    }
    const val = String(f.value).trim();
    if (val !== '' && f.confidence >= minConf) {
      return { value: val, isUsable: true };
    }
    return { value: val || null, isUsable: false };
  };

  // Check required fields completeness for R3
  let r3Triggered = false;
  for (const d of sortedDocs) {
    if (d.docTypeConfidence < minConf) {
      r3Triggered = true;
    }
  }

  if (panDoc) {
    for (const req of ['name', 'dob', 'pan_number']) {
      const f = panDoc.fields[req];
      if (!f || !f.value || f.confidence < minConf) {
        r3Triggered = true;
      }
    }
  }

  if (aadhaarDoc) {
    for (const req of ['name', 'dob', 'aadhaar_last4']) {
      const f = aadhaarDoc.fields[req];
      if (!f || !f.value || f.confidence < minConf) {
        r3Triggered = true;
      }
    }
  }

  if (addrDoc) {
    if (['ELECTRICITY_BILL', 'BANK_STATEMENT'].includes(addrDoc.classifiedDocType)) {
      for (const req of ['pincode', 'document_date']) {
        const f = addrDoc.fields[req];
        if (!f || !f.value || f.confidence < minConf) {
          r3Triggered = true;
        }
      }
    } else if (addrDoc.classifiedDocType === 'DRIVING_LICENCE') {
      for (const req of ['pincode', 'valid_until']) {
        const f = addrDoc.fields[req];
        if (!f || !f.value || f.confidence < minConf) {
          r3Triggered = true;
        }
      }
    }
  }

  // Extract usable values
  const panName = getUsableField(panDoc, 'name');
  const panDobStr = getUsableField(panDoc, 'dob');
  const panDob = panDobStr.isUsable ? parseDate(panDobStr.value) : null;
  const panNumber = getUsableField(panDoc, 'pan_number');

  const aadhaarName = getUsableField(aadhaarDoc, 'name');
  const aadhaarDobStr = getUsableField(aadhaarDoc, 'dob');
  const aadhaarDob = aadhaarDobStr.isUsable ? parseDate(aadhaarDobStr.value) : null;
  const aadhaarLast4 = getUsableField(aadhaarDoc, 'aadhaar_last4');

  const addrPincode = getUsableField(addrDoc, 'pincode');
  const addrDocDateStr = getUsableField(addrDoc, 'document_date');
  const addrDocDate = addrDocDateStr.isUsable ? parseDate(addrDocDateStr.value) : null;
  const addrValidUntilStr = getUsableField(addrDoc, 'valid_until');
  const addrValidUntil = addrValidUntilStr.isUsable ? parseDate(addrValidUntilStr.value) : null;

  // Name match score calculation: lowest similarity between declared name and usable names
  const nameScores: number[] = [];
  if (panName.isUsable && panName.value) {
    nameScores.push(calculateNameSimilarity(app.fullName, panName.value, titleTokens));
  }
  if (aadhaarName.isUsable && aadhaarName.value) {
    nameScores.push(calculateNameSimilarity(app.fullName, aadhaarName.value, titleTokens));
  }
  const nameMatchScore = nameScores.length > 0 ? Math.min(...nameScores) : null;

  // Watchlist Screening
  let sanctionsMatch = false;
  let sanctionsPossible = false;
  for (const s of screening.sanctions) {
    const candidates = [s.name];
    if (s.alias) {
      candidates.push(...s.alias.split(';').map((a) => a.trim()).filter(Boolean));
    }
    for (const cand of candidates) {
      const sim = calculateNameSimilarity(app.fullName, cand, titleTokens);
      if (sim >= config.watchlist_match_threshold) {
        const sDob = parseDate(s.dob);
        if (!s.dob || (sDob && declDob && sDob.getTime() === declDob.getTime())) {
          sanctionsMatch = true;
        } else {
          sanctionsPossible = true;
        }
      } else if (sim >= config.watchlist_possible_threshold) {
        sanctionsPossible = true;
      }
    }
  }

  let pepMatch = false;
  for (const p of screening.peps) {
    const sim = calculateNameSimilarity(app.fullName, p.name, titleTokens);
    if (sim >= config.watchlist_match_threshold) {
      const pDob = parseDate(p.dob);
      if (!p.dob || (pDob && declDob && pDob.getTime() === declDob.getTime())) {
        pepMatch = true;
      }
    }
  }

  // Evaluate Rules R1 to R17 in exact order
  const triggered: RuleEvaluationResult[] = [];

  // R1: No usable document of type PAN_CARD, or AADHAAR_CARD, or address proof
  if (!panDoc || !aadhaarDoc || !addrDoc) {
    triggered.push({
      ruleId: 'R1',
      reasonCode: 'DOCUMENT_MISSING',
      outcome: 'REVIEW',
      description: 'One or more mandatory documents (PAN card, Aadhaar card, or address proof) are missing.',
      details: { hasPan: !!panDoc, hasAadhaar: !!aadhaarDoc, hasAddress: !!addrDoc }
    });
  }

  // R2: Any document's classified doc_type differs from declared_doc_type
  if (sortedDocs.some((d) => d.classifiedDocType !== d.declaredDocType)) {
    triggered.push({
      ruleId: 'R2',
      reasonCode: 'DOCUMENT_TYPE_MISMATCH',
      outcome: 'REVIEW',
      description: 'One or more documents classified type differs from customer declared type.'
    });
  }

  // R3: Low extraction confidence or missing required field
  if (r3Triggered) {
    triggered.push({
      ruleId: 'R3',
      reasonCode: 'LOW_EXTRACTION_CONFIDENCE',
      outcome: 'REVIEW',
      description: 'Document classification confidence is below threshold or required fields are missing / uncertain.'
    });
  }

  // R4: Age below 18
  const age = (declDob && appDate) ? computeAge(declDob, appDate) : 0;
  if (age < config.min_age) {
    triggered.push({
      ruleId: 'R4',
      reasonCode: 'AGE_BELOW_18',
      outcome: 'REJECT',
      description: `Applicant age is ${age}, which is below the minimum legal threshold of ${config.min_age} years.`,
      details: { age }
    });
  }

  // R5: Declared PAN format and individual holder type
  const panRegex = new RegExp(config.pan_pattern);
  const isValidPan = panRegex.test(app.panNumber);
  const isIndividualHolder = app.panNumber.length >= 4 && app.panNumber[3] === config.pan_holder_type_char;
  if (!isValidPan || !isIndividualHolder) {
    triggered.push({
      ruleId: 'R5',
      reasonCode: 'PAN_INVALID',
      outcome: 'REJECT',
      description: 'Declared PAN is invalid in structure or 4th character is not P (Individual).',
      details: { panNumber: app.panNumber }
    });
  }

  // R6: Usable PAN on card differs from declared PAN
  if (panNumber.isUsable && panNumber.value !== app.panNumber) {
    triggered.push({
      ruleId: 'R6',
      reasonCode: 'PAN_MISMATCH',
      outcome: 'REJECT',
      description: 'PAN read from document differs from declared PAN number.',
      details: { declared: app.panNumber, extracted: panNumber.value }
    });
  }

  // R7: Usable DOB on card differs from declared DOB
  const panDobMismatch = panDob && declDob && panDob.getTime() !== declDob.getTime();
  const aadhaarDobMismatch = aadhaarDob && declDob && aadhaarDob.getTime() !== declDob.getTime();
  if (panDobMismatch || aadhaarDobMismatch) {
    triggered.push({
      ruleId: 'R7',
      reasonCode: 'DOB_MISMATCH',
      outcome: 'REJECT',
      description: 'Date of birth extracted from PAN or Aadhaar card differs from declared DOB.'
    });
  }

  // R8: Usable Aadhaar last 4 differs from declared
  if (aadhaarLast4.isUsable && aadhaarLast4.value !== app.aadhaarLast4) {
    triggered.push({
      ruleId: 'R8',
      reasonCode: 'AADHAAR_MISMATCH',
      outcome: 'REJECT',
      description: 'Aadhaar last 4 digits extracted from document differ from declared digits.',
      details: { declared: app.aadhaarLast4, extracted: aadhaarLast4.value }
    });
  }

  // R9: name_match_score below reject threshold (< 0.75)
  if (nameMatchScore !== null && nameMatchScore < config.name_reject_below) {
    triggered.push({
      ruleId: 'R9',
      reasonCode: 'NAME_MISMATCH',
      outcome: 'REJECT',
      description: `Name match similarity score ${nameMatchScore.toFixed(4)} is below rejection threshold ${config.name_reject_below}.`,
      details: { nameMatchScore }
    });
  }

  // R10: Sanctions MATCH
  if (sanctionsMatch) {
    triggered.push({
      ruleId: 'R10',
      reasonCode: 'SANCTIONS_MATCH',
      outcome: 'REJECT',
      description: 'Applicant name matches confirmed entry on designated sanctions watchlist.'
    });
  }

  // R11: name_match_score from 0.75 to below 0.90
  if (nameMatchScore !== null && nameMatchScore >= config.name_reject_below && nameMatchScore < config.name_match_threshold) {
    triggered.push({
      ruleId: 'R11',
      reasonCode: 'NAME_MISMATCH_MINOR',
      outcome: 'REVIEW',
      description: `Minor name variance detected; similarity ${nameMatchScore.toFixed(4)} requires officer review.`,
      details: { nameMatchScore }
    });
  }

  // R12: Driving licence expired
  if (addrDoc && addrDoc.classifiedDocType === 'DRIVING_LICENCE' && addrValidUntil && appDate) {
    if (addrValidUntil.getTime() < appDate.getTime()) {
      triggered.push({
        ruleId: 'R12',
        reasonCode: 'DOCUMENT_EXPIRED',
        outcome: 'REVIEW',
        description: 'Driving licence address proof validity date has expired.'
      });
    }
  }

  // R13: Electricity bill or bank statement stale (> 90 days before or after app date)
  if (addrDoc && ['ELECTRICITY_BILL', 'BANK_STATEMENT'].includes(addrDoc.classifiedDocType) && addrDocDate && appDate) {
    const diffMs = appDate.getTime() - addrDocDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > config.address_proof_max_age_days || diffDays < 0) {
      triggered.push({
        ruleId: 'R13',
        reasonCode: 'ADDRESS_PROOF_STALE',
        outcome: 'REVIEW',
        description: `Address proof document date is ${diffDays} days old (exceeds ${config.address_proof_max_age_days} days limit or is future-dated).`,
        details: { diffDays }
      });
    }
  }

  // R14: Pincode mismatch on address proof
  if (addrPincode.isUsable && addrPincode.value !== app.pincode) {
    triggered.push({
      ruleId: 'R14',
      reasonCode: 'ADDRESS_MISMATCH',
      outcome: 'REVIEW',
      description: 'Pincode extracted from address proof differs from declared pincode.',
      details: { declared: app.pincode, extracted: addrPincode.value }
    });
  }

  // R15: Sanctions POSSIBLE match
  if (sanctionsPossible) {
    triggered.push({
      ruleId: 'R15',
      reasonCode: 'SANCTIONS_POSSIBLE_MATCH',
      outcome: 'REVIEW',
      description: 'Possible name similarity match found on sanctions watchlist requiring enhanced due diligence.'
    });
  }

  // R16: PEP MATCH
  if (pepMatch) {
    triggered.push({
      ruleId: 'R16',
      reasonCode: 'PEP_MATCH',
      outcome: 'REVIEW',
      description: 'Politically Exposed Person (PEP) or close associate match found on PEP list.'
    });
  }

  // R17: Existing customer duplicate PAN
  if (screening.existingCustomerPans.has(app.panNumber)) {
    triggered.push({
      ruleId: 'R17',
      reasonCode: 'DUPLICATE_CUSTOMER',
      outcome: 'REVIEW',
      description: 'Declared PAN is already registered with an existing customer account at Deccan Digital Bank.'
    });
  }

  // Final Decision Precedence (Section 6.1)
  const rejectRules = triggered.filter((r) => r.outcome === 'REJECT');
  const reviewRules = triggered.filter((r) => r.outcome === 'REVIEW');

  let decision: DecisionOutcome = 'APPROVE';
  if (rejectRules.length > 0) {
    decision = 'REJECT';
  } else if (reviewRules.length > 0) {
    decision = 'REVIEW';
  }

  const reasonCodes = triggered.map((t) => t.reasonCode);

  // Risk and Re-KYC computation (Section 6.1.2)
  let riskCategory: RiskCategory = '';
  let rekycDueDate = '';

  if (decision === 'APPROVE' || decision === 'REVIEW') {
    const occRisk = screening.occupationRiskLevels[app.occupationCode] || 'LOW';
    const isHigh =
      reasonCodes.includes('SANCTIONS_POSSIBLE_MATCH') ||
      reasonCodes.includes('PEP_MATCH') ||
      occRisk === 'HIGH';
    const isMed = occRisk === 'MEDIUM' || app.annualIncome >= config.medium_risk_income;

    if (isHigh) {
      riskCategory = 'HIGH';
      if (appDate) {
        rekycDueDate = formatDate(addYears(appDate, config.rekyc_years.HIGH));
      }
    } else if (isMed) {
      riskCategory = 'MEDIUM';
      if (appDate) {
        rekycDueDate = formatDate(addYears(appDate, config.rekyc_years.MEDIUM));
      }
    } else {
      riskCategory = 'LOW';
      if (appDate) {
        rekycDueDate = formatDate(addYears(appDate, config.rekyc_years.LOW));
      }
    }
  }

  // Routing and initial workflow status
  let status: ApplicationStatus = 'AUTO_APPROVED';
  if (decision === 'REJECT') {
    status = 'AUTO_REJECTED';
  } else if (decision === 'REVIEW') {
    status = 'IN_REVIEW';
  } else if (decision === 'APPROVE') {
    if (riskCategory === 'HIGH') {
      status = 'PENDING_CHECKER';
    } else {
      status = 'AUTO_APPROVED';
    }
  }

  return {
    decision,
    status,
    reasonCodes,
    nameMatchScore,
    riskCategory,
    rekycDueDate,
    triggeredRules: triggered,
    configVersion: config.version,
    evaluatedAt: new Date(),
  };
}
