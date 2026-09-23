import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'react-toastify';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { eSignatureService } from '@/api';
import type { ApiSignatureStatus, SignableDocType } from '@/api';
import ConfirmModal from '@/components/ConfirmModal';
import { formatSigningDate } from '@/utils/date';
import SignConfirmModal from './SignConfirmModal';
import s from './ESignature.module.css';

/** pdf.js is large, so it is loaded the first time a document is opened. */
const loadPdfJs = async () => {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
};

interface SignablePdfViewerProps {
  docType: SignableDocType;
  docId: string;
  /** Fetches the stored PDF; called again after signing or revoking. */
  fetchPdf: () => Promise<Blob>;
  /** File name used by the Download button. */
  downloadFileName: string;
  /** Called whenever the signature status is loaded or changes. */
  onStatusChange?: (status: ApiSignatureStatus) => void;
}

/**
 * Renders a stored PDF with pdf.js and overlays its electronic signature field.
 * Clicking the field (when the user may sign) opens the signing dialog; the signed
 * PDF is then re-fetched with the stamp drawn by the server.
 */
export default function SignablePdfViewer({
  docType,
  docId,
  fetchPdf,
  downloadFileName,
  onStatusChange,
}: SignablePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<ApiSignatureStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revoking, setRevoking] = useState(false);

  // Callers usually pass inline functions; keep the latest without reloading.
  const fetchPdfRef = useRef(fetchPdf);
  fetchPdfRef.current = fetchPdf;
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const applyStatus = useCallback((next: ApiSignatureStatus) => {
    setStatus(next);
    onStatusChangeRef.current?.(next);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Status first: it re-renders PDFs generated before signature fields existed.
      const statusRes = await eSignatureService.getStatus(docType, docId);
      const blob = await fetchPdfRef.current();
      const pdfjs = await loadPdfJs();
      const doc = await pdfjs.getDocument({ data: await blob.arrayBuffer(), isEvalSupported: false }).promise;
      applyStatus(statusRes.data);
      setPdfBlob(blob);
      setPdf(doc);
    } catch (err: any) {
      setError(err.message || 'Failed to load the document.');
    } finally {
      setLoading(false);
    }
  }, [docType, docId, applyStatus]);

  useEffect(() => {
    load();
  }, [load]);

  // Release the previous document when a new one replaces it, and on unmount.
  useEffect(() => () => { pdf?.destroy(); }, [pdf]);

  // Pages are rendered at the container width and re-rendered when it changes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setPageWidth(Math.max(280, Math.min(entry.contentRect.width - 32, 900)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleSigned = async (next: ApiSignatureStatus) => {
    setShowSignDialog(false);
    applyStatus(next);
    await load();
  };

  const handleRevoke = async () => {
    setShowRevokeConfirm(false);
    try {
      setRevoking(true);
      const res = await eSignatureService.revoke(docType, docId);
      toast.success(res.message || 'Electronic signature revoked.');
      applyStatus(res.data);
      await load();
    } catch (err: any) {
      toast.error('Failed to revoke signature: ' + err.message);
    } finally {
      setRevoking(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const field = status?.signatureField ?? null;

  return (
    <div className={s.viewer}>
      <div className={s.toolbar}>
        {status?.signed && status.eSignature ? (
          <span className={`${s.statusBadge} ${s.statusSigned}`}>
            ✓ Signed electronically by {status.eSignature.signedByName} on {formatSigningDate(status.eSignature.signedAt)}
          </span>
        ) : status ? (
          <span className={`${s.statusBadge} ${s.statusPending}`}>
            {status.canSign ? 'Awaiting your signature — click the signature field' : 'Not signed'}
          </span>
        ) : (
          <span />
        )}
        <div className={s.toolbarActions}>
          {status?.canRevoke && (
            <button
              type="button"
              className="btn-secondary btn-inline"
              onClick={() => setShowRevokeConfirm(true)}
              disabled={revoking || loading}
              style={{ color: 'var(--red)' }}
            >
              {revoking ? 'Revoking...' : 'Revoke signature'}
            </button>
          )}
          <button type="button" className="btn-secondary btn-inline" onClick={handleDownload} disabled={!pdfBlob || loading}>
            Download PDF
          </button>
        </div>
      </div>

      <div ref={containerRef} className={s.pages}>
        {loading && !pdf && <div className={s.message}>Loading document…</div>}
        {error && (
          <div className={s.message}>
            <p>{error}</p>
            <button type="button" className="btn-secondary btn-inline" onClick={load}>
              Try again
            </button>
          </div>
        )}
        {pdf && pageWidth > 0 &&
          Array.from({ length: pdf.numPages }, (_, index) => (
            <PdfPage key={index} pdf={pdf} pageIndex={index} width={pageWidth}>
              {field && field.page === index && status && !status.signed && (
                <SignatureFieldOverlay
                  left={(field.x / field.pageWidth) * 100}
                  top={(field.y / field.pageHeight) * 100}
                  width={(field.width / field.pageWidth) * 100}
                  height={(field.height / field.pageHeight) * 100}
                  canSign={status.canSign}
                  reason={status.reason}
                  onClick={() => setShowSignDialog(true)}
                />
              )}
            </PdfPage>
          ))}
        {loading && pdf && <div className={s.refreshing}>Updating document…</div>}
      </div>

      {showSignDialog && status?.preview && (
        <SignConfirmModal
          docType={docType}
          docId={docId}
          documentLabel={status.documentLabel}
          preview={status.preview}
          onCancel={() => setShowSignDialog(false)}
          onSigned={handleSigned}
        />
      )}

      <ConfirmModal
        isOpen={showRevokeConfirm}
        title="Revoke electronic signature?"
        message="The signature stamp will be removed and the document unlocked for editing. The assigned surveyor will need to sign it again."
        confirmText="Revoke"
        onConfirm={handleRevoke}
        onCancel={() => setShowRevokeConfirm(false)}
        isDestructive
      />
    </div>
  );
}

interface PdfPageProps {
  pdf: PDFDocumentProxy;
  pageIndex: number;
  width: number;
  children?: ReactNode;
}

function PdfPage({ pdf, pageIndex, width, children }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aspect, setAspect] = useState(841.89 / 595.28);

  useEffect(() => {
    let cancelled = false;
    let task: RenderTask | null = null;

    pdf.getPage(pageIndex + 1).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const base = page.getViewport({ scale: 1 });
      setAspect(base.height / base.width);

      const pixelRatio = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: (width / base.width) * pixelRatio });
      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      task = page.render({ canvasContext: canvas.getContext('2d')!, viewport });
      task.promise.catch(() => { /* cancelled by a newer render */ });
    });

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, pageIndex, width]);

  return (
    <div className={s.page} style={{ width, height: width * aspect }}>
      <canvas ref={canvasRef} className={s.canvas} aria-label={`Page ${pageIndex + 1}`} />
      {children}
    </div>
  );
}

interface SignatureFieldOverlayProps {
  left: number;
  top: number;
  width: number;
  height: number;
  canSign: boolean;
  reason: string | null;
  onClick: () => void;
}

function SignatureFieldOverlay({ left, top, width, height, canSign, reason, onClick }: SignatureFieldOverlayProps) {
  const style = { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` };

  if (!canSign) {
    return (
      <div className={`${s.field} ${s.fieldLocked}`} style={style} title={reason || undefined}>
        <span className={s.fieldLabel}>Awaiting signature by the assigned surveyor</span>
      </div>
    );
  }

  return (
    <button type="button" className={`${s.field} ${s.fieldActive}`} style={style} onClick={onClick}>
      <span className={s.fieldLabel}>✎ Click here to sign</span>
    </button>
  );
}
