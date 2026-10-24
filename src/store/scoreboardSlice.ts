import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Scoreboard } from '../api/types';

export interface ScoreboardState {
  scoreboard: Scoreboard | null;
  loading: boolean;
  pendingReset: boolean;
  error: string | null;
}

const initialState: ScoreboardState = {
  scoreboard: null,
  loading: true,
  pendingReset: false,
  error: null,
};

const scoreboardSlice = createSlice({
  name: 'scoreboard',
  initialState,
  reducers: {
    setScoreboard: (state, action: PayloadAction<Scoreboard | null>) => {
      state.scoreboard = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setPendingReset: (state, action: PayloadAction<boolean>) => {
      state.pendingReset = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setError,
  setLoading,
  setPendingReset,
  setScoreboard,
} = scoreboardSlice.actions;

export default scoreboardSlice.reducer;
