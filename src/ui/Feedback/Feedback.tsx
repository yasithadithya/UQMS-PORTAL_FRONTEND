import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import { AlertTriangle, Inbox } from 'lucide-react';
import { Button } from '../Button/Button';
import s from './Feedback.module.css';

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  /** Usually one primary button, e.g. "Create first entry". */
  action?: ReactNode;
  /** Smaller variant for use inside tables and sections. */
  compact?: boolean;
};

export function EmptyState({ title, description, icon, action, compact }: EmptyStateProps) {
  return (
    <div className={clsx(s.state, compact && s.compact)}>
      <div className={s.icon} aria-hidden="true">{icon ?? <Inbox />}</div>
      <p className={s.title}>{title}</p>
      {description && <p className={s.description}>{description}</p>}
      {action && <div className={s.action}>{action}</div>}
    </div>
  );
}

type ErrorStateProps = {
  title?: string;
  message?: ReactNode;
  onRetry?: () => void;
  compact?: boolean;
};

export function ErrorState({ title = "Couldn't load this", message, onRetry, compact }: ErrorStateProps) {
  return (
    <div className={clsx(s.state, s.error, compact && s.compact)} role="alert">
      <div className={s.icon} aria-hidden="true"><AlertTriangle /></div>
      <p className={s.title}>{title}</p>
      {message && <p className={s.description}>{message}</p>}
      {onRetry && (
        <div className={s.action}>
          <Button size="sm" onClick={onRetry}>Try again</Button>
        </div>
      )}
    </div>
  );
}

export function Skeleton({ width, height = 14, radius, className, style }: {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  radius?: CSSProperties['borderRadius'];
  className?: string;
  style?: CSSProperties;
}) {
  return <span className={clsx(s.skeleton, className)} style={{ width, height, borderRadius: radius, ...style }} aria-hidden="true" />;
}

export function Spinner({ size = 20, label = 'Loading' }: { size?: number; label?: string }) {
  return (
    <span className={s.spinner} style={{ width: size, height: size }} role="status">
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Centered spinner for a whole region while it loads for the first time. */
export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className={s.loadingBlock} aria-busy="true">
      <Spinner label={label} />
      <span>{label}</span>
    </div>
  );
}
