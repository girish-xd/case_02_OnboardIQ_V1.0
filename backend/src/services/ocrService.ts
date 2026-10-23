import path from 'path';
import pdf from 'pdf-parse';
import Tesseract from 'tesseract.js';

export class OcrService {
  /**
   * Clean and normalize OCR text, removing Tesseract / engine warnings
   */
  public cleanOcrText(text: string): string {
    if (!text) return '';

    const lines = text.split(/\r?\n/);
    const cleaned = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      // Filter out tesseract / font warnings
      if (trimmed.includes('Line cannot be recognized')) return false;
      if (trimmed.includes('Image too small to scale')) return false;
      if (trimmed.includes('-- 1 of 1 --') || trimmed.includes('-- Page 1 --')) return false;
      return true;
    });

    return cleaned.join('\n').trim();
  }

  /**
   * Extract text from PDF buffer
   * 1. Attempts fast digital stream extraction
   * 2. If text is empty or too short (scanned PDF), runs OCR on embedded images
   */
  public async extractFromPdf(buffer: Buffer): Promise<string> {
    try {
      const parser = new pdf.PDFParse({ data: buffer });

      // Step 1: Try digital text stream
      let streamText = '';
      try {
        const textResult = await parser.getText();
        streamText = this.cleanOcrText(textResult?.text || '');
      } catch (e) {
        console.warn('[OCR] PDF digital stream text extraction failed, trying image OCR:', e);
      }

      // If text stream has substantial content (> 30 characters with words), use it
      const wordCount = streamText.split(/\s+/).filter((w) => w.length > 1).length;
      if (wordCount >= 5 && streamText.length >= 30) {
        await parser.destroy();
        return streamText;
      }

      // Step 2: Fallback to OCR on embedded images inside the PDF
      console.log('[OCR] PDF has minimal digital text stream. Extracting embedded images for OCR...');
      let ocrExtractedText = '';

      try {
        const imgResult = await parser.getImage();
        if (imgResult && imgResult.pages && imgResult.pages.length > 0) {
          for (const page of imgResult.pages) {
            if (page.images && page.images.length > 0) {
              for (const img of page.images) {
                // Skip small decorative icons, spacers or lines
                if (img.width && img.height && (img.width < 60 || img.height < 60)) {
                  continue;
                }
                const imageSource = img.dataUrl || (img.data ? Buffer.from(img.data) : null);
                if (!imageSource) continue;
                const { data: { text } } = await Tesseract.recognize(imageSource, 'eng');
                if (text && text.trim()) {
                  ocrExtractedText += (ocrExtractedText ? '\n\n' : '') + text.trim();
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[OCR] PDF image extraction for OCR encountered an error:', err);
      }

      await parser.destroy();

      const cleanedOcr = this.cleanOcrText(ocrExtractedText);
      return cleanedOcr || streamText;
    } catch (err) {
      console.error('[OCR] Fatal error during PDF text extraction:', err);
      return '';
    }
  }

  /**
   * Extract text from Image buffer (PNG, JPG, JPEG)
   */
  public async extractFromImage(buffer: Buffer): Promise<string> {
    try {
      console.log('[OCR] Running Tesseract OCR on image buffer...');
      const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
      return this.cleanOcrText(text || '');
    } catch (err) {
      console.error('[OCR] Error running OCR on image:', err);
      return '';
    }
  }

  /**
   * Universal text extraction for any supported file format
   */
  public async extractText(buffer: Buffer, originalName: string, mimeType?: string): Promise<string> {
    const ext = path.extname(originalName).toLowerCase();

    // 1. Plain Text
    if (ext === '.txt' || mimeType === 'text/plain') {
      try {
        return buffer.toString('utf-8');
      } catch (_) {
        return '';
      }
    }

    // 2. PDF Document
    if (ext === '.pdf' || mimeType === 'application/pdf') {
      return this.extractFromPdf(buffer);
    }

    // 3. Image Document (PNG, JPG, JPEG)
    if (['.png', '.jpg', '.jpeg'].includes(ext) || mimeType?.startsWith('image/')) {
      return this.extractFromImage(buffer);
    }

    return '';
  }
}

export const ocrService = new OcrService();
