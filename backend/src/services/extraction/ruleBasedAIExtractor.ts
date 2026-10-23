import { DeclaredDocType, ExtractedField } from '../../types/index.js';
import { IExtractionProvider, ExtractionResult } from './types.js';

export class RuleBasedAIExtractor implements IExtractionProvider {
  public name = 'ai';

  public async extract(
    docId: string,
    text?: string,
    declaredDocType?: DeclaredDocType
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

    const upper = cleanText.toUpperCase();
    let docType: DeclaredDocType = 'OTHER';
    let docTypeConfidence = 0.5;

    // Check PAN regex
    const panRegex = /\b([A-Z]{5}[0-9]{4}[A-Z])\b/;
    const panFound = panRegex.test(cleanText);

    // Check Aadhaar regex / pattern
    const aadhaarRegex = /\b(?:\d{4}\s\d{4}\s|\*{4}\s\*{4}\s|XXXX\sXXXX\s|XXXX-XXXX-)?(\d{4})\b/;
    const fullAadhaarRegex = /\b(\d{4}\s?\d{4}\s?\d{4})\b/;
    const aadhaarPatternFound = fullAadhaarRegex.test(cleanText) ||
      upper.includes('AADHAAR') ||
      upper.includes('AADHAR') ||
      upper.includes('UIDAI') ||
      upper.includes('UNIQUE IDENTIFICATION');

    // 1. Check PAN Card
    if (
      upper.includes('INCOME TAX DEPARTMENT') ||
      upper.includes('PERMANENT ACCOUNT NUMBER') ||
      upper.includes('PAN CARD') ||
      (panFound && (upper.includes('INCOME') || upper.includes('TAX') || upper.includes('GOVT OF INDIA') || declaredDocType === 'PAN_CARD'))
    ) {
      docType = 'PAN_CARD';
      docTypeConfidence = 0.98;
    }
    // 2. Check Aadhaar Card
    else if (
      upper.includes('UNIQUE IDENTIFICATION AUTHORITY OF INDIA') ||
      upper.includes('AADHAAR') ||
      upper.includes('AADHAR') ||
      upper.includes('MERA AADHAAR') ||
      (aadhaarPatternFound && declaredDocType === 'AADHAAR_CARD')
    ) {
      docType = 'AADHAAR_CARD';
      docTypeConfidence = 0.98;
    }
    // 3. Check Electricity Bill
    else if (
      (upper.includes('ELECTRICITY') && (upper.includes('POWER DISTRIBUTION') || upper.includes('CONSUMER NO') || upper.includes('DISCOM') || upper.includes('KWH') || upper.includes('ELECTRICITY BILL') || upper.includes('UNITS'))) ||
      (declaredDocType === 'ELECTRICITY_BILL' && (upper.includes('BILL') || upper.includes('CONSUMER') || upper.includes('POWER') || upper.includes('ELECTRIC')))
    ) {
      docType = 'ELECTRICITY_BILL';
      docTypeConfidence = 0.95;
    }
    // 4. Check Bank Statement
    else if (
      upper.includes('ACCOUNT STATEMENT') ||
      upper.includes('BANK STATEMENT') ||
      (upper.includes('SAVINGS ACCOUNT') && upper.includes('BALANCE')) ||
      (declaredDocType === 'BANK_STATEMENT' && (upper.includes('BANK') || upper.includes('STATEMENT') || upper.includes('ACCOUNT')))
    ) {
      docType = 'BANK_STATEMENT';
      docTypeConfidence = 0.95;
    }
    // 5. Check Driving Licence
    else if (
      upper.includes('DRIVING LICENCE') ||
      upper.includes('DRIVING LICENSE') ||
      upper.includes('TRANSPORT DEPARTMENT') ||
      upper.includes('MOTOR VEHICLES') ||
      upper.includes('DL NO') ||
      (declaredDocType === 'DRIVING_LICENCE' && (upper.includes('DRIVING') || upper.includes('LICENCE') || upper.includes('LICENSE')))
    ) {
      docType = 'DRIVING_LICENCE';
      docTypeConfidence = 0.96;
    }
    // Fallback: If user specified declaredDocType other than OTHER and text contains substance
    else if (declaredDocType && declaredDocType !== 'OTHER' && cleanText.length > 20) {
      docType = declaredDocType;
      docTypeConfidence = 0.85;
    } else {
      docType = 'OTHER';
      docTypeConfidence = 0.1;
    }

    const fields: ExtractedField[] = [];

    // Normalization helpers
    const normalizeDate = (dStr: string): string => {
      // Formats: DD/MM/YYYY, DD-Mon-YYYY, YYYY-MM-DD, DD.MM.YYYY
      const isoMatch = dStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) return dStr;

      const slashMatch = dStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
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
          JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
        };
        const d = monMatch[1].padStart(2, '0');
        const m = months[monMatch[2].toUpperCase()] || '01';
        const y = monMatch[3];
        return `${y}-${m}-${d}`;
      }

      // Format: Mon YYYY e.g. "May 2027" -> 2027-05-01
      const monYearMatch = dStr.match(/^([A-Za-z]{3,9})[\s,]+(\d{4})$/);
      if (monYearMatch) {
        const months: Record<string, string> = {
          JAN: '01', JANUARY: '01',
          FEB: '02', FEBRUARY: '02',
          MAR: '03', MARCH: '03',
          APR: '04', APRIL: '04',
          MAY: '05',
          JUN: '06', JUNE: '06',
          JUL: '07', JULY: '07',
          AUG: '08', AUGUST: '08',
          SEP: '09', SEPTEMBER: '09',
          OCT: '10', OCTOBER: '10',
          NOV: '11', NOVEMBER: '11',
          DEC: '12', DECEMBER: '12',
        };
        const m = months[monYearMatch[1].toUpperCase()] || '01';
        const y = monYearMatch[2];
        return `${y}-${m}-01`;
      }

      return dStr;
    };

    // Extract PAN number
    const panMatch = cleanText.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
    if (panMatch && (docType === 'PAN_CARD' || !fields.some(f => f.fieldName === 'pan_number'))) {
      fields.push({
        fieldName: 'pan_number',
        value: panMatch[1].toUpperCase(),
        confidence: 0.98,
        source: 'AI',
      });
    }

    // Extract Aadhaar last 4
    if (docType === 'AADHAAR_CARD' || aadhaarPatternFound) {
      let last4 = '';
      const fullMatch = cleanText.match(/\b\d{4}\s?\d{4}\s?(\d{4})\b/);
      if (fullMatch) {
        last4 = fullMatch[1];
      } else {
        const maskedMatch = cleanText.match(/\b(?:XXXX|\*{4})[\s\-]?(?:XXXX|\*{4})[\s\-]?(\d{4})\b/i);
        if (maskedMatch) {
          last4 = maskedMatch[1];
        } else {
          const genMatch = cleanText.match(aadhaarRegex);
          if (genMatch && genMatch[1]) {
            last4 = genMatch[1];
          }
        }
      }

      if (last4 && /^\d{4}$/.test(last4)) {
        fields.push({
          fieldName: 'aadhaar_last4',
          value: last4,
          confidence: 0.97,
          source: 'AI',
        });
      }
    }

    // Extract DOB
    const dobMatch = cleanText.match(/(?:DOB|Date of Birth|Birth Date|Birth|DOB\/Date of Birth|YOB|Year of Birth)[:\s]+([0-9A-Za-z\/\-\.\s]+)/i);
    if (dobMatch) {
      const rawDate = dobMatch[1].trim().split(/\n|\r/)[0].trim();
      const parsed = normalizeDate(rawDate);
      if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
        fields.push({
          fieldName: 'dob',
          value: parsed,
          confidence: 0.94,
          source: 'AI',
        });
      }
    } else if (docType === 'PAN_CARD' || docType === 'AADHAAR_CARD') {
      // Standalone date pattern on PAN or Aadhaar card
      const standaloneDateMatch = cleanText.match(/\b(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\b/);
      if (standaloneDateMatch) {
        const parsed = normalizeDate(standaloneDateMatch[1]);
        if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
          fields.push({
            fieldName: 'dob',
            value: parsed,
            confidence: 0.90,
            source: 'AI',
          });
        }
      }
    }

    // Extract Gender
    const genderMatch = cleanText.match(/\b(MALE|FEMALE|TRANSGENDER)\b/i);
    if (genderMatch && (docType === 'AADHAAR_CARD' || docType === 'DRIVING_LICENCE' || docType === 'OTHER')) {
      fields.push({
        fieldName: 'gender',
        value: genderMatch[1].toUpperCase(),
        confidence: 0.95,
        source: 'AI',
      });
    }

    // Extract Name
    const nameMatch = cleanText.match(/(?:Name|Full Name|Cardholder Name|Customer Name|Student Name|Applicant Name)[:\s]+([A-Za-z\s\.\-]+)/i);
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
    } else if (docType === 'PAN_CARD') {
      // In standard PAN scans, name often appears as the first prominent alphabetic line after Income Tax Department
      const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          /^[A-Z\s]{3,40}$/.test(line) &&
          !line.includes('INCOME') &&
          !line.includes('TAX') &&
          !line.includes('DEPARTMENT') &&
          !line.includes('GOVT') &&
          !line.includes('INDIA') &&
          !line.includes('PERMANENT') &&
          !line.includes('ACCOUNT') &&
          !line.includes('SIGNATURE')
        ) {
          fields.push({
            fieldName: 'name',
            value: line,
            confidence: 0.88,
            source: 'AI',
          });
          break;
        }
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

    // Extract Address
    const addressMatch = cleanText.match(/(?:Address|Res Address|Residential Address|Billing Address|Permanent Address)[:\s]+([\s\S]+?)(?=\b\d{6}\b|Phone|Mobile|Tel|Email|Date|\n\n|$)/i);
    if (addressMatch) {
      const addrVal = addressMatch[1].trim().replace(/\r?\n/g, ', ').replace(/\s+/g, ' ');
      if (addrVal.length > 5) {
        fields.push({
          fieldName: 'address',
          value: addrVal,
          confidence: 0.90,
          source: 'AI',
        });
      }
    } else {
      // Look for lines containing typical Indian street/locality markers
      const addrLines = cleanText
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => /\b(Road|Street|Marg|Nagar|Colony|Sector|Plot|Flat|Floor|Enclave|Delhi|Mumbai|Bangalore|Kolkata|Chennai|Hyderabad|Pune|Gurgaon|Noida|Bawana|Shahbad)\b/i.test(l));

      if (addrLines.length > 0) {
        fields.push({
          fieldName: 'address',
          value: addrLines.join(', ').replace(/\s+/g, ' '),
          confidence: 0.86,
          source: 'AI',
        });
      }
    }

    // Extract Document Date / Statement Date / Bill Date
    const docDateMatch = cleanText.match(/(?:Bill Date|Statement Date|Invoice Date|Issue Date|Date of Issue|Date)[:\s]+([0-9A-Za-z\/\-\.\s]+)/i);
    if (docDateMatch && (docType === 'ELECTRICITY_BILL' || docType === 'BANK_STATEMENT' || docType === 'OTHER')) {
      const raw = docDateMatch[1].trim().split(/\n|\r/)[0].trim();
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

    // Extract Valid Until / Expiry Date
    const validUntilMatch = cleanText.match(/(?:Valid Till|Valid Until|Valid Upto|Expiry Date|Expires|Valid Up to)[:\s]+([0-9A-Za-z\/\-\.\s]+)/i);
    if (validUntilMatch) {
      const raw = validUntilMatch[1].trim().split(/\n|\r/)[0].trim();
      // Handle range like "Jul 2023 to May 2027" -> extract "May 2027"
      const toMatch = raw.match(/to\s+([0-9A-Za-z\/\-\.\s]+)/i);
      const targetStr = toMatch ? toMatch[1].trim() : raw;
      const parsed = normalizeDate(targetStr);
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
