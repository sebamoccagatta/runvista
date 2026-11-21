import type { ComponentPropsWithRef } from 'react';

export type CardProps = ComponentPropsWithRef<'div'> & {
  elevated?: boolean;
};

export function Card({ elevated = false, className = '', children, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={[
        'rounded-card border border-white/10 p-6',
        'transition-colors duration-200',
        elevated ? 'bg-surface-raised shadow-xl shadow-black/15' : 'bg-surface',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
