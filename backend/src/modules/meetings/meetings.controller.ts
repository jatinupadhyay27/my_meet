import { Request, Response } from 'express';
import {
  createMeeting,
  validateMeetingJoin,
  getMeetingByCode,
} from './meetings.service';

/**
 * POST /api/meetings
 * Create a new meeting
 */
export async function createMeetingHandler(req: Request, res: Response) {
  try {
    const { title, password, scheduledAt } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const meeting = await createMeeting({
      title: title.trim(),
      password,
      scheduledAt,
    });

    // Generate join URL
    const joinUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/meet/${meeting.meetingCode}`;

    return res.status(201).json({
      meetingCode: meeting.meetingCode,
      joinUrl,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        scheduledAt: meeting.scheduledAt,
        createdAt: meeting.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return res.status(500).json({
      error: 'Failed to create meeting',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/meetings/join
 * Validate meeting code and password for joining
 */
export async function joinMeetingHandler(req: Request, res: Response) {
  try {
    const { meetingCode, password } = req.body;

    if (!meetingCode || typeof meetingCode !== 'string') {
      return res.status(400).json({ error: 'Meeting code is required' });
    }

    const meeting = await validateMeetingJoin({
      meetingCode: meetingCode.trim(),
      password,
    });

    return res.json({
      success: true,
      meetingId: meeting.id,
      meetingCode: meeting.meetingCode,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        scheduledAt: meeting.scheduledAt,
        createdAt: meeting.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message === 'Meeting not found') {
      return res.status(404).json({ error: message });
    }
    
    if (message === 'Password required' || message === 'Invalid password') {
      return res.status(401).json({ error: message });
    }

    console.error('Error joining meeting:', error);
    return res.status(500).json({
      error: 'Failed to join meeting',
      message,
    });
  }
}

/**
 * GET /api/meetings/:meetingCode
 * Get meeting details (without password)
 */
export async function getMeetingHandler(req: Request, res: Response) {
  try {
    const { meetingCode } = req.params;

    if (!meetingCode) {
      return res.status(400).json({ error: 'Meeting code is required' });
    }

    const meeting = await getMeetingByCode(meetingCode);

    return res.json(meeting);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message === 'Meeting not found') {
      return res.status(404).json({ error: message });
    }

    console.error('Error fetching meeting:', error);
    return res.status(500).json({
      error: 'Failed to fetch meeting',
      message,
    });
  }
}
