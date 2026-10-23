import { DeclaredDocType, ExtractedField } from '../../types/index.js';

export interface ExtractionResult {
  docId: string;
  docType: DeclaredDocType;
  docTypeConfidence: number;
  fields: ExtractedField[];
}

export interface IExtractionProvider {
  name: string;
  extract(docId: string, text?: string, declaredDocType?: DeclaredDocType): Promise<ExtractionResult>;
}
