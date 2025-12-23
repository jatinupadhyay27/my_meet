import fs from 'fs/promises';
import path from 'path';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  durationSeconds?: number;
  source: string;
  segments: TranscriptSegment[];
}

export interface TranscriptionProvider {
  transcribe(filePath: string): Promise<TranscriptionResult>;
}

/**
 * Mock Whisper provider used until a real AI service key is configured.
 * Swap this class with a real provider implementation without changing callers.
 */
class MockWhisperProvider implements TranscriptionProvider {
  async transcribe(filePath: string): Promise<TranscriptionResult> {
    const base = path.basename(filePath);
    const stats = await fs.stat(filePath);
    const durationSeconds = Math.max(30, Math.round(stats.size / 1000));

    return {
      text: `This is a mocked transcript for ${base}. Replace MockWhisperProvider with a real Whisper/OpenAI client.`,
      language: 'en',
      durationSeconds,
      source: 'whisper-mock',
      segments: [
        { start: 0, end: 5, text: 'Meeting recording placeholder begins.' },
        { start: 5, end: 12, text: 'Speaker diarization added in Day 7.' },
        { start: 12, end: 20, text: 'Summary generation added in Day 7.' },
        { start: 20, end: 28, text: 'Audio summary (TTS) added in Day 8.' },
      ],
    };
  }
}

let provider: TranscriptionProvider = new MockWhisperProvider();

export function setTranscriptionProvider(customProvider: TranscriptionProvider) {
  provider = customProvider;
}

export async function transcribeAudio(filePath: string): Promise<TranscriptionResult> {
  await fs.access(filePath);
  return provider.transcribe(filePath);
}

