import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const DATABASE_SCHEMA_VERSION = 2;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('two-player', 'computer')),
    board TEXT NOT NULL CHECK (json_valid(board) AND json_type(board) = 'array' AND json_array_length(board) = 9),
    current_player TEXT CHECK (current_player IS NULL OR current_player IN ('X', 'O')),
    status TEXT NOT NULL CHECK (status IN ('active', 'won', 'draw', 'reset')),
    winner TEXT CHECK (winner IS NULL OR winner IN ('X', 'O')),
    winning_cells TEXT NOT NULL CHECK (json_valid(winning_cells) AND json_type(winning_cells) = 'array' AND json_array_length(winning_cells) <= 3),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK ((status = 'won' AND winner IS NOT NULL) OR (status != 'won' AND winner IS NULL)),
    CHECK ((status = 'active' AND current_player IS NOT NULL) OR (status != 'active' AND current_player IS NULL))
  );

  CREATE TABLE IF NOT EXISTS moves (
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    move_number INTEGER NOT NULL CHECK (move_number >= 1),
    player TEXT NOT NULL CHECK (player IN ('X', 'O')),
    row INTEGER NOT NULL CHECK (row BETWEEN 1 AND 3),
    column_number INTEGER NOT NULL CHECK (column_number BETWEEN 1 AND 3),
    PRIMARY KEY (game_id, move_number),
    UNIQUE (game_id, row, column_number)
  );

  CREATE INDEX IF NOT EXISTS moves_game_id_idx ON moves(game_id);

  CREATE TABLE IF NOT EXISTS request_records (
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    request_id TEXT NOT NULL,
    player TEXT NOT NULL CHECK (player IN ('X', 'O')),
    row INTEGER NOT NULL CHECK (row BETWEEN 1 AND 3),
    column_number INTEGER NOT NULL CHECK (column_number BETWEEN 1 AND 3),
    result_json TEXT NOT NULL CHECK (json_valid(result_json)),
    PRIMARY KEY (game_id, request_id)
  );

  CREATE TABLE IF NOT EXISTS scoreboard (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    x_wins INTEGER NOT NULL CHECK (x_wins >= 0),
    o_wins INTEGER NOT NULL CHECK (o_wins >= 0),
    draws INTEGER NOT NULL CHECK (draws >= 0)
  );

  CREATE TABLE IF NOT EXISTS completion_events (
    game_id TEXT PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
    result TEXT NOT NULL CHECK (result IN ('X', 'O', 'draw'))
  );

  INSERT OR IGNORE INTO scoreboard (id, x_wins, o_wins, draws) VALUES (1, 0, 0, 0);
`;

export const openGameDatabase = (filename: string): Database.Database => {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true });

  const database = new Database(filename);
  database.pragma("foreign_keys = ON");
  database.exec(SCHEMA);

  const version = database.pragma("user_version", { simple: true }) as number;
  if (version > DATABASE_SCHEMA_VERSION) {
    database.close();
    throw new Error(
      `Database schema version ${version} is newer than supported version ${DATABASE_SCHEMA_VERSION}.`,
    );
  }
  if (version !== 0 && version !== DATABASE_SCHEMA_VERSION) {
    database.close();
    throw new Error(
      `Database schema version ${version} requires a development database reset.`,
    );
  }
  if (version < DATABASE_SCHEMA_VERSION)
    database.pragma(`user_version = ${DATABASE_SCHEMA_VERSION}`);

  return database;
};
