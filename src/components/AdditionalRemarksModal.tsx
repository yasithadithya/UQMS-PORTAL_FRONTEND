import { useEffect, useId, useRef, useState } from 'react';

interface AdditionalRemarksModalProps {
  isOpen: boolean;
  initialValue?: string;
  confirmText?: string;
  onConfirm: (remarks: string) => void;
  onCancel: () => void;
}

/** Asks for optional remarks printed on the last page of a report, just above the signature. */
export default function AdditionalRemarksModal({
  isOpen,
  initialValue = '',
  confirmText = 'Continue',
  onConfirm,
  onCancel
}: AdditionalRemarksModalProps) {
  const titleId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [remarks, setRemarks] = useState(initialValue);
  // Callers usually pass inline arrows; keep the latest without re-running the focus effect.
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!isOpen) return;
    setRemarks(initialValue);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    textareaRef.current?.focus();

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
    // initialValue is only read when the modal opens
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
        zIndex: 10000,
        padding: '16px',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card animate-in"
        style={{
          maxWidth: '520px',
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
          Additional Remarks
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
          These remarks are printed on the last page of the report, above the signature. Leave blank for none.
        </p>
        <textarea
          ref={textareaRef}
          className="form-input"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Enter any additional remarks..."
          style={{ height: '140px', resize: 'vertical', marginBottom: '24px' }}
        />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary btn-inline" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-primary btn-inline" onClick={() => onConfirm(remarks.trim())}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
