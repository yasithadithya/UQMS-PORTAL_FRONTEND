import { useEffect, useState } from 'react';
import { Button, Field, Modal, Textarea } from '@/ui';

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
  const [remarks, setRemarks] = useState(initialValue);

  // Start from the caller's value each time the dialog opens.
  useEffect(() => {
    if (isOpen) setRemarks(initialValue);
    // initialValue is only read when the modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Modal
      open={isOpen}
      onClose={onCancel}
      size="md"
      title="Additional remarks"
      description="Printed on the last page of the report, above the signature. Leave blank for none."
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={() => onConfirm(remarks.trim())}>{confirmText}</Button>
        </>
      }
    >
      <Field label="Remarks" hideLabel>
        <Textarea autoFocus rows={6} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any additional remarks…" />
      </Field>
    </Modal>
  );
}
