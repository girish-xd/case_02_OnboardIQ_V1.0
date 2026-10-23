import { IExtractionProvider, ExtractionResult } from './types.js';
import { MockExtractionProvider } from './mockExtractionProvider.js';
import { RuleBasedAIExtractor } from './ruleBasedAIExtractor.js';
import { DocumentModel } from '../../models/Document.js';
import { Extraction } from '../../models/Extraction.js';
import { DeclaredDocType } from '../../types/index.js';

export class ExtractionService {
  private providers: Map<string, IExtractionProvider> = new Map();
  private activeProviderName: string = 'mock';

  constructor() {
    const mock = new MockExtractionProvider();
    const ai = new RuleBasedAIExtractor();
    this.providers.set('mock', mock);
    this.providers.set('ai', ai);

    const configured = process.env.EXTRACTION_PROVIDER?.toLowerCase();
    if (configured && this.providers.has(configured)) {
      this.activeProviderName = configured;
    }
  }

  public getActiveProviderName(): string {
    return this.activeProviderName;
  }

  public setProvider(name: 'mock' | 'ai'): void {
    if (this.providers.has(name)) {
      this.activeProviderName = name;
      console.log(`[ExtractionService] Active extraction provider set to: ${name}`);
    } else {
      throw new Error(`Unknown extraction provider: ${name}`);
    }
  }

  public async extractDocument(
    docId: string,
    text?: string,
    declaredDocType?: DeclaredDocType,
    applicationId?: string
  ): Promise<ExtractionResult> {
    const provider = this.providers.get(this.activeProviderName)!;

    // 10-second timeout safeguard as per Section 6.2 (AI-3)
    const timeoutPromise = new Promise<ExtractionResult>((_, reject) => {
      setTimeout(() => reject(new Error('Extraction timed out after 10 seconds.')), 10000);
    });

    let result: ExtractionResult;
    try {
      result = await Promise.race([
        provider.extract(docId, text, declaredDocType),
        timeoutPromise,
      ]);
    } catch (err) {
      console.error(`[ExtractionService] Extraction failure for doc ${docId}:`, err);
      // Fallback on error/timeout: doc_type OTHER, confidence 0
      result = {
        docId,
        docType: 'OTHER',
        docTypeConfidence: 0.0,
        fields: [],
      };
    }

    // Persist or update DocumentModel record
    if (docId) {
      await DocumentModel.findOneAndUpdate(
        { docId },
        {
          classifiedDocType: result.docType,
          docTypeConfidence: result.docTypeConfidence,
        },
        { upsert: false }
      );
    }

    // Persist extractions in database
    if (applicationId) {
      // Clean previous non-officer extractions for this document
      await Extraction.deleteMany({ docId, source: { $ne: 'OFFICER' } });

      const recordsToInsert = result.fields.map((f) => ({
        docId,
        applicationId,
        fieldName: f.fieldName,
        value: f.value,
        confidence: f.confidence,
        source: f.source || (this.activeProviderName === 'ai' ? 'AI' : 'MOCK'),
      }));

      if (recordsToInsert.length > 0) {
        await Extraction.insertMany(recordsToInsert);
      }
    }

    return result;
  }
}

export const extractionService = new ExtractionService();
