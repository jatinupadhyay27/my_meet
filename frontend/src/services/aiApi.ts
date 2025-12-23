import { post } from '../utils/apiClient';
import { Transcript } from '../../../shared/types';

export interface TranscribeMeetingResponse {
  transcript: Transcript;
  text: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  message?: string;
}

export async function transcribeMeeting(meetingCode: string): Promise<TranscribeMeetingResponse> {
  return post<TranscribeMeetingResponse>('/ai/transcribe', { meetingCode });
}

