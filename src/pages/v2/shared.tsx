import { useState, type ReactNode } from 'react';
import { ExternalLink, FileText, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { Badge, IconButton, buttonClassName } from '@/ui';
import DragDropFileUpload from '@/components/DragDropFileUpload';
import { useAuth } from '@/context/AuthContext';
import { toSlug } from '@/utils/modules';
import { jobsService } from '@/api';
import type { ApiJobDocument, ApiJobPerson, ApiSurveyType } from '@/api';
import { JOB_STATUS_LABELS, JOB_STATUS_TONES, MAIN_SURVEY_TYPE_LABELS, type MainSurveyType } from '@/config/surveyCategories';
import s from './v2.module.css';

export const personName = (p: ApiJobPerson | string | null | undefined): string =>
  !p ? '—' : typeof p === 'string' ? p : p.fullName || p.nameWithInitials || p.username || '—';

export const surveyTypeLabel = (t: ApiSurveyType | string): string => (typeof t === 'string' ? t : `${t.name}`);

export const mainTypeLabel = (t: string): string => MAIN_SURVEY_TYPE_LABELS[t as MainSurveyType] ?? t;

export function JobStatusBadge({ status }: { status: string }) {
  return <Badge tone={JOB_STATUS_TONES[status] ?? 'neutral'} dot>{JOB_STATUS_LABELS[status] ?? status}</Badge>;
}

/** URL of a system module by key (module URLs are built from their names). */
export function useModulePath() {
  const { modules } = useAuth();
  return (key: string): string => {
    const mod = modules.find(m => m.key === key);
    return mod ? `/${toSlug(mod.name)}` : '/';
  };
}

export function Notice({ tone = 'info', icon, children }: { tone?: 'info' | 'warning' | 'danger'; icon?: ReactNode; children: ReactNode }) {
  const cls = tone === 'warning' ? s.noticeWarning : tone === 'danger' ? s.noticeDanger : '';
  return (
    <div className={`${s.notice} ${cls}`} role={tone === 'info' ? 'status' : 'alert'}>
      {icon}
      <div>{children}</div>
    </div>
  );
}

const sizeLabel = (size?: number) => (size ? `${(size / 1024 / 1024).toFixed(2)} MB` : '');

/** A list of stored files with optional upload and remove. */
export function DocumentList({
  documents,
  emptyText,
  uploadPrefix,
  uploadLabel,
  readOnly,
  onAdd,
  onRemove,
}: {
  documents: ApiJobDocument[];
  emptyText: string;
  uploadPrefix?: string;
  uploadLabel?: string;
  readOnly?: boolean;
  onAdd?: (doc: ApiJobDocument) => Promise<void> | void;
  onRemove?: (doc: ApiJobDocument, index: number) => Promise<void> | void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || !uploadPrefix || !onAdd) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        try {
          const res = await jobsService.uploadFile(file, uploadPrefix);
          await onAdd({ name: file.name, key: res.data.key, url: res.data.url, contentType: res.data.contentType, size: res.data.size });
        } catch (err: any) {
          toast.error(`Upload failed for ${file.name}: ${err.message}`);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {!readOnly && onAdd && (
        <DragDropFileUpload
          onFilesSelected={handleFiles}
          multiple
          accept="application/pdf,image/*,.doc,.docx"
          disabled={uploading}
          text={<span>{uploading ? 'Uploading…' : uploadLabel ?? 'Add documents'}</span>}
          subText="PDF, images or Word · max 10 MB each"
        />
      )}
      {documents.length === 0 ? (
        <p className={s.hint} style={{ marginTop: 'var(--space-3)' }}>{emptyText}</p>
      ) : (
        <ul className={s.docList}>
          {documents.map((doc, idx) => (
            <li key={doc._id || `${doc.key}-${idx}`} className={s.docRow}>
              <span className={s.docIcon} aria-hidden="true"><FileText /></span>
              <span className={s.docText}>
                <span className={s.docName}>{doc.name}</span>
                <span className={s.docMeta}>{sizeLabel(doc.size)}</span>
              </span>
              {doc.url && (
                <a className={buttonClassName({ variant: 'ghost', size: 'sm' })} href={doc.url} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" /><span>Open</span>
                </a>
              )}
              {!readOnly && onRemove && (
                <IconButton label={`Remove ${doc.name}`} icon={<X />} size="sm" variant="dangerGhost" onClick={() => onRemove(doc, idx)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
