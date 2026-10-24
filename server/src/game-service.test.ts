import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GameService } from "./game-service.js";
import { openGameDatabase } from "./persistence/database.js";
import { SqliteGameSessionRepository } from "./persistence/game-repository.js";
import type Database from "better-sqlite3";

const resources: Array<{ database: Database.Database; directory: string }> = [];

afterEach(() => {
  for (const { database, directory } of resources.splice(0)) {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

const makeService = () => {
  const directory = mkdtempSync(join(tmpdir(), "tic-tac-toe-service-"));
  const database = openGameDatabase(join(directory, "games.sqlite"));
  resources.push({ database, directory });
  return new GameService(new SqliteGameSessionRepository(database));
};

describe("GameService", () => {
  it("creates a game and reports missing sessions clearly", () => {
    const service = makeService();
    const game = service.createGame();

    expect(game.state.status).toBe("active");
    expect(service.getGame("missing-game")).toBeNull();
    expect(
      service.makeMove("missing-game", { player: "X", row: 1, column: 1 }),
    ).toEqual({
      ok: false,
      error: {
        code: "GAME_NOT_FOUND",
        message: "Game 'missing-game' was not found.",
      },
    });
  });

  it("persists valid moves and leaves storage unchanged for invalid moves", () => {
    const service = makeService();
    const game = service.createGame();

    expect(
      service.makeMove(game.id, { player: "O", row: 1, column: 1 }),
    ).toMatchObject({
      ok: false,
      error: { code: "WRONG_TURN" },
    });
    expect(service.getGame(game.id)).toEqual(game);

    const result = service.makeMove(game.id, {
      player: "X",
      row: 1,
      column: 1,
    });
    expect(result.ok).toBe(true);
    expect(service.getGame(game.id)?.moveHistory).toEqual([
      { player: "X", row: 1, column: 1 },
    ]);
  });
});
