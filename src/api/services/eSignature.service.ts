import { request, requestBlob } from '../client';
import type { ApiSignatureStatus, SignableDocType } from '../types';

export const eSignatureService = {
  /** Signature status and field position; re-renders PDFs generated before signature fields existed. */
  getStatus: (docType: SignableDocType, id: string) => {
    return request<{ success: boolean; data: ApiSignatureStatus }>(`/e-signatures/${docType}/${id}`);
  },

  /** Signs the document (locked afterwards). Admin / UQMS admin may pass an assigned surveyor to sign as. */
  sign: (docType: SignableDocType, id: string, location: string, signerId?: string) => {
    return request<{ success: boolean; message: string; data: ApiSignatureStatus }>(`/e-signatures/${docType}/${id}/sign`, {
      method: 'POST',
      body: JSON.stringify({ location, signerId }),
    });
  },

  /** Admin only: removes the signature and unlocks the document. */
  revoke: (docType: SignableDocType, id: string) => {
    return request<{ success: boolean; message: string; data: ApiSignatureStatus }>(`/e-signatures/${docType}/${id}/sign`, {
      method: 'DELETE',
    });
  },
};

export default eSignatureService;

export type AnnotationType = 'cos-stamp' | 'strike' | 'cross' | 'text';

/** A mark over a deliverable PDF; position and size are fractions (0–1) of the page from its top-left. */
export interface ApiAnnotation {
  type: AnnotationType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  stampedAt?: string;
}

export interface ApiAnnotationState {
  items: ApiAnnotation[];
  signed: boolean;
  canEdit: boolean;
  allowsCosStamp: boolean;
}

/** Stored PDF endpoints per document type (the viewer asks for them without annotations drawn in). */
const PDF_PATH: Record<SignableDocType, (id: string) => string> = {
  'survey-report': (id) => `/survey-reports/pdf/${id}`,
  'docking-cert': (id) => `/docking-survey/pdf/${id}`,
  scccos: (id) => `/scccos/pdf/${id}`,
  'daily-report': (id) => `/first-entry-full-reports/${id}/daily-report-pdf`,
};

export const annotationsService = {
  get: (docType: SignableDocType, id: string) =>
    request<{ success: boolean; data: ApiAnnotationState }>(`/document-annotations/${docType}/${id}`),
  save: (docType: SignableDocType, id: string, items: ApiAnnotation[]) =>
    request<{ success: boolean; message: string; data: { items: ApiAnnotation[] } }>(`/document-annotations/${docType}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),
  /** The PDF without its annotations, for editing them on top. */
  getPdfWithoutAnnotations: (docType: SignableDocType, id: string) => requestBlob(`${PDF_PATH[docType](id)}?annotations=0`),
};
