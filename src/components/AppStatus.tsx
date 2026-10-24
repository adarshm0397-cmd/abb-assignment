interface AppStatusProps {
  kind: 'loading' | 'error' | 'empty';
  message: string;
}

export function AppStatus({ kind, message }: AppStatusProps) {
  return (
    <p className={`app-status app-status--${kind}`} role={kind === 'error' ? 'alert' : undefined}>
      {message}
    </p>
  );
}
