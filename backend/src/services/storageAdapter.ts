import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface SavedFileResult {
  fileName: string;
  fileHash: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  text?: string;
}

export class LocalSecureStorageAdapter {
  private baseDir: string;

  constructor(customDir?: string) {
    this.baseDir = customDir || path.resolve(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public saveDocument(
    docId: string,
    originalName: string,
    buffer: Buffer,
    mimeType: string
  ): SavedFileResult {
    // Check max size: 1 MB as per Section 4
    const maxSize = 1 * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw new Error(`File size ${buffer.length} bytes exceeds 1 MB maximum limit.`);
    }

    // Security validation against executable headers / dangerous extensions
    const ext = path.extname(originalName).toLowerCase();
    const allowedExts = ['.txt', '.pdf', '.png', '.jpg', '.jpeg'];
    if (!allowedExts.includes(ext)) {
      throw new Error(`Invalid file extension: ${ext}. Allowed extensions: .txt, .pdf, .png, .jpg, .jpeg`);
    }

    // Check for executable magic bytes (e.g., MZ header for .exe or ELF)
    if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
      throw new Error('Malformed file: Windows executable binary detected.');
    }
    if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
      throw new Error('Malformed file: ELF executable binary detected.');
    }

    // Compute SHA-256 hash
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Safe filename
    const safeName = `${docId}_${hash.substring(0, 12)}${ext}`;
    const fullPath = path.join(this.baseDir, safeName);

    fs.writeFileSync(fullPath, buffer);

    let textContent = '';
    if (ext === '.txt') {
      try {
        textContent = buffer.toString('utf-8');
      } catch (e) {
        // Not valid utf-8
        throw new Error('Invalid file encoding: must be valid UTF-8 text.');
      }
    }

    return {
      fileName: originalName,
      fileHash: hash,
      fileSize: buffer.length,
      mimeType,
      storagePath: fullPath,
      text: textContent,
    };
  }

  public getDocumentBuffer(storagePath: string): Buffer {
    if (!fs.existsSync(storagePath)) {
      throw new Error('Document file not found on disk.');
    }
    return fs.readFileSync(storagePath);
  }
}

export const documentStorage = new LocalSecureStorageAdapter();
