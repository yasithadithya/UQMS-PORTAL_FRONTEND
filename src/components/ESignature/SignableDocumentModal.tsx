import type { ApiSignatureStatus, SignableDocType } from '@/api';
import SignablePdfViewer from './SignablePdfViewer';
import { Modal } from '@/ui';

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
  return (
    <Modal open={isOpen} onClose={onClose} title={title} size="full" flush>
      <SignablePdfViewer
        docType={docType}
        docId={docId}
        fetchPdf={fetchPdf}
        downloadFileName={downloadFileName}
        onStatusChange={onStatusChange}
      />
    </Modal>
  );
}
