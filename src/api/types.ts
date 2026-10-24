export type Player = 'X' | 'O';
export type Mode = 'two-player' | 'computer';
export type GameStatus = 'active' | 'won' | 'draw' | 'reset';

export interface Coordinate {
  row: number;
  column: number;
}

export interface Move extends Coordinate {
  moveNumber: number;
  player: Player;
}

export interface CreateGameRequest {
  mode: Mode;
}

export interface MoveRequest extends Coordinate {
  player: Player;
  requestId: string;
}

export interface GameResponse {
  id: string;
  mode: Mode;
  board: [Player | null, Player | null, Player | null, Player | null, Player | null, Player | null, Player | null, Player | null, Player | null];
  currentPlayer: Player | null;
  status: GameStatus;
  winner: Player | null;
  winningCells: Coordinate[][];
  moveHistory: Move[];
  canUndo: boolean;
}

export interface ResetGameResponse {
  game: GameResponse;
}

export interface Scoreboard {
  xWins: number;
  oWins: number;
  draws: number;
}

export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_CONTENT_TYPE'
  | 'INVALID_MODE'
  | 'INVALID_COORDINATES'
  | 'INVALID_PLAYER'
  | 'WRONG_TURN'
  | 'CELL_OCCUPIED'
  | 'GAME_COMPLETED'
  | 'GAME_NOT_FOUND'
  | 'UNDO_NOT_ALLOWED'
  | 'DUPLICATE_REQUEST'
  | 'INTERNAL_ERROR';

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: {
      fields?: FieldError[];
      [key: string]: unknown;
    };
  };
}
