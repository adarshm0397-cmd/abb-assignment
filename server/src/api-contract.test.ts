import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Schema = {
  $defs: Record<string, Record<string, unknown>>;
};

const schema = JSON.parse(
  readFileSync(resolve(process.cwd(), 'docs/api-contract.schema.json'), 'utf8'),
) as Schema;
const contract = readFileSync(resolve(process.cwd(), 'docs/api-contract.md'), 'utf8');

const definition = (name: string) => schema.$defs[name];
const requiredFields = (name: string) => definition(name).required as string[];

describe('REST API contract', () => {
  it('documents every canonical endpoint exactly once', () => {
    const endpoints = [
      'POST /api/games',
      'GET /api/games/:gameId',
      'POST /api/games/:gameId/moves',
      'POST /api/games/:gameId/undo',
      'POST /api/games/:gameId/reset',
      'GET /api/scoreboard',
      'POST /api/scoreboard/reset',
    ];

    for (const endpoint of endpoints) {
      const endpointLine = '`' + endpoint + '`';
      expect(contract.split('\n').filter((line) => line === endpointLine)).toHaveLength(1);
    }

    expect(contract).not.toContain('/api/games//');
    expect(contract).not.toContain('GET /api/games/`');
  });

  it('defines the supported enums without ambiguous values', () => {
    expect(definition('Mode').enum).toEqual(['two-player', 'computer']);
    expect(definition('Player').enum).toEqual(['X', 'O']);
    expect(definition('Status').enum).toEqual(['active', 'won', 'draw', 'reset']);
  });

  it('requires complete and strictly shaped game creation requests', () => {
    expect(requiredFields('CreateGameRequest')).toEqual(['mode']);
    expect(definition('CreateGameRequest').additionalProperties).toBe(false);
    expect((definition('CreateGameRequest').properties as Record<string, unknown>).mode).toEqual({
      $ref: '#/$defs/Mode',
    });
  });

  it('requires complete and strictly shaped idempotent move requests', () => {
    expect(requiredFields('MoveRequest')).toEqual(['player', 'row', 'column', 'requestId']);
    expect(definition('MoveRequest').additionalProperties).toBe(false);

    const properties = definition('MoveRequest').properties as Record<string, Record<string, unknown>>;
    expect(properties.row.minimum).toBe(1);
    expect(properties.row.maximum).toBe(3);
    expect(properties.column.minimum).toBe(1);
    expect(properties.column.maximum).toBe(3);
    expect(properties.requestId.minLength).toBe(1);
    expect(definition('MoveRequest').description).toContain('reusing it with different request data is rejected');
  });

  it('defines the complete game response and nine-cell board contract', () => {
    expect(requiredFields('GameResponse')).toEqual([
      'id',
      'mode',
      'board',
      'currentPlayer',
      'status',
      'winner',
      'winningCells',
      'moveHistory',
      'canUndo',
    ]);

    const properties = definition('GameResponse').properties as Record<string, Record<string, unknown>>;
    expect(properties.board.prefixItems).toHaveLength(9);
    expect(properties.winningCells.maxItems).toBe(3);
    expect(properties.moveHistory.items).toEqual({ $ref: '#/$defs/Move' });
    expect(properties.canUndo).toEqual({ type: 'boolean' });
  });

  it('defines reset as a new game while retaining the old game history', () => {
    expect(requiredFields('ResetGameResponse')).toEqual(['game']);
    expect((definition('ResetGameResponse').properties as Record<string, unknown>).game).toEqual({
      $ref: '#/$defs/GameResponse',
    });
    expect(definition('ResetGameResponse').description).toContain('old game remains persisted');
    expect(definition('GameResponse').description).toContain('board and moveHistory are retained');
  });

  it('defines scoreboard counters and exactly-once concurrent completion semantics', () => {
    expect(requiredFields('Scoreboard')).toEqual(['xWins', 'oWins', 'draws']);

    const properties = definition('Scoreboard').properties as Record<string, Record<string, unknown>>;
    expect(properties.xWins.minimum).toBe(0);
    expect(properties.oWins.minimum).toBe(0);
    expect(properties.draws.minimum).toBe(0);
    expect(definition('Scoreboard').description).toContain('exactly once');
    expect(definition('Scoreboard').description).toContain('serialized atomically');
  });

  it('defines a consistent structured error envelope and field details', () => {
    expect(requiredFields('ErrorResponse')).toEqual(['error']);
    expect(requiredFields('FieldError')).toEqual(['field', 'code', 'message']);

    const error = definition('ErrorResponse').properties as Record<string, Record<string, unknown>>;
    const errorProperties = error.error.properties as Record<string, Record<string, unknown>>;
    expect(error.error.required).toEqual(['code', 'message']);
    expect(errorProperties.details.properties).toHaveProperty('fields');
    expect(errorProperties.code.enum).toEqual([
      'INVALID_REQUEST',
      'INVALID_CONTENT_TYPE',
      'INVALID_MODE',
      'INVALID_COORDINATES',
      'INVALID_PLAYER',
      'WRONG_TURN',
      'CELL_OCCUPIED',
      'GAME_COMPLETED',
      'GAME_NOT_FOUND',
      'UNDO_NOT_ALLOWED',
      'DUPLICATE_REQUEST',
      'INTERNAL_ERROR',
    ]);
  });

  it('documents coordinate, history, undo, and computer-response behavior', () => {
    expect(contract).toContain('Public move coordinates are one-based');
    expect(contract).toContain('Rows are counted top to bottom and columns left to right');
    expect(contract).toContain('renumbers all remaining moves in chronological order starting at 1');
    expect(contract).toContain('Players cannot undo after a game has been won or drawn');
    expect(contract).toContain('both the submitted human move and the automatically selected computer move');
    expect(contract).toContain('If the same `requestId` is reused with different request data, the server rejects the request with `409 DUPLICATE_REQUEST`');
    expect(contract).toContain('a concurrent completion is applied exactly once');
  });
});
