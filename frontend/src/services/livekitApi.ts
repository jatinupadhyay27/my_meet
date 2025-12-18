import { post } from '../utils/apiClient';

export interface GenerateTokenRequest {
  meetingCode: string;
  userName: string;
}

export interface GenerateTokenResponse {
  token: string;
  url: string;
}

/**
 * Generate LiveKit access token for joining a video room
 */
export async function generateLiveKitToken(
  data: GenerateTokenRequest
): Promise<GenerateTokenResponse> {
  return post<GenerateTokenResponse>('/webrtc/token', data);
}


