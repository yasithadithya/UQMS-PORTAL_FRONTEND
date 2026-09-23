import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { eSignatureService } from '@/api';
import type { ApiSignatureStatus, SignableDocType } from '@/api';
import { formatSigningDate } from '@/utils/date';
import s from './ESignature.module.css';

interface SignConfirmModalProps {
  docType: SignableDocType;
  docId: string;
  documentLabel: string;
  preview: NonNullable<ApiSignatureStatus['preview']>;
  onCancel: () => void;
  onSigned: (status: ApiSignatureStatus) => void;
}

/**
 * Confirms an electronic signature: shows the stamp exactly as it will be applied
 * and lets the surveyor correct the signing location.
 */
export default function SignConfirmModal({
  docType,
  docId,
  documentLabel,
  preview,
  onCancel,
  onSigned,
}: SignConfirmModalProps) {
  const titleId = useId();
  const locationId = useId();
  const signerSelectId = useId();
  const locationRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useState(preview.location);
  const [signerId, setSignerId] = useState(preview.signerOptions[0]?.id || '');
  const signer = preview.signerOptions.find((option) => option.id === signerId);
  const onBehalf = !!signer && !signer.isSelf;
  const [signing, setSigning] = useState(false);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    locationRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancelRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const trimmedLocation = location.trim();

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedLocation || signing) return;
    try {
      setSigning(true);
      const res = await eSignatureService.sign(docType, docId, trimmedLocation, signerId || undefined);
      toast.success(res.message || `${documentLabel} signed electronically.`);
      onSigned(res.data);
    } catch (err: any) {
      toast.error('Failed to sign: ' + err.message);
      setSigning(false);
    }
  };

  return (
    <div className={s.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget && !signing) onCancel(); }}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`card animate-in ${s.dialog}`}
        onSubmit={handleSign}
      >
        <h3 id={titleId} className={s.dialogTitle}>Sign {documentLabel}</h3>
        <p className={s.dialogText}>
          This stamp will be applied to the signature field. Once signed, the document is locked and can only be
          unlocked by an administrator.
        </p>

        <div className={s.stampPreview} aria-label="Signature stamp preview">
          <img src="/sign_logo.png" alt="" className={s.stampSeal} />
          <div className={s.stampLines}>
            <span>For {preview.companyName}</span>
            <span>Electronically Signed By: {signer?.name || preview.signerName || '-'}</span>
            <span>Location: {(trimmedLocation || '-').toUpperCase()}</span>
            <span>Signing Date: {formatSigningDate(new Date())} (dd/mm/yyyy)</span>
            <span>Signed Electronically in accordance</span>
            <span>with {preview.circularRef}</span>
          </div>
        </div>

        {(onBehalf || preview.signerOptions.length > 1) && (
          <div style={{ marginBottom: '14px' }}>
            <label htmlFor={signerSelectId} className="form-label">Sign as</label>
            <select
              id={signerSelectId}
              className="form-input"
              value={signerId}
              onChange={(e) => setSignerId(e.target.value)}
              disabled={signing}
            >
              {preview.signerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}{option.isSelf ? ' (you)' : ' — assigned surveyor'}
                </option>
              ))}
            </select>
            {onBehalf && (
              <p className={s.dialogHint}>
                You are applying this signature on behalf of the assigned surveyor. Your account is recorded as the one
                who applied it.
              </p>
            )}
          </div>
        )}

        <label htmlFor={locationId} className="form-label">Signing location</label>
        <input
          ref={locationRef}
          id={locationId}
          type="text"
          className="form-input"
          value={location}
          maxLength={120}
          placeholder="e.g. Colombo, Sri Lanka"
          onChange={(e) => setLocation(e.target.value)}
          disabled={signing}
          required
        />

        <div className={s.dialogActions}>
          <button type="button" className="btn-secondary btn-inline" onClick={onCancel} disabled={signing}>
            Cancel
          </button>
          <button type="submit" className="btn-primary btn-inline" disabled={!trimmedLocation || signing}>
            {signing ? 'Signing…' : 'Sign document'}
          </button>
        </div>
      </form>
    </div>
  );
}
