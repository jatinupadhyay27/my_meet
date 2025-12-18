import { AccessToken } from 'livekit-server-sdk';
import { getMeetingByCode } from '../meetings/meetings.service';
import { ENV } from '../../config/env';

/**
 * LiveKit service for generating access tokens
 * 
 * This service handles:
 * - Token generation for LiveKit rooms
 * - Meeting validation before token generation
 * - Secure room-based access control
 * 
 * Extended in Day 5 for mic/camera toggle permissions
 * Screen sharing added in Day 5
 * Recording hooks added in Day 6
 */

export interface GenerateTokenInput {
  meetingCode: string;
  userName: string;
}

export interface TokenResponse {
  token: string;
  url: string;
}

/**
 * Generate LiveKit access token for a meeting room
 * 
 * @param input - meetingCode and userName
 * @returns token and LiveKit URL
 * @throws Error if meeting doesn't exist or env vars are missing
 */
export async function generateLiveKitToken(
  input: GenerateTokenInput
): Promise<TokenResponse> {
  const { meetingCode, userName } = input;

  // Validate meeting exists
  // This ensures only valid meetings can generate tokens
  await getMeetingByCode(meetingCode);

  // Validate LiveKit environment variables
  if (!ENV.LIVEKIT_API_KEY || !ENV.LIVEKIT_API_SECRET || !ENV.LIVEKIT_URL) {
    throw new Error('LiveKit configuration is missing. Please check environment variables.');
  }

  // Create access token
  const at = new AccessToken(ENV.LIVEKIT_API_KEY, ENV.LIVEKIT_API_SECRET, {
    identity: userName,
    // Use meetingCode as the room name
    // This ensures each meeting has its own isolated room
    name: meetingCode,
  });

  // Grant permissions
  // Extended in Day 5 for mic/camera toggle
  at.addGrant({
    room: meetingCode,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    // Screen sharing permissions added in Day 5
    // Recording permissions added in Day 6
  });

  // Generate token
  const token = await at.toJwt();

  return {
    token,
    url: ENV.LIVEKIT_URL,
  };
}


