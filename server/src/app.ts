import { createApp } from "./api.js";
import { GameService } from "./game-service.js";
import { openGameDatabase } from "./persistence/database.js";
import { SqliteGameSessionRepository } from "./persistence/game-repository.js";

const database = openGameDatabase(
  process.env.DATABASE_PATH ?? "./data/tic-tac-toe.sqlite",
);
export const app = createApp(
  new GameService(new SqliteGameSessionRepository(database)),
);
