import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { initializeGame } from "../game-engine.js";
import type {
  Board,
  GameState,
  Move,
  Player,
  WinningCombination,
} from "../game-engine.js";

export type GameMode = "two-player" | "computer";
export type GameSession = {
  readonly id: string;
  readonly mode: GameMode;
  readonly state: GameState;
  readonly moveHistory: readonly Move[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
};
export type Scoreboard = {
  readonly xWins: number;
  readonly oWins: number;
  readonly draws: number;
};
export type RequestRecord = {
  readonly requestId: string;
  readonly player: Player;
  readonly row: number;
  readonly column: number;
  readonly session: GameSession;
};

export interface GameSessionRepository {
  create(
    mode: GameMode,
    state: GameState,
    moveHistory?: readonly Move[],
  ): GameSession;
  findById(id: string): GameSession | null;
  save(session: GameSession): GameSession;
  saveWithRequest(session: GameSession, record: RequestRecord): GameSession;
  reset(session: GameSession): GameSession;
  findRequest(gameId: string, requestId: string): RequestRecord | null;
  saveRequest(record: RequestRecord): void;
  getScoreboard(): Scoreboard;
  resetScoreboard(): Scoreboard;
}

type GameRow = {
  id: string;
  mode: GameMode;
  board: string;
  current_player: Player | null;
  status: GameState["status"];
  winner: Player | null;
  winning_cells: string;
  created_at: string;
  updated_at: string;
  version: number;
};
type MoveRow = {
  move_number: number;
  player: Player;
  row: number;
  column_number: number;
};
type RequestRow = {
  request_id: string;
  player: Player;
  row: number;
  column_number: number;
  result_json: string;
};
const isPlayer = (value: unknown): value is Player =>
  value === "X" || value === "O";
const isCell = (value: unknown): value is Player | null =>
  value === null || isPlayer(value);

const parseBoard = (value: string): Board => {
  const board: unknown = JSON.parse(value);
  if (!Array.isArray(board) || board.length !== 9 || !board.every(isCell))
    throw new Error("Stored board is invalid.");
  return board as unknown as Board;
};
const parseWinningCells = (value: string): readonly WinningCombination[] => {
  const cells: unknown = JSON.parse(value);
  if (
    !Array.isArray(cells) ||
    !cells.every(
      (line) =>
        Array.isArray(line) &&
        line.length === 3 &&
        line.every(
          (index) => Number.isInteger(index) && index >= 0 && index <= 8,
        ),
    )
  )
    throw new Error("Stored winning cells are invalid.");
  return cells as WinningCombination[];
};

const validateSession = (session: GameSession): void => {
  if (!session.id) throw new Error("A game session must have an id.");
  if (session.state.status === "active" && session.state.currentPlayer === null)
    throw new Error("An active game must have a current player.");
  if (session.state.status !== "active" && session.state.currentPlayer !== null)
    throw new Error("Only active games may have a current player.");
  if (
    session.state.status === "won" &&
    (session.state.winner === null || session.state.winningCells.length === 0)
  )
    throw new Error("A won game must have a winner and winning cells.");
  if (
    session.state.status !== "won" &&
    (session.state.winner !== null || session.state.winningCells.length !== 0)
  )
    throw new Error("Only won games may have winner data.");
  const reconstructed: Array<Player | null> = Array(9).fill(null);
  session.moveHistory.forEach((move, index) => {
    if (
      !isPlayer(move.player) ||
      !Number.isInteger(move.row) ||
      !Number.isInteger(move.column) ||
      move.row < 1 ||
      move.row > 3 ||
      move.column < 1 ||
      move.column > 3
    )
      throw new Error("Move history contains invalid data.");
    const cell = (move.row - 1) * 3 + move.column - 1;
    if (reconstructed[cell] !== null)
      throw new Error("Move history contains an occupied cell twice.");
    if (session.state.board[cell] !== move.player)
      throw new Error("Move history does not match the board.");
    if (move.player !== (index % 2 === 0 ? "X" : "O"))
      throw new Error("Move history has invalid turn order.");
    reconstructed[cell] = move.player;
  });
  if (reconstructed.some((cell, index) => cell !== session.state.board[index]))
    throw new Error("Move history does not match the board.");
};
const sessionFromRows = (game: GameRow, moves: MoveRow[]): GameSession => ({
  id: game.id,
  mode: game.mode,
  state: {
    board: parseBoard(game.board),
    currentPlayer: game.current_player,
    status: game.status,
    winner: game.winner,
    winningCells: parseWinningCells(game.winning_cells),
  },
  moveHistory: moves.map(({ player, row, column_number }) => ({
    player,
    row,
    column: column_number,
  })),
  createdAt: game.created_at,
  updatedAt: game.updated_at,
  version: game.version,
});

export class RepositoryConflictError extends Error {
  public constructor(message = "The game changed before this operation completed.") {
    super(message);
    this.name = "RepositoryConflictError";
  }
}

export class SqliteGameSessionRepository implements GameSessionRepository {
  public constructor(private readonly database: Database.Database) {}
  public create(
    mode: GameMode,
    state: GameState,
    moveHistory: readonly Move[] = [],
  ): GameSession {
    const now = new Date().toISOString();
    const session: GameSession = {
      id: randomUUID(),
      mode,
      state,
      moveHistory,
      createdAt: now,
      updatedAt: now,
      version: 0,
    };
    validateSession(session);
    this.database.transaction(() => {
      this.database
        .prepare(
          "INSERT INTO games (id, mode, board, current_player, status, winner, winning_cells, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          session.id,
          mode,
          JSON.stringify(state.board),
          state.currentPlayer,
          state.status,
          state.winner,
          JSON.stringify(state.winningCells),
          now,
          now,
        );
      this.insertMoves(session);
    })();
    return session;
  }
  public findById(id: string): GameSession | null {
    const game = this.database
      .prepare("SELECT * FROM games WHERE id = ?")
      .get(id) as GameRow | undefined;
    if (!game) return null;
    const moves = this.database
      .prepare(
        "SELECT move_number, player, row, column_number FROM moves WHERE game_id = ? ORDER BY move_number",
      )
      .all(id) as MoveRow[];
    const session = sessionFromRows(game, moves);
    validateSession(session);
    return session;
  }
  public save(session: GameSession): GameSession {
    validateSession(session);
    const updatedAt = new Date().toISOString();
    const nextVersion = session.version + 1;
    this.database.transaction(() => {
      const update = this.database
        .prepare(
          "UPDATE games SET mode = ?, board = ?, current_player = ?, status = ?, winner = ?, winning_cells = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
        )
        .run(
          session.mode,
          JSON.stringify(session.state.board),
          session.state.currentPlayer,
          session.state.status,
          session.state.winner,
          JSON.stringify(session.state.winningCells),
          updatedAt,
          nextVersion,
          session.id,
          session.version,
        );
      if (update.changes !== 1) {
        if (!this.findById(session.id))
          throw new Error(`Game session '${session.id}' was not found.`);
        throw new RepositoryConflictError();
      }
      this.database
        .prepare("DELETE FROM moves WHERE game_id = ?")
        .run(session.id);
      this.insertMoves({ ...session, updatedAt, version: nextVersion });
      this.applyCompletion(session);
    })();
    return { ...session, updatedAt, version: nextVersion };
  }
  public saveWithRequest(
    session: GameSession,
    record: RequestRecord,
  ): GameSession {
    validateSession(session);
    const updatedAt = new Date().toISOString();
    const nextVersion = session.version + 1;
    this.database.transaction(() => {
      const update = this.database
        .prepare(
          "UPDATE games SET mode = ?, board = ?, current_player = ?, status = ?, winner = ?, winning_cells = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
        )
        .run(
          session.mode,
          JSON.stringify(session.state.board),
          session.state.currentPlayer,
          session.state.status,
          session.state.winner,
          JSON.stringify(session.state.winningCells),
          updatedAt,
          nextVersion,
          session.id,
          session.version,
        );
      if (update.changes !== 1) {
        if (!this.findById(session.id))
          throw new Error(`Game session '${session.id}' was not found.`);
        throw new RepositoryConflictError();
      }
      this.database
        .prepare("DELETE FROM moves WHERE game_id = ?")
        .run(session.id);
      this.insertMoves({ ...session, updatedAt, version: nextVersion });
      this.applyCompletion(session);
      this.database
        .prepare(
          "INSERT INTO request_records (game_id, request_id, player, row, column_number, result_json) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(
          session.id,
          record.requestId,
          record.player,
          record.row,
          record.column,
          JSON.stringify({ ...record.session, updatedAt, version: nextVersion }),
        );
    })();
    return { ...session, updatedAt, version: nextVersion };
  }
  public reset(session: GameSession): GameSession {
    validateSession(session);
    const now = new Date().toISOString();
    const replacement: GameSession = {
      id: randomUUID(),
      mode: session.mode,
      state: initializeGame(),
      moveHistory: [],
      createdAt: now,
      updatedAt: now,
      version: 0,
    };
    this.database.transaction(() => {
      const update = this.database
        .prepare(
          "UPDATE games SET status = 'reset', current_player = NULL, winner = NULL, winning_cells = ?, updated_at = ?, version = version + 1 WHERE id = ? AND version = ? AND status != 'reset'",
        )
        .run(JSON.stringify([]), new Date().toISOString(), session.id, session.version);
      if (update.changes !== 1) {
        if (!this.findById(session.id))
          throw new Error(`Game session '${session.id}' was not found.`);
        throw new RepositoryConflictError();
      }
      this.database
        .prepare(
          "INSERT INTO games (id, mode, board, current_player, status, winner, winning_cells, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          replacement.id,
          replacement.mode,
          JSON.stringify(replacement.state.board),
          replacement.state.currentPlayer,
          replacement.state.status,
          replacement.state.winner,
          JSON.stringify(replacement.state.winningCells),
          replacement.createdAt,
          replacement.updatedAt,
        );
    })();
    return replacement;
  }
  public findRequest(gameId: string, requestId: string): RequestRecord | null {
    const row = this.database
      .prepare(
        "SELECT request_id, player, row, column_number, result_json FROM request_records WHERE game_id = ? AND request_id = ?",
      )
      .get(gameId, requestId) as RequestRow | undefined;
    if (!row) return null;
    return {
      requestId: row.request_id,
      player: row.player,
      row: row.row,
      column: row.column_number,
      session: JSON.parse(row.result_json) as GameSession,
    };
  }
  public saveRequest(record: RequestRecord): void {
    this.database
      .prepare(
        "INSERT INTO request_records (game_id, request_id, player, row, column_number, result_json) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        record.session.id,
        record.requestId,
        record.player,
        record.row,
        record.column,
        JSON.stringify(record.session),
      );
  }
  public getScoreboard(): Scoreboard {
    return this.database
      .prepare(
        "SELECT x_wins as xWins, o_wins as oWins, draws FROM scoreboard WHERE id = 1",
      )
      .get() as Scoreboard;
  }
  public resetScoreboard(): Scoreboard {
    return this.database.transaction(() => {
      this.database
        .prepare(
          "UPDATE scoreboard SET x_wins = 0, o_wins = 0, draws = 0 WHERE id = 1",
        )
        .run();
      return this.getScoreboard();
    })();
  }
  private insertMoves(session: GameSession): void {
    const insert = this.database.prepare(
      "INSERT INTO moves (game_id, move_number, player, row, column_number) VALUES (?, ?, ?, ?, ?)",
    );
    session.moveHistory.forEach((move, index) =>
      insert.run(session.id, index + 1, move.player, move.row, move.column),
    );
  }
  private applyCompletion(session: GameSession): void {
    if (session.state.status !== "won" && session.state.status !== "draw")
      return;
    const result =
      session.state.status === "draw" ? "draw" : session.state.winner;
    if (result === null) return;
    const inserted = this.database
      .prepare(
        "INSERT OR IGNORE INTO completion_events (game_id, result) VALUES (?, ?)",
      )
      .run(session.id, result);
    if (inserted.changes !== 1) return;
    const column =
      result === "X" ? "x_wins" : result === "O" ? "o_wins" : "draws";
    this.database
      .prepare(`UPDATE scoreboard SET ${column} = ${column} + 1 WHERE id = 1`)
      .run();
  }
}
