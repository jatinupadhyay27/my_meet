import { Request, Response } from 'express';
import path from 'path';
import { transcribeAudio } from './ai.transcription.service';
import { getLatestRecordingForMeeting } from '../recording/recording.service';
import { getMeetingByCode } from '../meetings/meetings.service';
import { prisma } from '../../config/db';

/**
 * POST /api/ai/transcribe
 * Body: { meetingCode: string }
 *
 * Workflow:
 * 1) Locate latest recording file for meetingCode
 * 2) Send audio to AI transcription provider (mocked Whisper)
 * 3) Persist transcript in DB
 * 4) Return transcript text and segments
 */
export async function transcribeMeetingHandler(req: Request, res: Response) {
  try {
    const { meetingCode } = req.body as { meetingCode?: string };
    if (!meetingCode || typeof meetingCode !== 'string') {
      return res.status(400).json({ error: 'meetingCode is required' });
    }

    const meeting = await getMeetingByCode(meetingCode.trim());

    const recording = await getLatestRecordingForMeeting(meetingCode.trim());
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found for this meeting' });
    }

    const absolutePath = path.resolve(recording.filePath);
    const result = await transcribeAudio(absolutePath);

    const saved = await prisma.transcript.create({
      data: {
        meetingId: meeting.id,
        rawText: result.text,
        language: result.language,
        duration: result.durationSeconds,
        source: result.source,
      },
    });

    return res.json({
      transcript: saved,
      text: result.text,
      segments: result.segments,
      message: 'Transcription complete',
    });
  } catch (error) {
    console.error('Transcription failed', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('ENOENT')) {
      return res.status(404).json({ error: 'Audio file missing for transcription' });
    }
    return res.status(500).json({ error: 'Failed to transcribe audio', message });
  }
}


