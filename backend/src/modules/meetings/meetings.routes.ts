import { Router } from 'express';
import {
  createMeetingHandler,
  joinMeetingHandler,
  getMeetingHandler,
} from './meetings.controller';

const router = Router();

// POST /api/meetings - Create a new meeting
router.post('/', createMeetingHandler);

// POST /api/meetings/join - Validate meeting code and password
router.post('/join', joinMeetingHandler);

// GET /api/meetings/:meetingCode - Get meeting details
router.get('/:meetingCode', getMeetingHandler);

export default router;
