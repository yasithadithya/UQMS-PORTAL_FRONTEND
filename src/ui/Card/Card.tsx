import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import s from './Card.module.css';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** 'none' for cards whose content (tables, lists) runs edge to edge. */
  padding?: 'none' | 'sm' | 'md';
};

export function Card({ padding = 'md', className, ...rest }: CardProps) {
  return <div className={clsx(s.card, s[`pad-${padding}`], className)} {...rest} />;
}

type SectionProps = Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> & {
  children?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Buttons/links at the right of the header. */
  actions?: ReactNode;
  padding?: CardProps['padding'];
};

/** A titled card: header (title, description, actions) above its content. */
export function Section({ title, description, actions, padding = 'md', className, children, ...rest }: SectionProps) {
  return (
    <section className={clsx(s.card, className)} {...rest}>
      <header className={clsx(s.header, children == null && s.headerOnly)}>
        <div className={s.headerText}>
          <h2 className={s.title}>{title}</h2>
          {description && <p className={s.description}>{description}</p>}
        </div>
        {actions && <div className={s.actions}>{actions}</div>}
      </header>
      {children != null && <div className={s[`pad-${padding}`]}>{children}</div>}
    </section>
  );
}
