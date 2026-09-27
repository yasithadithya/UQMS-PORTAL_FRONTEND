import { useRef, type ReactNode, type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { Button } from '../Button/Button';
import s from './Modal.module.css';

type BaseProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons, right-aligned in a footer that stays visible while the body scrolls. */
  footer?: ReactNode;
  /** Block closing on outside click / Esc (e.g. while saving). */
  dismissible?: boolean;
};

type ModalProps = BaseProps & {
  /** sm 420, md 560, lg 800, xl 1100, full = whole viewport (document viewers). lg/xl become full-screen sheets on phones. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Body without padding or scrolling, for layouts that manage their own panes (e.g. form + preview). */
  flush?: boolean;
  /** Extra class on the dialog box (e.g. a fixed height). */
  className?: string;
  /** Element to focus when the dialog opens (default: the first focusable element). */
  initialFocusRef?: RefObject<HTMLElement | null>;
};

/**
 * Centered dialog. Radix handles focus trap, Esc, scroll lock, focus return and aria wiring.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissible = true, flush, className, initialFocusRef }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o && dismissible) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content
          className={clsx(s.modal, s[size], className)}
          onOpenAutoFocus={(e) => { if (initialFocusRef?.current) { e.preventDefault(); initialFocusRef.current.focus(); } }}
          onEscapeKeyDown={(e) => { if (!dismissible) e.preventDefault(); }}
          onPointerDownOutside={(e) => { if (!dismissible) e.preventDefault(); }}
        >
          <DialogChrome title={title} description={description} footer={footer} dismissible={dismissible} flush={flush}>
            {children}
          </DialogChrome>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type DrawerProps = BaseProps & {
  side?: 'right' | 'left';
  width?: number;
};

/** Side sheet for secondary detail or filters; bottom sheet on phones. */
export function Drawer({ open, onClose, title, description, children, footer, side = 'right', width = 480, dismissible = true }: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o && dismissible) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content
          className={clsx(s.drawer, s[`drawer-${side}`])}
          style={{ ['--drawer-w' as string]: `${width}px` }}
          onEscapeKeyDown={(e) => { if (!dismissible) e.preventDefault(); }}
          onPointerDownOutside={(e) => { if (!dismissible) e.preventDefault(); }}
        >
          <DialogChrome title={title} description={description} footer={footer} dismissible={dismissible}>
            {children}
          </DialogChrome>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogChrome({ title, description, footer, dismissible, flush, children }: Pick<BaseProps, 'title' | 'description' | 'footer' | 'dismissible' | 'children'> & { flush?: boolean }) {
  return (
    <>
      <div className={s.header}>
        <div className={s.headerText}>
          <Dialog.Title className={s.title}>{title}</Dialog.Title>
          {description
            ? <Dialog.Description className={s.description}>{description}</Dialog.Description>
            : <Dialog.Description className="sr-only">{typeof title === 'string' ? title : 'Dialog'}</Dialog.Description>}
        </div>
        {dismissible && (
          <Dialog.Close asChild>
            <button type="button" className={s.close} aria-label="Close">
              <X aria-hidden="true" />
            </button>
          </Dialog.Close>
        )}
      </div>
      {children != null && <div className={clsx(s.body, flush && s.bodyFlush)}>{children}</div>}
      {footer && <div className={s.footer}>{footer}</div>}
    </>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Red confirm button for deletes, rejections and other irreversible actions. */
  destructive?: boolean;
  /** Spinner on the confirm button; dialog can't be dismissed meanwhile. */
  loading?: boolean;
};

/** Yes/no confirmation. Focus starts on Cancel so Enter never confirms a destructive action by accident. */
export function ConfirmDialog({ open, title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel, destructive, loading }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o && !loading) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content
          role="alertdialog"
          className={clsx(s.modal, s.sm)}
          onOpenAutoFocus={(e) => { e.preventDefault(); cancelRef.current?.focus(); }}
        >
          <div className={s.confirmBody}>
            <Dialog.Title className={s.title}>{title}</Dialog.Title>
            <Dialog.Description asChild>
              <div className={s.confirmMessage}>{message}</div>
            </Dialog.Description>
          </div>
          <div className={s.footer}>
            <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={loading}>{cancelText}</Button>
            <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmText}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
