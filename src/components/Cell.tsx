export type CellValue = 'X' | 'O' | null;

export interface CellProps {
  column: number;
  disabled?: boolean;
  onSelect: () => void;
  row: number;
  value: CellValue;
}

export const Cell = ({
  column,
  disabled = false,
  onSelect,
  row,
  value,
}: CellProps) => {
  const valueLabel = value ?? 'empty';

  return (
    <button
      aria-label={`Row ${row + 1}, Column ${column + 1}, ${valueLabel}`}
      className="game-cell"
      disabled={disabled || value !== null}
      onClick={onSelect}
      type="button"
    >
      <span aria-hidden="true">{value}</span>
    </button>
  );
};
