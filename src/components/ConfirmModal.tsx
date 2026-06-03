import React from 'react';

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
  if (!isOpen) return null;

  return (
    <div style={{
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
    }}>
      <div className="card animate-in" style={{
        maxWidth: '400px',
        width: '100%',
        background: 'var(--card)',
        padding: '24px',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--label)', marginBottom: '8px' }}>
          {title}
        </h3>
        <div style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.5', marginBottom: '24px' }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            style={{ marginBottom: 0, padding: '8px 16px', fontSize: '13px' }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            style={{
              marginBottom: 0,
              padding: '8px 16px',
              fontSize: '13px',
              background: isDestructive ? 'var(--red)' : 'var(--primary)',
              borderColor: isDestructive ? 'var(--red)' : 'var(--primary)'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}} />
    </div>
  );
}
