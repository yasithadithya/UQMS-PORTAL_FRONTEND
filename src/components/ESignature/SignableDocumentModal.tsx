import { useId } from 'react';
import type { ApiSignatureStatus, SignableDocType } from '@/api';
import SignablePdfViewer from './SignablePdfViewer';
import s from './ESignature.module.css';

interface SignableDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  docType: SignableDocType;
  docId: string;
  fetchPdf: () => Promise<Blob>;
  downloadFileName: string;
  onStatusChange?: (status: ApiSignatureStatus) => void;
}

/** Full-screen view of a stored document with its clickable electronic signature field. */
export default function SignableDocumentModal({
  isOpen,
  onClose,
  title,
  docType,
  docId,
  fetchPdf,
  downloadFileName,
  onStatusChange,
}: SignableDocumentModalProps) {
  const titleId = useId();

  if (!isOpen) return null;

  return (
    <div className={s.fullscreen} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={s.fullscreenHeader}>
        <h3 id={titleId} className={s.fullscreenTitle}>{title}</h3>
        <button type="button" className={s.closeBtn} onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>
      <SignablePdfViewer
        docType={docType}
        docId={docId}
        fetchPdf={fetchPdf}
        downloadFileName={downloadFileName}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}
