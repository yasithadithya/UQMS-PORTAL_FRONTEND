import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { humanizeStatus, toneForStatus, type Tone } from './status';
import s from './Badge.module.css';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  /** Leading colored dot (use for statuses, not for counts or tags). */
  dot?: boolean;
  icon?: ReactNode;
};

export function Badge({ tone = 'neutral', dot, icon, className, children, ...rest }: BadgeProps) {
  return (
    <span className={clsx(s.badge, s[tone], className)} {...rest}>
      {dot && <span className={s.dot} aria-hidden="true" />}
      {icon}
      {children}
    </span>
  );
}

type StatusBadgeProps = Omit<BadgeProps, 'tone' | 'children'> & {
  status: string | null | undefined;
  /** Text to show instead of the humanized status. */
  label?: ReactNode;
  /** Override the tone from the shared status map. */
  tone?: Tone;
};

/** A status pill whose color comes from the shared map in status.ts. */
export function StatusBadge({ status, label, tone, ...rest }: StatusBadgeProps) {
  return (
    <Badge tone={tone ?? toneForStatus(status)} dot {...rest}>
      {label ?? humanizeStatus(status)}
    </Badge>
  );
}
