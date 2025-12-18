export interface Meeting {
  id: string;
  title: string;
  meetingCode: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TranscriptSummary {
  id: string;
  meetingId: string;
  summary: string;
  createdAt: string;
}


