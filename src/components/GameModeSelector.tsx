export type GameMode = 'two-player' | 'computer';

export interface GameModeSelectorProps {
  onChange: (mode: GameMode) => void;
  value: GameMode;
}

export const GameModeSelector = ({
  onChange,
  value,
}: GameModeSelectorProps) => (
  <fieldset className="game-mode-selector">
    <legend>Game mode</legend>
    <label>
      <input
        checked={value === 'two-player'}
        name="game-mode"
        onChange={() => onChange('two-player')}
        type="radio"
        value="two-player"
      />
      Two players
    </label>
    <label>
      <input
        checked={value === 'computer'}
        name="game-mode"
        onChange={() => onChange('computer')}
        type="radio"
        value="computer"
      />
      Play against computer
    </label>
  </fieldset>
);
