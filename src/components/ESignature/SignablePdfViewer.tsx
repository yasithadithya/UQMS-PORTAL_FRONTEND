import { useCallback, useEffect, useRef, useState } from 'react';
import { PREVIEW_ONLY_HINT, saveBlob } from '@/utils/pdfDelivery';
import type { ReactNode } from 'react';
import { toast } from 'react-toastify';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { annotationsService, eSignatureService } from '@/api';
import type { ApiAnnotation, ApiAnnotationState, ApiSignatureStatus, SignableDocType } from '@/api';
import { CheckCircle2, Download, Highlighter, MousePointer2, PenLine, Stamp, Strikethrough, Trash2, Type, X } from 'lucide-react';
import { Button, ConfirmDialog, ErrorState, Input, LoadingBlock, Textarea } from '@/ui';
import { useAuth } from '@/context/AuthContext';
import AnnotationLayer, { type AnnotationTool } from './AnnotationLayer';
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
  /** Fetches the deliverable as issued (annotations drawn in); used by Download. */
  fetchPdf: () => Promise<Blob>;
  /** File name used by the Download button. */
  downloadFileName: string;
  /** Called whenever the signature status is loaded or changes. */
  onStatusChange?: (status: ApiSignatureStatus) => void;
}

/**
 * Renders a stored PDF with pdf.js and overlays its electronic signature field and its
 * annotations (certified stamp, strike-offs, crosses, text). Before signing, users who may edit
 * the document can add and move annotations; signing locks them. Clicking the signature field
 * (when the user may sign) opens the signing dialog; the signed PDF is then re-fetched.
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
  const [downloading, setDownloading] = useState(false);

  const [annotations, setAnnotations] = useState<ApiAnnotationState | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftItems, setDraftItems] = useState<ApiAnnotation[]>([]);
  const [tool, setTool] = useState<AnnotationTool>('select');
  const [selected, setSelected] = useState<number | null>(null);
  const [savingAnnotations, setSavingAnnotations] = useState(false);
  const [pageWidthsPt, setPageWidthsPt] = useState<Record<number, number>>({});
  const { user, users } = useAuth();
  const stampName = users.find(u => u._id === user?.id)?.fullName || user?.username || '';

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
      // The PDF is shown without its annotations; they are drawn on top so they can be edited.
      const [annotationRes, blob] = await Promise.all([
        annotationsService.get(docType, docId),
        annotationsService.getPdfWithoutAnnotations(docType, docId),
      ]);
      const pdfjs = await loadPdfJs();
      const doc = await pdfjs.getDocument({ data: await blob.arrayBuffer(), isEvalSupported: false }).promise;
      applyStatus(statusRes.data);
      setAnnotations(annotationRes.data);
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

  const handleDownload = async () => {
    if (!status?.signed) return;
    setDownloading(true);
    try {
      // The issued copy, with annotations drawn in by the server.
      saveBlob(await fetchPdfRef.current(), downloadFileName);
    } catch (err: any) {
      toast.error('Failed to download: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // ── Annotations ──
  const startEditing = () => {
    setDraftItems(annotations?.items ?? []);
    setTool('select');
    setSelected(null);
    setEditing(true);
  };
  const cancelEditing = () => {
    setEditing(false);
    setSelected(null);
  };
  const createItem = (item: ApiAnnotation) => {
    setDraftItems(prev => [...prev, item]);
    setSelected(draftItems.length);
    setTool('select');
  };
  const changeItem = (index: number, patch: Partial<ApiAnnotation>) =>
    setDraftItems(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const deleteSelected = () => {
    if (selected === null) return;
    setDraftItems(prev => prev.filter((_, i) => i !== selected));
    setSelected(null);
  };
  const saveAnnotations = async () => {
    setSavingAnnotations(true);
    try {
      const res = await annotationsService.save(docType, docId, draftItems);
      setAnnotations(prev => (prev ? { ...prev, items: res.data.items } : prev));
      setEditing(false);
      setSelected(null);
      toast.success('Changes to the document saved.');
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSavingAnnotations(false);
    }
  };

  const shownItems = editing ? draftItems : annotations?.items ?? [];
  const selectedItem = selected !== null ? draftItems[selected] : null;
  const canAnnotate = !!annotations?.canEdit && !status?.signed;

  const field = status?.signatureField ?? null;

  return (
    <div className={s.viewer}>
      <div className={s.toolbar}>
        {status?.signed && status.eSignature ? (
          <span className={`${s.statusBadge} ${s.statusSigned}`}>
            <CheckCircle2 aria-hidden="true" />
            Signed electronically by {status.eSignature.signedByName} on {formatSigningDate(status.eSignature.signedAt)}
          </span>
        ) : status ? (
          <span className={`${s.statusBadge} ${s.statusPending}`}>
            {status.canSign ? 'Awaiting your signature — click the signature field' : 'Not signed'}
          </span>
        ) : (
          <span />
        )}
        <div className={s.toolbarActions}>
          {canAnnotate && !editing && (
            <Button variant="secondary" size="sm" icon={<Highlighter />} onClick={startEditing} disabled={loading}>
              Edit document
            </Button>
          )}
          {status?.canRevoke && (
            <Button variant="dangerGhost" size="sm" onClick={() => setShowRevokeConfirm(true)} loading={revoking} disabled={loading}>
              Revoke signature
            </Button>
          )}
          <Button
            variant="secondary" size="sm" icon={<Download />} onClick={handleDownload} loading={downloading}
            disabled={!pdfBlob || loading || !status?.signed}
            title={status?.signed ? undefined : PREVIEW_ONLY_HINT}
          >
            {status?.signed ? 'Download PDF' : 'Preview only'}
          </Button>
        </div>
      </div>

      {editing && (
        <div className={s.annotationTools} role="toolbar" aria-label="Document editing tools">
          <Button size="sm" variant={tool === 'select' ? 'primary' : 'secondary'} icon={<MousePointer2 />} onClick={() => setTool('select')}>Select / move</Button>
          <Button size="sm" variant={tool === 'strike' ? 'primary' : 'secondary'} icon={<Strikethrough />} onClick={() => setTool('strike')}
            title="Drag across the text to strike it off">Strike-off</Button>
          <Button size="sm" variant={tool === 'cross' ? 'primary' : 'secondary'} icon={<X />} onClick={() => setTool('cross')}
            title="Drag a box to cross it out">Cross / cancel</Button>
          <Button size="sm" variant={tool === 'text' ? 'primary' : 'secondary'} icon={<Type />} onClick={() => setTool('text')}
            title="Click where the text should go">Text</Button>
          {annotations?.allowsCosStamp && (
            <Button size="sm" variant={tool === 'cos-stamp' ? 'primary' : 'secondary'} icon={<Stamp />} onClick={() => setTool('cos-stamp')}
              title="Click where the certified stamp should go">Certified stamp</Button>
          )}
          {selectedItem?.type === 'text' && selected !== null && (
            <>
              <Textarea aria-label="Text" rows={1} value={selectedItem.text ?? ''}
                onChange={e => changeItem(selected, { text: e.target.value })} />
              <Input aria-label="Font size (pt)" type="number" min={6} max={36} value={String(selectedItem.fontSize ?? 11)}
                onChange={e => changeItem(selected, { fontSize: Math.min(36, Math.max(6, Number(e.target.value) || 11)) })} />
            </>
          )}
          {selected !== null && (
            <Button size="sm" variant="dangerGhost" icon={<Trash2 />} onClick={deleteSelected}>Delete</Button>
          )}
          <span style={{ flex: 1 }} />
          <Button size="sm" onClick={cancelEditing} disabled={savingAnnotations}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={saveAnnotations} loading={savingAnnotations}
            disabled={draftItems.some(i => i.type === 'text' && !i.text?.trim())}>
            Save changes
          </Button>
        </div>
      )}

      <div ref={containerRef} className={s.pages}>
        {loading && !pdf && <div className={s.message}><LoadingBlock label="Loading document…" /></div>}
        {error && (
          <div className={s.message}>
            <ErrorState title="Couldn't open the document" message={error} onRetry={load} />
          </div>
        )}
        {pdf && pageWidth > 0 &&
          Array.from({ length: pdf.numPages }, (_, index) => (
            <PdfPage
              key={index} pdf={pdf} pageIndex={index} width={pageWidth}
              onPageWidthPt={w => setPageWidthsPt(prev => (prev[index] === w ? prev : { ...prev, [index]: w }))}
            >
              {field && field.page === index && status && !status.signed && !editing && (
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
              <AnnotationLayer
                pageIndex={index}
                pageWidthPt={pageWidthsPt[index] ?? 595.28}
                renderWidth={pageWidth}
                items={shownItems}
                editing={editing}
                tool={tool}
                selected={selected}
                stampName={stampName}
                onCreate={createItem}
                onChange={changeItem}
                onSelect={setSelected}
              />
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

      <ConfirmDialog
        open={showRevokeConfirm}
        title="Revoke electronic signature?"
        message="The signature stamp will be removed and the document unlocked for editing. The assigned surveyor will need to sign it again."
        confirmText="Revoke"
        onConfirm={handleRevoke}
        onCancel={() => setShowRevokeConfirm(false)}
        destructive
      />
    </div>
  );
}

interface PdfPageProps {
  pdf: PDFDocumentProxy;
  pageIndex: number;
  width: number;
  /** Reports the page width in PDF points once known. */
  onPageWidthPt?: (widthPt: number) => void;
  children?: ReactNode;
}

function PdfPage({ pdf, pageIndex, width, onPageWidthPt, children }: PdfPageProps) {
  const onPageWidthPtRef = useRef(onPageWidthPt);
  onPageWidthPtRef.current = onPageWidthPt;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aspect, setAspect] = useState(841.89 / 595.28);

  useEffect(() => {
    let cancelled = false;
    let task: RenderTask | null = null;

    pdf.getPage(pageIndex + 1).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const base = page.getViewport({ scale: 1 });
      setAspect(base.height / base.width);
      onPageWidthPtRef.current?.(base.width);

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
      <span className={s.fieldLabel}><PenLine aria-hidden="true" /> Click here to sign</span>
    </button>
  );
}
