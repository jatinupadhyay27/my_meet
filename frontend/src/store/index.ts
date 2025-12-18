import { configureStore } from '@reduxjs/toolkit';
import meetingReducer from './slices/meetingSlice';

export const store = configureStore({
  reducer: {
    meeting: meetingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

