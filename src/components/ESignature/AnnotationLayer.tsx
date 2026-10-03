import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ApiAnnotation, AnnotationType } from '@/api';
import s from './ESignature.module.css';

export type AnnotationTool = 'select' | AnnotationType;

/** Default size of a placed item, as fractions of the page. */
const PLACED_SIZE: Record<'text' | 'cos-stamp', { width: number; height: number }> = {
  text: { width: 0.3, height: 0.03 },
  'cos-stamp': { width: 0.3, height: 0.09 },
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

interface AnnotationLayerProps {
  pageIndex: number;
  /** Page width in PDF points and as rendered in pixels, to scale text the way it will print. */
  pageWidthPt: number;
  renderWidth: number;
  /** Every annotation on the document, with its index; only this page's are drawn. */
  items: ApiAnnotation[];
  editing: boolean;
  tool: AnnotationTool;
  selected: number | null;
  /** Name printed on a new COS stamp. */
  stampName: string;
  onCreate: (item: ApiAnnotation) => void;
  onChange: (index: number, patch: Partial<ApiAnnotation>) => void;
  onSelect: (index: number | null) => void;
}

/**
 * Draws the certified stamp, strike-offs, crosses and text over one PDF page and, while editing,
 * lets the user add them (drag for strike/cross, click for text/stamp) and move the selected one.
 */
export default function AnnotationLayer({
  pageIndex, pageWidthPt, renderWidth, items, editing, tool, selected, stampName, onCreate, onChange, onSelect,
}: AnnotationLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const drag = useRef<{ index: number; dx: number; dy: number } | null>(null);

  const point = (e: ReactPointerEvent) => {
    const rect = layerRef.current!.getBoundingClientRect();
    return { x: clamp((e.clientX - rect.left) / rect.width), y: clamp((e.clientY - rect.top) / rect.height) };
  };
  const pxPerPt = renderWidth / pageWidthPt;

  const handleLayerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editing || e.target !== layerRef.current) return;
    const p = point(e);
    if (tool === 'strike' || tool === 'cross') {
      layerRef.current!.setPointerCapture(e.pointerId);
      setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
      return;
    }
    if (tool === 'text' || tool === 'cos-stamp') {
      const size = PLACED_SIZE[tool];
      const item: ApiAnnotation = {
        type: tool,
        page: pageIndex,
        x: clamp(p.x, 0, 1 - size.width),
        y: clamp(p.y, 0, 1 - size.height),
        ...size,
        ...(tool === 'text' ? { text: 'Text', fontSize: 11 } : { text: stampName, stampedAt: new Date().toISOString() }),
      };
      onCreate(item);
      return;
    }
    onSelect(null);
  };

  const handleLayerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (draft) {
      const p = point(e);
      setDraft({ ...draft, x1: p.x, y1: p.y });
      return;
    }
    if (drag.current) {
      const p = point(e);
      const item = items[drag.current.index];
      onChange(drag.current.index, {
        x: clamp(p.x - drag.current.dx, 0, 1 - item.width),
        y: clamp(p.y - drag.current.dy, 0, 1 - item.height),
      });
    }
  };

  /** The browser took over the gesture (e.g. a scroll): drop the half-drawn item. */
  const handleLayerCancel = () => {
    setDraft(null);
    drag.current = null;
  };

  const handleLayerUp = () => {
    if (draft && (tool === 'strike' || tool === 'cross')) {
      const x = Math.min(draft.x0, draft.x1);
      const y = Math.min(draft.y0, draft.y1);
      const width = Math.abs(draft.x1 - draft.x0);
      // A strike-off is a line: keep a thin box around it even when dragged flat.
      const height = tool === 'strike' ? Math.max(Math.abs(draft.y1 - draft.y0), 0.012) : Math.abs(draft.y1 - draft.y0);
      if (width > 0.01 && (tool === 'strike' || height > 0.008)) {
        onCreate({ type: tool, page: pageIndex, x, y: clamp(y, 0, 1 - height), width, height });
      }
    }
    setDraft(null);
    drag.current = null;
  };

  const startMove = (e: ReactPointerEvent<HTMLElement>, index: number) => {
    if (!editing) return;
    e.stopPropagation();
    onSelect(index);
    if (tool !== 'select') return;
    const p = point(e);
    drag.current = { index, dx: p.x - items[index].x, dy: p.y - items[index].y };
    layerRef.current!.setPointerCapture(e.pointerId);
  };

  const box = (a: { x: number; y: number; width: number; height: number }) => ({
    left: `${a.x * 100}%`, top: `${a.y * 100}%`, width: `${a.width * 100}%`, height: `${a.height * 100}%`,
  });

  return (
    <div
      ref={layerRef}
      className={`${s.annotationLayer} ${editing ? s.annotationEditing : ''}`}
      data-tool={editing ? tool : undefined}
      onPointerDown={handleLayerDown}
      onPointerMove={handleLayerMove}
      onPointerUp={handleLayerUp}
      onPointerCancel={handleLayerCancel}
    >
      {items.map((item, index) => {
        if (item.page !== pageIndex) return null;
        const cls = `${s.annotation} ${editing && selected === index ? s.annotationSelected : ''}`;
        const common = { style: box(item), onPointerDown: (e: ReactPointerEvent<HTMLElement>) => startMove(e, index) };
        switch (item.type) {
          case 'strike':
            return <div key={index} {...common} className={`${cls} ${s.annStrike}`} aria-label="Strike-off" />;
          case 'cross':
            return (
              <div key={index} {...common} className={cls} aria-label="Cancellation cross">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={s.annCross} aria-hidden="true">
                  <line x1="0" y1="0" x2="100" y2="100" /><line x1="0" y1="100" x2="100" y2="0" />
                </svg>
              </div>
            );
          case 'text':
            return (
              <div key={index} {...common} className={`${cls} ${s.annText}`} style={{ ...box(item), fontSize: `${(item.fontSize ?? 11) * pxPerPt}px` }}>
                {item.text}
              </div>
            );
          case 'cos-stamp':
            return (
              <div key={index} {...common} className={`${cls} ${s.annStamp}`} aria-label="Certified stamp" style={{ ...box(item), fontSize: `${7 * pxPerPt}px` }}>
                <strong>CERTIFIED</strong>
                <span>Universal Quality Management Systems (Pvt) Ltd</span>
                {item.text && <span>{item.text}</span>}
              </div>
            );
          default:
            return null;
        }
      })}
      {draft && (
        <div
          className={`${s.annotation} ${tool === 'strike' ? s.annStrike : s.annDraft}`}
          style={box({
            x: Math.min(draft.x0, draft.x1), y: Math.min(draft.y0, draft.y1),
            width: Math.abs(draft.x1 - draft.x0), height: Math.max(Math.abs(draft.y1 - draft.y0), 0.012),
          })}
        />
      )}
    </div>
  );
}
