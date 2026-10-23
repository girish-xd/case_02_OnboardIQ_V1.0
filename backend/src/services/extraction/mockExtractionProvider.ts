import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { DeclaredDocType, ExtractedField } from '../../types/index.js';
import { IExtractionProvider, ExtractionResult } from './types.js';

export class MockExtractionProvider implements IExtractionProvider {
  public name = 'mock';
  private mockStore: Map<string, { docType: DeclaredDocType; docTypeConf: number; fields: ExtractedField[] }> = new Map();

  constructor() {
    this.loadMockFiles();
  }

  private loadMockFiles() {
    const filesToLoad = [
      path.resolve(process.cwd(), 'case_02_extraction_mock_sample_V1.0.csv'),
      path.resolve(process.cwd(), '..', 'case_02_extraction_mock_sample_V1.0.csv'),
      path.resolve(process.cwd(), 'docs', 'source', 'case_02_extraction_mock_sample_V1.0.csv'),
      path.resolve(process.cwd(), 'case_02_extraction_mock_eval_V1.0.csv'),
      path.resolve(process.cwd(), '..', 'case_02_extraction_mock_eval_V1.0.csv'),
      path.resolve(process.cwd(), 'docs', 'source', 'case_02_extraction_mock_eval_V1.0.csv'),
    ];

    for (const file of filesToLoad) {
      if (fs.existsSync(file)) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const records: Array<{ doc_id: string; field_name: string; value: string; confidence: string }> = parse(
            content,
            { columns: true, skip_empty_lines: true }
          );

          for (const row of records) {
            const docId = row.doc_id.trim();
            if (!this.mockStore.has(docId)) {
              this.mockStore.set(docId, {
                docType: 'OTHER',
                docTypeConf: 0.0,
                fields: [],
              });
            }

            const item = this.mockStore.get(docId)!;
            const fieldName = row.field_name.trim();
            const val = row.value !== undefined ? String(row.value).trim() : '';
            const conf = parseFloat(row.confidence) || 0.0;

            if (fieldName === 'doc_type') {
              item.docType = val as DeclaredDocType;
              item.docTypeConf = conf;
            } else {
              item.fields.push({
                fieldName,
                value: val,
                confidence: conf,
                source: 'MOCK',
              });
            }
          }
        } catch (err) {
          console.warn(`[MockExtractionProvider] Could not load ${file}:`, err);
        }
      }
    }
  }

  public async extract(
    docId: string,
    _text?: string,
    _declaredDocType?: DeclaredDocType
  ): Promise<ExtractionResult> {
    const mockData = this.mockStore.get(docId);
    if (!mockData) {
      // Unknown document returns doc_type OTHER with confidence 0.00 as per Section 5 (FR-3)
      return {
        docId,
        docType: 'OTHER',
        docTypeConfidence: 0.0,
        fields: [],
      };
    }

    return {
      docId,
      docType: mockData.docType,
      docTypeConfidence: mockData.docTypeConf,
      fields: [...mockData.fields],
    };
  }
}
