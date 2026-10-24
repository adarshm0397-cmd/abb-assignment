import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./api.js";
import { GameService } from "./game-service.js";
import { openGameDatabase } from "./persistence/database.js";
import { SqliteGameSessionRepository } from "./persistence/game-repository.js";
import type Database from "better-sqlite3";

const resources: Array<{ database: Database.Database; directory: string }> = [];
const makeApp = () => {
  const directory = mkdtempSync(join(tmpdir(), "tic-tac-toe-api-"));
  const database = openGameDatabase(join(directory, "games.sqlite"));
  resources.push({ database, directory });
  return createApp(new GameService(new SqliteGameSessionRepository(database)));
};
afterEach(() => {
  for (const { database, directory } of resources.splice(0)) {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("game REST API", () => {
  it("creates, retrieves, and mutates a game with the contract response shape", async () => {
    const app = makeApp();
    const created = await request(app)
      .post("/api/games")
      .set("Content-Type", "application/json")
      .send({ mode: "two-player" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      mode: "two-player",
      board: [null, null, null, null, null, null, null, null, null],
      status: "active",
      currentPlayer: "X",
      moveHistory: [],
      canUndo: false,
    });

    const moved = await request(app)
      .post(`/api/games/${created.body.id}/moves`)
      .send({ player: "X", row: 1, column: 1, requestId: "move-1" });
    expect(moved.status).toBe(200);
    expect(moved.body.board[0]).toBe("X");
    expect(moved.body.moveHistory).toEqual([
      { moveNumber: 1, player: "X", row: 1, column: 1 },
    ]);
    expect(
      (await request(app).get(`/api/games/${created.body.id}`)).body,
    ).toEqual(moved.body);
  });

  it("returns predictable validation, conflict, not-found, and idempotency errors", async () => {
    const app = makeApp();
    const created = await request(app)
      .post("/api/games")
      .send({ mode: "two-player" });
    const id = created.body.id as string;
    expect(
      (await request(app).post("/api/games").send({ mode: "bad" })).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(`/api/games/${id}/moves`)
          .send({ player: "O", row: 1, column: 1, requestId: "bad-turn" })
      ).body.error.code,
    ).toBe("WRONG_TURN");
    const first = await request(app)
      .post(`/api/games/${id}/moves`)
      .send({ player: "X", row: 1, column: 1, requestId: "same" });
    const replay = await request(app)
      .post(`/api/games/${id}/moves`)
      .send({ player: "X", row: 1, column: 1, requestId: "same" });
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);
    expect(
      (
        await request(app)
          .post(`/api/games/${id}/moves`)
          .send({ player: "O", row: 1, column: 2, requestId: "same" })
      ).body.error.code,
    ).toBe("DUPLICATE_REQUEST");
    expect((await request(app).get("/api/games/unknown")).body.error.code).toBe(
      "GAME_NOT_FOUND",
    );
    expect(
      (
        await request(app)
          .post(`/api/games/${id}/moves`)
          .send({ player: "O", row: 4, column: 1, requestId: "invalid" })
      ).body.error.code,
    ).toBe("INVALID_COORDINATES");
  });

  it("rejects malformed JSON, unsupported content types, and unknown mutations", async () => {
    const app = makeApp();
    const malformed = await request(app)
      .post("/api/games")
      .set("Content-Type", "application/json")
      .send('{"mode":');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe("INVALID_REQUEST");

    const unsupported = await request(app)
      .post("/api/games")
      .set("Content-Type", "text/plain")
      .send('{"mode":"two-player"}');
    expect(unsupported.status).toBe(415);
    expect(unsupported.body.error.code).toBe("INVALID_CONTENT_TYPE");

    const unknown = await request(app).post("/api/games/unknown/undo");
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe("GAME_NOT_FOUND");
  });

  it("undoes an active two-player move and keeps the scoreboard independent", async () => {
    const app = makeApp();
    const created = await request(app).post("/api/games").send({ mode: "two-player" });
    const id = created.body.id as string;

    const moved = await request(app)
      .post(`/api/games/${id}/moves`)
      .send({ player: "X", row: 2, column: 2, requestId: "undo-me" });
    expect(moved.body.canUndo).toBe(true);

    const undone = await request(app).post(`/api/games/${id}/undo`);
    expect(undone.status).toBe(200);
    expect(undone.body.board).toEqual([null, null, null, null, null, null, null, null, null]);
    expect(undone.body.currentPlayer).toBe("X");
    expect(undone.body.moveHistory).toEqual([]);
    expect((await request(app).get("/api/scoreboard")).body).toEqual({
      xWins: 0,
      oWins: 0,
      draws: 0,
    });
  });

  it("completes a draw over HTTP and does not count it again on retrieval", async () => {
    const app = makeApp();
    const created = await request(app).post("/api/games").send({ mode: "two-player" });
    const id = created.body.id as string;
    const moves = [
      ["X", 1, 1], ["O", 1, 2], ["X", 1, 3],
      ["O", 2, 2], ["X", 2, 1], ["O", 2, 3],
      ["X", 3, 2], ["O", 3, 1], ["X", 3, 3],
    ] as const;
    for (let index = 0; index < moves.length; index += 1) {
      const [player, row, column] = moves[index];
      const response = await request(app)
        .post(`/api/games/${id}/moves`)
        .send({ player, row, column, requestId: `draw-${index}` });
      expect(response.status).toBe(200);
    }

    expect((await request(app).get(`/api/games/${id}`)).body.status).toBe("draw");
    expect((await request(app).get("/api/scoreboard")).body).toEqual({
      xWins: 0,
      oWins: 0,
      draws: 1,
    });
    expect((await request(app).get(`/api/games/${id}`)).body.status).toBe("draw");
    expect((await request(app).get("/api/scoreboard")).body.draws).toBe(1);
  });

  it("keeps a completed result when resetting the scoreboard, and resets only the new game", async () => {
    const app = makeApp();
    const created = await request(app).post("/api/games").send({ mode: "two-player" });
    const id = created.body.id as string;
    const moves = [[1, 1], [2, 1], [1, 2], [2, 2], [1, 3]];
    for (let index = 0; index < moves.length; index += 1)
      await request(app).post(`/api/games/${id}/moves`).send({
        player: index % 2 === 0 ? "X" : "O",
        row: moves[index][0],
        column: moves[index][1],
        requestId: `independent-${index}`,
      });

    expect((await request(app).post("/api/scoreboard/reset")).body).toEqual({
      xWins: 0,
      oWins: 0,
      draws: 0,
    });
    expect((await request(app).get(`/api/games/${id}`)).body.status).toBe("won");

    const reset = await request(app).post(`/api/games/${id}/reset`);
    expect(reset.status).toBe(201);
    expect(reset.body.game.id).not.toBe(id);
    expect(reset.body.game.status).toBe("active");
    expect((await request(app).get("/api/scoreboard")).body).toEqual({
      xWins: 0,
      oWins: 0,
      draws: 0,
    });
  });

  it("supports undo, reset, and scoreboard completion behavior", async () => {
    const app = makeApp();
    const created = await request(app)
      .post("/api/games")
      .send({ mode: "two-player" });
    const id = created.body.id as string;
    const moves = [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
      [1, 3],
    ];
    for (let index = 0; index < moves.length; index += 1)
      await request(app)
        .post(`/api/games/${id}/moves`)
        .send({
          player: index % 2 === 0 ? "X" : "O",
          row: moves[index][0],
          column: moves[index][1],
          requestId: `win-${index}`,
        });
    const completed = await request(app).get(`/api/games/${id}`);
    expect(completed.body.status).toBe("won");
    expect((await request(app).get("/api/scoreboard")).body).toEqual({
      xWins: 1,
      oWins: 0,
      draws: 0,
    });
    expect(
      (await request(app).post(`/api/games/${id}/undo`)).body.error.code,
    ).toBe("GAME_COMPLETED");
    const reset = await request(app).post(`/api/games/${id}/reset`);
    expect(reset.status).toBe(201);
    expect(reset.body.game.id).not.toBe(id);
    expect(reset.body.game.board).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect((await request(app).post("/api/scoreboard/reset")).body).toEqual({
      xWins: 0,
      oWins: 0,
      draws: 0,
    });
  });

  it("returns the complete server-selected computer turn and undoes it as a pair", async () => {
    const app = makeApp();
    const created = await request(app)
      .post("/api/games")
      .send({ mode: "computer" });
    const id = created.body.id as string;

    const moved = await request(app)
      .post(`/api/games/${id}/moves`)
      .send({ player: "X", row: 1, column: 1, requestId: "computer-1" });
    expect(moved.status).toBe(200);
    expect(moved.body.board).toEqual([
      "X", null, null,
      null, "O", null,
      null, null, null,
    ]);
    expect(moved.body.currentPlayer).toBe("X");
    expect(moved.body.moveHistory).toEqual([
      { moveNumber: 1, player: "X", row: 1, column: 1 },
      { moveNumber: 2, player: "O", row: 2, column: 2 },
    ]);

    const undone = await request(app).post(`/api/games/${id}/undo`);
    expect(undone.status).toBe(200);
    expect(undone.body.board).toEqual([null, null, null, null, null, null, null, null, null]);
    expect(undone.body.currentPlayer).toBe("X");
    expect(undone.body.moveHistory).toEqual([]);
  });
});
