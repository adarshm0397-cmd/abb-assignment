import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export type ActionButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement>
>;

export const ActionButton = ({
  children,
  className = "",
  ...props
}: ActionButtonProps) => (
  <button
    className={`action-button ${className}`.trim()}
    type="button"
    {...props}
  >
    {children}
  </button>
);
