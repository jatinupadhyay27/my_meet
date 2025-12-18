import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Meeting } from '../../../../shared/types';

interface MeetingState {
  currentMeeting: Meeting | null;
  meetingCode: string | null;
  isHost: boolean; // true if user created the meeting, false if joined
  joinUrl: string | null;
}

const initialState: MeetingState = {
  currentMeeting: null,
  meetingCode: null,
  isHost: false,
  joinUrl: null,
};

const meetingSlice = createSlice({
  name: 'meeting',
  initialState,
  reducers: {
    setMeetingAsHost: (state, action: PayloadAction<{ meeting: Meeting; meetingCode: string; joinUrl: string }>) => {
      state.currentMeeting = action.payload.meeting;
      state.meetingCode = action.payload.meetingCode;
      state.joinUrl = action.payload.joinUrl;
      state.isHost = true;
    },
    setMeetingAsParticipant: (state, action: PayloadAction<{ meeting: Meeting; meetingCode: string }>) => {
      state.currentMeeting = action.payload.meeting;
      state.meetingCode = action.payload.meetingCode;
      state.isHost = false;
      state.joinUrl = null;
    },
    clearMeeting: (state) => {
      state.currentMeeting = null;
      state.meetingCode = null;
      state.isHost = false;
      state.joinUrl = null;
    },
  },
});

export const { setMeetingAsHost, setMeetingAsParticipant, clearMeeting } = meetingSlice.actions;
export default meetingSlice.reducer;

