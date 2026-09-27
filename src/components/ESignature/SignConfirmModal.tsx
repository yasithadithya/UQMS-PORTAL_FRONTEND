import { useId, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { eSignatureService } from '@/api';
import type { ApiSignatureStatus, SignableDocType } from '@/api';
import { Button, Field, Input, Modal, Select } from '@/ui';
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
  const formId = useId();
  const locationRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useState(preview.location);
  const [signerId, setSignerId] = useState(preview.signerOptions[0]?.id || '');
  const signer = preview.signerOptions.find((option) => option.id === signerId);
  const onBehalf = !!signer && !signer.isSelf;
  const [signing, setSigning] = useState(false);

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
    <Modal
      open
      onClose={onCancel}
      dismissible={!signing}
      size="md"
      title={`Sign ${documentLabel}`}
      description="This stamp will be applied to the signature field. Once signed, the document is locked and only an administrator can unlock it."
      initialFocusRef={locationRef}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={signing}>Cancel</Button>
          <Button type="submit" variant="primary" form={formId} loading={signing} disabled={!trimmedLocation}>
            {signing ? 'Signing…' : 'Sign document'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSign} className={s.signForm}>
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
          <Field
            label="Sign as"
            hint={onBehalf ? 'You are applying this signature on behalf of the assigned surveyor. Your account is recorded as the one who applied it.' : undefined}
          >
            <Select value={signerId} onChange={(e) => setSignerId(e.target.value)} disabled={signing}>
              {preview.signerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}{option.isSelf ? ' (you)' : ' — assigned surveyor'}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Signing location" required>
          <Input
            ref={locationRef}
            value={location}
            maxLength={120}
            placeholder="e.g. Colombo, Sri Lanka"
            onChange={(e) => setLocation(e.target.value)}
            disabled={signing}
            required
          />
        </Field>
      </form>
    </Modal>
  );
}
