import { Router } from 'express';
import { generateTokenHandler } from './webrtc.controller';

const router = Router();

// POST /api/webrtc/token - Generate LiveKit access token
router.post('/token', generateTokenHandler);

export default router;


