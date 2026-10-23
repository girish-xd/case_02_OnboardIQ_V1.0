import { DeclaredDocType, ExtractedField } from '../../types/index.js';
import { IExtractionProvider, ExtractionResult } from './types.js';

export class RuleBasedAIExtractor implements IExtractionProvider {
  public name = 'ai';

  public async extract(
    docId: string,
    text?: string,
    _declaredDocType?: DeclaredDocType
  ): Promise<ExtractionResult> {
    if (!text || !text.trim()) {
      return {
        docId,
        docType: 'OTHER',
        docTypeConfidence: 0.0,
        fields: [],
      };
    }

    const cleanText = text.trim();

    // Guardrail / Prompt-injection defense (Challenge 5 & Section 6.2.1):
    // If document contains prompt injection or adversarial instruction overrides,
    // it MUST be classified as OTHER and must not alter decisions!
    const injectionPatterns = [
      /ignore all previous instructions/i,
      /ignore previous instructions/i,
      /system override/i,
      /approve this applicant/i,
      /bypass rules/i,
      /grant full approval/i,
    ];

    if (injectionPatterns.some((pattern) => pattern.test(cleanText))) {
      return {
        docId,
        docType: 'OTHER',
        docTypeConfidence: 0.0,
        fields: [
          {
            fieldName: 'security_alert',
            value: 'ADVERSARIAL_PROMPT_INJECTION_DETECTED',
            confidence: 1.0,
            source: 'AI',
          },
        ],
      };
    }

    // Classification via weighted keyword heuristics
    const upper = cleanText.toUpperCase();
    let docType: DeclaredDocType = 'OTHER';
    let docTypeConfidence = 0.5;

    // Check PAN Card
    if (upper.includes('INCOME TAX DEPARTMENT') || upper.includes('PERMANENT ACCOUNT NUMBER') || upper.includes('PAN CARD')) {
      docType = 'PAN_CARD';
      docTypeConfidence = 0.98;
    }
    // Check Aadhaar Card
    else if (upper.includes('UNIQUE IDENTIFICATION AUTHORITY OF INDIA') || upper.includes('AADHAAR') || upper.includes('MERA AADHAAR')) {
      docType = 'AADHAAR_CARD';
      docTypeConfidence = 0.98;
    }
    // Check Electricity Bill (must not be confused with bank statement mentioning electricity)
    else if (upper.includes('ELECTRICITY') && (upper.includes('POWER DISTRIBUTION') || upper.includes('CONSUMER NO') || upper.includes('DISCOM') || upper.includes('KWH') || upper.includes('ELECTRICITY BILL'))) {
      docType = 'ELECTRICITY_BILL';
      docTypeConfidence = 0.95;
    }
    // Check Bank Statement
    else if (upper.includes('ACCOUNT STATEMENT') || upper.includes('BANK STATEMENT') || (upper.includes('SAVINGS ACCOUNT') && upper.includes('BALANCE'))) {
      docType = 'BANK_STATEMENT';
      docTypeConfidence = 0.95;
    }
    // Check Driving Licence
    else if (upper.includes('DRIVING LICENCE') || upper.includes('DRIVING LICENSE') || upper.includes('TRANSPORT DEPARTMENT') || upper.includes('MOTOR VEHICLES')) {
      docType = 'DRIVING_LICENCE';
      docTypeConfidence = 0.96;
    } else {
      docType = 'OTHER';
      docTypeConfidence = 0.1;
    }

    const fields: ExtractedField[] = [];

    // Normalization helpers
    const normalizeDate = (dStr: string): string => {
      // Formats: DD/MM/YYYY, DD-Mon-YYYY, YYYY-MM-DD
      const isoMatch = dStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) return dStr;

      const slashMatch = dStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (slashMatch) {
        const d = slashMatch[1].padStart(2, '0');
        const m = slashMatch[2].padStart(2, '0');
        const y = slashMatch[3];
        return `${y}-${m}-${d}`;
      }

      const monMatch = dStr.match(/^(\d{1,2})[\-\s]([A-Za-z]{3})[\-\s](\d{4})$/);
      if (monMatch) {
        const months: Record<string, string> = {
          JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
          JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
        };
        const d = monMatch[1].padStart(2, '0');
        const m = months[monMatch[2].toUpperCase()] || '01';
        const y = monMatch[3];
        return `${y}-${m}-${d}`;
      }
      return dStr;
    };

