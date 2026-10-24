import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { GameResponse, Mode } from '../api/types';

export interface GameState {
  mode: Mode;
  gameId: string;
  game: GameResponse | null;
  loading: boolean;
  pendingMove: boolean;
  pendingUndo: boolean;
  error: string | null;
  undoMessage: string | null;
}

const initialState: GameState = {
  mode: 'two-player',
  gameId: '',
  game: null,
  loading: false,
  pendingMove: false,
  pendingUndo: false,
  error: null,
  undoMessage: null,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setMode: (state, action: PayloadAction<Mode>) => {
      state.mode = action.payload;
    },
    setGameId: (state, action: PayloadAction<string>) => {
      state.gameId = action.payload;
    },
    setGame: (state, action: PayloadAction<GameResponse | null>) => {
      state.game = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setPendingMove: (state, action: PayloadAction<boolean>) => {
      state.pendingMove = action.payload;
    },
    setPendingUndo: (state, action: PayloadAction<boolean>) => {
      state.pendingUndo = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setUndoMessage: (state, action: PayloadAction<string | null>) => {
      state.undoMessage = action.payload;
    },
  },
});

export const {
  setError,
  setGame,
  setGameId,
  setLoading,
  setMode,
  setPendingMove,
  setPendingUndo,
  setUndoMessage,
} = gameSlice.actions;

export default gameSlice.reducer;
