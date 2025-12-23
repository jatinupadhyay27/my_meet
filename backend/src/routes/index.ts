import { Router } from 'express';
import healthRouter from './health.routes';
import meetingsRouter from '../modules/meetings/meetings.routes';
import webrtcRouter from '../modules/webrtc/webrtc.routes';
import aiRouter from '../modules/ai/ai.routes';

const router = Router();

router.use('/', healthRouter);
router.use('/meetings', meetingsRouter);
router.use('/webrtc', webrtcRouter);
router.use('/ai', aiRouter);

export default router;


