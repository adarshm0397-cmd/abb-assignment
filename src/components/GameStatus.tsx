export interface GameStatusProps {
  children: string;
}

export const GameStatus = ({ children }: GameStatusProps) => (
  <p aria-live="polite" className="game-status" role="status">
    {children}
  </p>
);
