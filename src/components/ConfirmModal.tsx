import React, { useEffect, useId, useRef } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false
}: ConfirmModalProps) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Callers usually pass inline arrows; keep the latest without re-running the focus effect.
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Focus the safe action by default so Enter never triggers a destructive confirm by accident.
    cancelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancelRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="card animate-in"
        style={{
          maxWidth: '420px',
          width: '100%',
          background: 'var(--card)',
          padding: '24px',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          marginBottom: 0
        }}
      >
        <h3 id={titleId} style={{ fontSize: '18px', fontWeight: 700, color: 'var(--label)', marginBottom: '8px' }}>
          {title}
        </h3>
        <div id={messageId} style={{ fontSize: '14px', color: 'var(--secondary)', lineHeight: '1.5', marginBottom: '24px' }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            ref={cancelRef}
            type="button"
            className="btn-secondary btn-inline"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="btn-primary btn-inline"
            onClick={onConfirm}
            style={isDestructive ? { background: 'var(--red)' } : undefined}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
