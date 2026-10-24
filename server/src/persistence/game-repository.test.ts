import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeGame, makeMove } from "../game-engine.js";
import { GameService } from "../game-service.js";
import { openGameDatabase } from "./database.js";
import { SqliteGameSessionRepository } from "./game-repository.js";
import type Database from "better-sqlite3";

const resources: Array<{ database: Database.Database; directory: string }> = [];

const createService = () => {
  const directory = mkdtempSync(join(tmpdir(), "tic-tac-toe-"));
  const database = openGameDatabase(join(directory, "games.sqlite"));
  resources.push({ database, directory });
  const repository = new SqliteGameSessionRepository(database);
  return { database, repository, service: new GameService(repository) };
};

afterEach(() => {
  for (const resource of resources.splice(0)) {
    resource.database.close();
    rmSync(resource.directory, { recursive: true, force: true });
  }
});

describe("SQLite game persistence", () => {
  it("creates and retrieves an empty game session", () => {
    const { service } = createService();
    const created = service.createGame();

    expect(service.getGame(created.id)).toEqual(created);
  });

  it("persists board state and move history across service instances", () => {
    const { database, service } = createService();
    const created = service.createGame();
    expect(
      service.makeMove(created.id, { player: "X", row: 1, column: 2 }).ok,
    ).toBe(true);
    expect(
      service.makeMove(created.id, { player: "O", row: 2, column: 3 }).ok,
    ).toBe(true);

    const secondService = new GameService(
      new SqliteGameSessionRepository(database),
    );
    const loaded = secondService.getGame(created.id);
    expect(loaded?.state.board).toEqual([
      null,
      "X",
      null,
      null,
      null,
      "O",
      null,
      null,
      null,
    ]);
    expect(loaded?.state.currentPlayer).toBe("X");
    expect(loaded?.moveHistory).toEqual([
      { player: "X", row: 1, column: 2 },
      { player: "O", row: 2, column: 3 },
    ]);
  });

  it("updates game and move history together in a transaction", () => {
    const { database, service } = createService();
    const created = service.createGame();
    const stateAfterFirstMove = makeMove(initializeGame(), {
      player: "X",
      row: 1,
      column: 1,
    });
    if (!stateAfterFirstMove.ok) throw new Error("Expected valid move.");
    service.makeMove(created.id, { player: "X", row: 1, column: 1 });

    database.exec(`
      CREATE TRIGGER fail_second_move BEFORE INSERT ON moves
      WHEN NEW.move_number = 2
      BEGIN SELECT RAISE(ABORT, 'forced test failure'); END;
    `);
    const nextState = makeMove(stateAfterFirstMove.state, {
      player: "O",
      row: 2,
      column: 2,
    });
    if (!nextState.ok) throw new Error("Expected valid move.");
    const repository = new SqliteGameSessionRepository(database);
    const before = repository.findById(created.id);
    expect(before).not.toBeNull();

    expect(() =>
      repository.save({
        ...before!,
        state: nextState.state,
        moveHistory: [
          ...before!.moveHistory,
          { player: "O", row: 2, column: 2 },
        ],
      }),
    ).toThrow("forced test failure");
    expect(repository.findById(created.id)).toEqual(before);
  });

  it("rejects a session whose history does not match its board before writing", () => {
    const { repository, service } = createService();
    const created = service.createGame();
    const result = makeMove(initializeGame(), {
      player: "X",
      row: 1,
      column: 1,
    });
    if (!result.ok) throw new Error("Expected valid move.");

    expect(() =>
      repository.save({ ...created, state: result.state, moveHistory: [] }),
    ).toThrow("Move history does not match the board.");
    expect(repository.findById(created.id)).toEqual(created);
  });
});
