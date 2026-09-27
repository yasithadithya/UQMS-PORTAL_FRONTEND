import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import clsx from 'clsx';
import { Tooltip } from '../Tooltip/Tooltip';
import s from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost';
export type ButtonSize = 'sm' | 'md' | 'lg';

type StyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Full width. */
  block?: boolean;
  /** Icon before the label. */
  icon?: ReactNode;
  /** Icon after the label. */
  iconRight?: ReactNode;
};

export const buttonClassName = ({ variant = 'secondary', size = 'md', block, iconOnly, loading }: StyleProps & { iconOnly?: boolean; loading?: boolean }, extra?: string) =>
  clsx(s.button, s[variant], size !== 'md' && s[size], block && s.block, iconOnly && s.iconOnly, loading && s.loading, extra);

export type ButtonProps = StyleProps & ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Shows a spinner, keeps the button's width and blocks clicks. */
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, icon, iconRight, loading, className, children, type = 'button', disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ variant, size, block, loading }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {icon}
      {children != null && <span>{children}</span>}
      {iconRight}
      {loading && <span className={s.spinner} aria-hidden="true" />}
    </button>
  );
});

export type ButtonLinkProps = StyleProps & LinkProps & { disabled?: boolean };

/** A router link that looks like a button (navigation, not an action). */
export function ButtonLink({ variant, size, block, icon, iconRight, className, children, disabled, ...rest }: ButtonLinkProps) {
  return (
    <Link
      className={buttonClassName({ variant, size, block }, className)}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      {...rest}
    >
      {icon}
      {children != null && <span>{children}</span>}
      {iconRight}
    </Link>
  );
}

export type IconButtonProps = Omit<ButtonProps, 'icon' | 'iconRight' | 'children' | 'block'> & {
  /** Accessible name; also shown as a tooltip. */
  label: string;
  icon: ReactNode;
  /** Hide the tooltip (e.g. when a visible label is already next to the button). */
  noTooltip?: boolean;
};

/** Square icon-only button. `label` is required so every icon button has an accessible name. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'ghost', size, loading, className, noTooltip, type = 'button', disabled, ...rest },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={buttonClassName({ variant, size, iconOnly: true, loading }, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {icon}
      {loading && <span className={s.spinner} aria-hidden="true" />}
    </button>
  );
  return noTooltip ? button : <Tooltip content={label}>{button}</Tooltip>;
});
