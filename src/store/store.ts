import { configureStore } from '@reduxjs/toolkit';
import gameReducer from './gameSlice';
import scoreboardReducer from './scoreboardSlice';

export const createAppStore = () =>
  configureStore({
    reducer: {
      game: gameReducer,
      scoreboard: scoreboardReducer,
    },
  });

export const store = createAppStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
