interface AppStatusProps {
  kind: 'loading' | 'error' | 'empty';
  message: string;
}

export function AppStatus({ kind, message }: AppStatusProps) {
  return (
    <p
      aria-atomic="true"
      aria-live={kind === 'error' ? 'assertive' : 'polite'}
      className={`app-status app-status--${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {message}
    </p>
  );
}
