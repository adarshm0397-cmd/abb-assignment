interface AppStatusProps {
  kind: "loading" | "error" | "empty";
  message: string;
}

export const AppStatus = ({ kind, message }: AppStatusProps) => (
  <p
    aria-atomic="true"
    aria-live={kind === "error" ? "assertive" : "polite"}
    className={`app-status app-status--${kind}`}
    role={kind === "error" ? "alert" : "status"}
  >
    {message}
  </p>
);
