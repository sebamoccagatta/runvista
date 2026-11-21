import type { ComponentPropsWithRef } from 'react';

export type StatusIndicatorProps = ComponentPropsWithRef<'span'> & {
  status: 'online' | 'offline' | 'connecting';
  label: string;
};

const colors = {
  online: 'bg-success',
  offline: 'bg-brand',
  connecting: 'bg-accent animate-pulse',
} as const;

export function StatusIndicator({ status, label, className = '', ...props }: StatusIndicatorProps) {
  return (
    <span
      {...props}
      role="status"
      className={[
        'inline-flex items-center gap-2 text-sm font-medium',
        'text-text-primary',
        className,
      ].join(' ')}
    >
      <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors[status]}`} />
      {label}
    </span>
  );
}
