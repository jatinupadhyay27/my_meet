import { post, get } from '../utils/apiClient';
import { Meeting } from '../../../shared/types';

export interface CreateMeetingRequest {
  title: string;
  password?: string;
  scheduledAt?: string;
}

export interface CreateMeetingResponse {
  meetingCode: string;
  joinUrl: string;
  meeting: Meeting;
}

export interface JoinMeetingRequest {
  meetingCode: string;
  password?: string;
}

export interface JoinMeetingResponse {
  success: boolean;
  meetingId: string;
  meetingCode: string;
  meeting: Meeting;
}

export interface MeetingDetails {
  id: string;
  title: string;
  meetingCode: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt?: string;
  hasPassword: boolean;
}

/**
 * Create a new meeting
 */
export async function createMeeting(
  data: CreateMeetingRequest
): Promise<CreateMeetingResponse> {
  return post<CreateMeetingResponse>('/meetings', data);
}

/**
 * Join a meeting (validate meeting code and password)
 */
export async function joinMeeting(
  data: JoinMeetingRequest
): Promise<JoinMeetingResponse> {
  return post<JoinMeetingResponse>('/meetings/join', data);
}

/**
 * Get meeting details by meeting code
 */
export async function getMeetingByCode(
  meetingCode: string
): Promise<MeetingDetails> {
  return get<MeetingDetails>(`/meetings/${meetingCode}`);
}