    // Extract PAN number
    const panMatch = cleanText.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
    if (panMatch && docType === 'PAN_CARD') {
      fields.push({
        fieldName: 'pan_number',
        value: panMatch[1].toUpperCase(),
        confidence: 0.98,
        source: 'AI',
      });
    }

    // Extract Aadhaar last 4
    const aadhaarMatch = cleanText.match(/\b(?:\d{4}\s\d{4}\s|\*{4}\s\*{4}\s|XXXX\sXXXX\s|XXXX-XXXX-)?(\d{4})\b/);
    if (aadhaarMatch && docType === 'AADHAAR_CARD') {
      fields.push({
        fieldName: 'aadhaar_last4',
        value: aadhaarMatch[1],
        confidence: 0.97,
        source: 'AI',
      });
    }

    // Extract DOB
    const dobMatch = cleanText.match(/(?:DOB|Date of Birth|Birth Date)[:\s]+([0-9A-Za-z\/\-\s]+)/i);
    if (dobMatch) {
      const rawDate = dobMatch[1].trim().split(/\n|\r/)[0];
      const parsed = normalizeDate(rawDate);
      if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
        fields.push({
          fieldName: 'dob',
          value: parsed,
          confidence: 0.94,
          source: 'AI',
        });
      }
    }

    // Extract Name
    const nameMatch = cleanText.match(/(?:Name|Full Name|Cardholder Name)[:\s]+([A-Za-z\s\.\-]+)/i);
    if (nameMatch) {
      const nameVal = nameMatch[1].trim().split(/\n|\r/)[0].replace(/[^A-Za-z\s\.\-]/g, '').trim();
      if (nameVal.length > 2) {
        fields.push({
          fieldName: 'name',
          value: nameVal,
          confidence: 0.93,
          source: 'AI',
        });
      }
    }

    // Extract Pincode
    const pinMatch = cleanText.match(/\b([1-9][0-9]{5})\b/);
    if (pinMatch) {
      fields.push({
        fieldName: 'pincode',
        value: pinMatch[1],
        confidence: 0.96,
        source: 'AI',
      });
    }

    // Extract Document Date / Valid Until
    const docDateMatch = cleanText.match(/(?:Bill Date|Statement Date|Date)[:\s]+([0-9A-Za-z\/\-\s]+)/i);
    if (docDateMatch && (docType === 'ELECTRICITY_BILL' || docType === 'BANK_STATEMENT')) {
      const raw = docDateMatch[1].trim().split(/\n|\r/)[0];
      const parsed = normalizeDate(raw);
      if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
        fields.push({
          fieldName: 'document_date',
          value: parsed,
          confidence: 0.92,
          source: 'AI',
        });
      }
    }

    const validUntilMatch = cleanText.match(/(?:Valid Till|Valid Until|Expiry Date|Expires)[:\s]+([0-9A-Za-z\/\-\s]+)/i);
    if (validUntilMatch && docType === 'DRIVING_LICENCE') {
      const raw = validUntilMatch[1].trim().split(/\n|\r/)[0];
      const parsed = normalizeDate(raw);
      if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
        fields.push({
          fieldName: 'valid_until',
          value: parsed,
          confidence: 0.92,
          source: 'AI',
        });
      }
    }

    return {
      docId,
      docType,
      docTypeConfidence,
      fields,
    };
  }
}
