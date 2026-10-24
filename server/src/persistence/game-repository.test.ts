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
  const finish = (service: GameService, gameId: string, moves: Array<[number, number]>) => {
    for (let index = 0; index < moves.length; index += 1) {
      const result = service.makeMove(gameId, {
        player: index % 2 === 0 ? "X" : "O",
        row: moves[index][0],
        column: moves[index][1],
      });
      if (!result.ok) throw new Error(`Expected move ${index + 1} to succeed.`);
    }
  };

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

  it("counts each result once and shares the persisted scoreboard across games", () => {
    const { database, service } = createService();
    const xGame = service.createGame();
    finish(service, xGame.id, [[1, 1], [2, 1], [1, 2], [2, 2], [1, 3]]);
    const completed = service.getGame(xGame.id)!;
    const repository = new SqliteGameSessionRepository(database);
    repository.save(completed);
    expect(service.getScoreboard()).toEqual({ xWins: 1, oWins: 0, draws: 0 });

    const oGame = service.createGame();
    finish(service, oGame.id, [[1, 1], [1, 3], [2, 2], [2, 3], [3, 1], [3, 3]]);
    expect(service.getScoreboard()).toEqual({ xWins: 1, oWins: 1, draws: 0 });

    const drawGame = service.createGame();
    finish(service, drawGame.id, [[1, 1], [1, 2], [1, 3], [2, 2], [2, 1], [2, 3], [3, 2], [3, 1], [3, 3]]);
    expect(new GameService(repository).getScoreboard()).toEqual({ xWins: 1, oWins: 1, draws: 1 });
  });

  it("rolls back the completed game and scoreboard together when score persistence fails", () => {
    const { database, service } = createService();
    const game = service.createGame();
    database.exec("CREATE TRIGGER fail_score BEFORE UPDATE OF x_wins ON scoreboard BEGIN SELECT RAISE(ABORT, 'forced score failure'); END;");
    expect(() => finish(service, game.id, [[1, 1], [2, 1], [1, 2], [2, 2], [1, 3]])).toThrow("forced score failure");
    expect(service.getGame(game.id)?.state.status).toBe("active");
    expect(service.getScoreboard()).toEqual({ xWins: 0, oWins: 0, draws: 0 });
    expect(database.prepare("SELECT COUNT(*) AS count FROM completion_events").get()).toEqual({ count: 0 });
  });

  it("keeps the scoreboard unchanged when resetting a game", () => {
    const { service } = createService();
    const game = service.createGame();
    finish(service, game.id, [[1, 1], [2, 1], [1, 2], [2, 2], [1, 3]]);
    const before = service.getScoreboard();
    service.resetGame(game.id);
    expect(service.getScoreboard()).toEqual(before);
  });
});
