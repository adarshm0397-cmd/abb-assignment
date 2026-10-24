import {
  initializeGame,
  makeMove,
  type GameState,
  type Move,
  type MoveError,
  type Player,
} from "./game-engine.js";
import type {
  GameMode,
  GameSession,
  GameSessionRepository,
  RequestRecord,
  Scoreboard,
} from "./persistence/game-repository.js";
import { chooseComputerMove } from "./computer-strategy.js";

export type ServiceErrorCode =
  | MoveError["code"]
  | "GAME_NOT_FOUND"
  | "UNDO_NOT_ALLOWED"
  | "DUPLICATE_REQUEST"
  | "INTERNAL_ERROR";
export type ServiceError = {
  readonly code: ServiceErrorCode;
  readonly message: string;
};
export type ServiceMoveResult =
  | { readonly ok: true; readonly session: GameSession }
  | { readonly ok: false; readonly error: ServiceError };

export class GameService {
  public constructor(
    private readonly repository: GameSessionRepository,
    private readonly selectComputerMove: typeof chooseComputerMove = chooseComputerMove,
  ) {}
  public createGame(mode: GameMode = "two-player"): GameSession {
    return this.repository.create(mode, initializeGame());
  }
  public getGame(id: string): GameSession | null {
    return this.repository.findById(id);
  }
  public getScoreboard(): Scoreboard {
    return this.repository.getScoreboard();
  }
  public resetScoreboard(): Scoreboard {
    return this.repository.resetScoreboard();
  }

  public resetGame(id: string): GameSession | ServiceError {
    const session = this.repository.findById(id);
    if (!session)
      return { code: "GAME_NOT_FOUND", message: `Game '${id}' was not found.` };
    return this.repository.reset(session);
  }

  public undo(id: string): GameSession | ServiceError {
    const session = this.repository.findById(id);
    if (!session)
      return { code: "GAME_NOT_FOUND", message: `Game '${id}' was not found.` };
    if (session.state.status === "won" || session.state.status === "draw")
      return {
        code: "GAME_COMPLETED",
        message: "Completed games cannot be undone.",
      };
    if (session.state.status === "reset" || session.moveHistory.length === 0)
      return {
        code: "UNDO_NOT_ALLOWED",
        message: "There are no moves available to undo.",
      };
    const count =
      session.mode === "computer" && session.moveHistory.at(-1)?.player === "O"
        ? 2
        : 1;
    const history = session.moveHistory.slice(
      0,
      Math.max(0, session.moveHistory.length - count),
    );
    return this.repository.save({
      ...session,
      state: replay(history),
      moveHistory: history,
    });
  }

  public makeMove(
    id: string,
    move: Move,
    requestId?: string,
  ): ServiceMoveResult {
    const session = this.repository.findById(id);
    if (!session)
      return {
        ok: false,
        error: {
          code: "GAME_NOT_FOUND",
          message: `Game '${id}' was not found.`,
        },
      };
    if (requestId) {
      const previous = this.repository.findRequest(id, requestId);
      if (previous) {
        if (
          previous.player !== move.player ||
          previous.row !== move.row ||
          previous.column !== move.column
        )
          return {
            ok: false,
            error: {
              code: "DUPLICATE_REQUEST",
              message:
                "The request ID was already used with different move data.",
            },
          };
        return { ok: true, session: previous.session };
      }
    }
    const result = makeMove(session.state, move);
    if (!result.ok) return result;
    let state = result.state;
    let history = [...session.moveHistory, move];
    if (session.mode === "computer" && state.status === "active") {
      const computerMove = this.selectComputerMove(state.board);
      if (computerMove === null)
        return {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "The computer could not make a valid move; the game was not changed.",
          },
        };
      const computerResult = makeMove(state, computerMove);
      if (!computerResult.ok)
        return {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "The computer could not make a valid move; the game was not changed.",
          },
        };
      state = computerResult.state;
      history = [...history, computerMove];
    }
    const next = { ...session, state, moveHistory: history };
    const request: RequestRecord | undefined = requestId
      ? {
          requestId,
          player: move.player,
          row: move.row,
          column: move.column,
          session: next,
        }
      : undefined;
    const saved = request
      ? this.repository.saveWithRequest(next, request)
      : this.repository.save(next);
    return { ok: true, session: saved };
  }
}

const replay = (history: readonly Move[]): GameState => {
  let state = initializeGame();
  for (const move of history) {
    const result = makeMove(state, move);
    if (!result.ok) throw new Error("Stored move history cannot be replayed.");
    state = result.state;
  }
  return state;
};

export type { GameMode, GameSession, GameState, Player, Scoreboard };
