import type { ComponentPropsWithRef } from 'react';

type BadgeTone = 'neutral' | 'brand' | 'accent' | 'success';

export type BadgeProps = ComponentPropsWithRef<'span'> & {
  tone?: BadgeTone;
};

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-white/10 text-text-secondary',
  brand: 'bg-brand/15 text-brand',
  accent: 'bg-accent/15 text-accent',
  success: 'bg-success/15 text-success',
};

export function Badge({ tone = 'neutral', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={[
        'inline-flex items-center rounded-full px-3 py-1',
        'text-xs font-bold tracking-wide',
        tones[tone],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
