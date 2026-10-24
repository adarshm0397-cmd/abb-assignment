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
});
