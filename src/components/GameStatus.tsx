export interface GameStatusProps {
  children: string;
}

export function GameStatus({ children }: GameStatusProps) {
  return (
    <p aria-live="polite" className="game-status" role="status">
      {children}
    </p>
  );
}
