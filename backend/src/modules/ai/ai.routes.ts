import { Router } from 'express';
import { transcribeMeetingHandler } from './ai.controller';

const router = Router();

// POST /api/ai/transcribe - Transcribe latest meeting recording
router.post('/transcribe', transcribeMeetingHandler);

export default router;

