import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export type ActionButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement>
>;

export function ActionButton({ children, className = '', ...props }: ActionButtonProps) {
  return (
    <button className={`action-button ${className}`.trim()} type="button" {...props}>
      {children}
    </button>
  );
}
