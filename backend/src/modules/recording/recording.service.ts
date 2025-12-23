import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);
const stat = promisify(fs.stat);
const recordingsDir = path.join(process.cwd(), 'uploads', 'recordings');

interface RecordingMeta {
  meetingCode: string;
  filePath: string;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
}

const activeRecordings = new Map<string, RecordingMeta>();
const completedRecordings = new Map<string, RecordingMeta[]>();

/**
 * Ensure the recordings directory exists.
 */
async function ensureRecordingDir() {
  try {
    await access(recordingsDir, fs.constants.F_OK);
  } catch {
    await mkdir(recordingsDir, { recursive: true });
  }
}

/**
 * Start server-side (or server-assisted) recording for a meeting.
 * If LiveKit cloud/server recording is not configured, this creates a mock
 * placeholder audio file to keep the flow unblocked.
 */
export async function startRecording(meetingCode: string): Promise<RecordingMeta> {
  await ensureRecordingDir();

  // Reuse active recording if one already exists
  const existing = activeRecordings.get(meetingCode);
  if (existing) {
    return existing;
  }

  const timestamp = Date.now();
  const filename = `${meetingCode}_${timestamp}.mp3`;
  const filePath = path.join(recordingsDir, filename);

  // Placeholder content for mocked recording. LiveKit hooks can replace this.
  await writeFile(
    filePath,
    `Mock audio placeholder for meeting ${meetingCode} at ${new Date(timestamp).toISOString()}\n` +
      'Speaker diarization added in Day 7\n' +
      'Summary generation added in Day 7\n' +
      'Audio summary (TTS) added in Day 8\n'
  );

  const meta: RecordingMeta = {
    meetingCode,
    filePath,
    startedAt: new Date(timestamp),
  };

  activeRecordings.set(meetingCode, meta);
  return meta;
}

/**
 * Stop recording and capture duration metadata.
 */
export async function stopRecording(meetingCode: string): Promise<RecordingMeta | null> {
  const active = activeRecordings.get(meetingCode);
  if (!active) {
    return null;
  }

  const endedAt = new Date();
  const durationSeconds = Math.max(
    1,
    Math.round((endedAt.getTime() - active.startedAt.getTime()) / 1000)
  );

  const meta: RecordingMeta = {
    ...active,
    endedAt,
    durationSeconds,
  };

  const history = completedRecordings.get(meetingCode) ?? [];
  history.push(meta);
  completedRecordings.set(meetingCode, history);
  activeRecordings.delete(meetingCode);

  return meta;
}

/**
 * Return the latest recording file path for a meeting.
 * Falls back to filesystem scan so it works across restarts.
 */
export async function getLatestRecordingForMeeting(meetingCode: string): Promise<RecordingMeta | null> {
  // Check in-memory history first
  const history = completedRecordings.get(meetingCode);
  if (history && history.length > 0) {
    const latest = history[history.length - 1];
    return latest;
  }

  // If a recording is still active, return it
  const active = activeRecordings.get(meetingCode);
  if (active) {
    return active;
  }

  // Scan directory for files matching meeting code
  try {
    await ensureRecordingDir();
    const files = await promisify(fs.readdir)(recordingsDir);
    const matching = await Promise.all(
      files
        .filter((file) => file.startsWith(`${meetingCode}_`) && file.endsWith('.mp3'))
        .map(async (file) => {
          const filePath = path.join(recordingsDir, file);
          const info = await stat(filePath);
          return { file, filePath, mtime: info.mtime };
        })
    );

    if (matching.length === 0) {
      return null;
    }

    const latest = matching.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())[0];
    return {
      meetingCode,
      filePath: latest.filePath,
      startedAt: latest.mtime,
      endedAt: latest.mtime,
      durationSeconds: undefined,
    };
  } catch (err) {
    console.error('Failed to locate recording for meeting', meetingCode, err);
    return null;
  }
}

/**
 * Utility to expose recording storage path for other modules.
 */
export function getRecordingDirectory() {
  return recordingsDir;
}

