import type { ReactNode } from 'react';
import s from './hr.module.css';

export const formatMoney = (v?: number) =>
  `Rs. ${(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDate = (d?: string | Date | null) => (d ? new Date(d).toLocaleDateString() : '—');

type BadgeVariant = 'badgeGreen' | 'badgeRed' | 'badgeOrange' | 'badgeBlue' | 'badgeMuted';

export const statusColor = (status: string): BadgeVariant => {
  switch (status) {
    case 'Active': case 'Approved': case 'Paid': case 'Completed': case 'Done': case 'Present': case 'Open': case 'Acknowledged': case 'Enrolled':
      return 'badgeGreen';
    case 'Rejected': case 'Terminated': case 'Cancelled': case 'Failed': case 'Absent': case 'Urgent':
      return 'badgeRed';
    case 'Pending': case 'Draft': case 'OnProbation': case 'InProgress': case 'Late': case 'Important': case 'NoShow':
      return 'badgeOrange';
    case 'Submitted': case 'Scheduled': case 'OnLeave': case 'HalfDay':
      return 'badgeBlue';
    default:
      return 'badgeMuted';
  }
};

export function Badge({ status, label }: { status: string; label?: string }) {
  return <span className={`${s.badge} ${s[statusColor(status)]}`}>{label ?? status}</span>;
}

/** Page header: gradient/section title + optional subtitle + optional action(s) on the right. */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className={s.topBar}>
      <div>
        <h2 className="section-header" style={{ marginBottom: 0 }}>{title}</h2>
        {subtitle && <p className={s.headerSub}>{subtitle}</p>}
      </div>
      {action && <div className={s.headerActions}>{action}</div>}
    </div>
  );
}

/** Grey toolbar/filter card that sits above tables. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className={s.filterBar}>{children}</div>;
}

/** A single labelled form control. Renders label.form-label + the control. */
export function Field({ label, required, children, full, className }: { label?: string; required?: boolean; children: ReactNode; full?: boolean; className?: string }) {
  return (
    <div className={`${s.fieldGroup} ${full ? s.fullWidth : ''} ${className || ''}`}>
      {label && <label className="form-label">{label}{required && <span className={s.req}> *</span>}</label>}
      {children}
    </div>
  );
}

/**
 * Standard HR modal shell: overlay + header (title + ✕) + scrollable body + optional footer.
 * Callers pass footer content (usually Cancel/Save buttons) via `footer`.
 */
export function Modal({ title, children, onClose, footer, size }: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: 'narrow' | 'wide';
}) {
  const sizeClass = size === 'wide' ? s.modalWide : size === 'narrow' ? s.modalNarrow : '';
  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={`${s.modal} ${sizeClass}`} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>{title}</h3>
          <button type="button" className={s.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={s.modalBody}>{children}</div>
        {footer && <div className={s.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className={s.emptyRow}>{text}</td>
    </tr>
  );
}
