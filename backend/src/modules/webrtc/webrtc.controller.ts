import { Request, Response } from 'express';
import { generateLiveKitToken } from './livekit.service';

/**
 * POST /api/webrtc/token
 * Generate LiveKit access token for joining a video room
 * 
 * Request body:
 * {
 *   meetingCode: string,
 *   userName: string
 * }
 * 
 * Response:
 * {
 *   token: string,
 *   url: string
 * }
 */
export async function generateTokenHandler(req: Request, res: Response) {
  try {
    const { meetingCode, userName } = req.body;

    // Validate input
    if (!meetingCode || typeof meetingCode !== 'string' || meetingCode.trim().length === 0) {
      return res.status(400).json({ error: 'meetingCode is required' });
    }

    if (!userName || typeof userName !== 'string' || userName.trim().length === 0) {
      return res.status(400).json({ error: 'userName is required' });
    }

    // Generate token
    // This will validate that the meeting exists before generating token
    const result = await generateLiveKitToken({
      meetingCode: meetingCode.trim(),
      userName: userName.trim(),
    });

    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Meeting validation errors
    if (message === 'Meeting not found') {
      return res.status(404).json({ error: message });
    }

    // LiveKit configuration errors
    if (message.includes('LiveKit configuration')) {
      return res.status(500).json({ error: message });
    }

    console.error('Error generating LiveKit token:', error);
    return res.status(500).json({
      error: 'Failed to generate token',
      message,
    });
  }
}


