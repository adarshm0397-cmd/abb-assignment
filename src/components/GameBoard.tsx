import { Cell, type CellValue } from './Cell';

export type BoardState = readonly (readonly CellValue[])[];

export interface GameBoardProps {
  board: BoardState;
  disabled?: boolean;
  isCellDisabled?: (row: number, column: number) => boolean;
  onCellSelect: (row: number, column: number) => void;
}

const BOARD_SIZE = 3;

export function GameBoard({
  board,
  disabled = false,
  isCellDisabled,
  onCellSelect,
}: GameBoardProps) {
  return (
    <div aria-label="Tic tac toe board" className="game-board" role="group">
      {Array.from({ length: BOARD_SIZE }, (_, row) =>
        Array.from({ length: BOARD_SIZE }, (_, column) => {
          const value = board[row]?.[column] ?? null;

          return (
            <Cell
              column={column}
              disabled={disabled || isCellDisabled?.(row, column) === true}
              key={`${row}-${column}`}
              onSelect={() => onCellSelect(row, column)}
              row={row}
              value={value}
            />
          );
        }),
      )}
    </div>
  );
}
