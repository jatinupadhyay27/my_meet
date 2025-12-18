import { prisma } from '../../config/db';
import { generateMeetingCode } from '../../utils/generateMeetingCode';
import { hashPassword, comparePassword } from '../../utils/hash';

export interface CreateMeetingInput {
  title: string;
  password?: string;
  scheduledAt?: string;
}

export interface JoinMeetingInput {
  meetingCode: string;
  password?: string;
}

/**
 * Create a new meeting
 */
export async function createMeeting(input: CreateMeetingInput) {
  // Generate unique meeting code
  let meetingCode: string;
  let isUnique = false;
  
  // Ensure meeting code is unique
  while (!isUnique) {
    meetingCode = generateMeetingCode();
    const existing = await prisma.meeting.findUnique({
      where: { meetingCode },
    });
    if (!existing) {
      isUnique = true;
    }
  }

  // Hash password if provided
  const hashedPassword = input.password
    ? await hashPassword(input.password)
    : null;

  // Create meeting
  const meeting = await prisma.meeting.create({
    data: {
      title: input.title,
      meetingCode: meetingCode!,
      password: hashedPassword,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
    },
  });

  return {
    id: meeting.id,
    meetingCode: meeting.meetingCode,
    title: meeting.title,
    scheduledAt: meeting.scheduledAt,
    createdAt: meeting.createdAt,
  };
}

/**
 * Validate meeting code and password for joining
 */
export async function validateMeetingJoin(input: JoinMeetingInput) {
  const meeting = await prisma.meeting.findUnique({
    where: { meetingCode: input.meetingCode },
  });

  if (!meeting) {
    throw new Error('Meeting not found');
  }

  // Check password if meeting has one
  if (meeting.password) {
    if (!input.password) {
      throw new Error('Password required');
    }
    
    const isValid = await comparePassword(input.password, meeting.password);
    if (!isValid) {
      throw new Error('Invalid password');
    }
  }

  return {
    id: meeting.id,
    meetingCode: meeting.meetingCode,
    title: meeting.title,
    scheduledAt: meeting.scheduledAt,
    createdAt: meeting.createdAt,
  };
}

/**
 * Get meeting details by meeting code (without password)
 */
export async function getMeetingByCode(meetingCode: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { meetingCode },
  });

  if (!meeting) {
    throw new Error('Meeting not found');
  }

  // Return meeting without password, but include hasPassword flag
  return {
    id: meeting.id,
    title: meeting.title,
    meetingCode: meeting.meetingCode,
    scheduledAt: meeting.scheduledAt,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
    hasPassword: !!meeting.password, // Indicate if password is required
  };
}

