import { Router } from 'express';
import healthRouter from './health.routes';
import meetingsRouter from '../modules/meetings/meetings.routes';

const router = Router();

router.use('/', healthRouter);
router.use('/meetings', meetingsRouter);

export default router;


