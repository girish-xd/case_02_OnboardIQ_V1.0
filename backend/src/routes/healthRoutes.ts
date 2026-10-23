import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { extractionService } from '../services/extraction/extractionService.js';
import { getRulesConfig } from '../config/rulesConfig.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED';
  const config = getRulesConfig();

  res.json({
    status: 'HEALTHY',
    service: 'OnboardIQ API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    extractionProvider: extractionService.getActiveProviderName(),
    rulesConfigVersion: config.version,
  });
});

export default router;
