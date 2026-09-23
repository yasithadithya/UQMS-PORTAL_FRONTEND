import { request } from '../client';
import type { ApiSignatureStatus, SignableDocType } from '../types';

export const eSignatureService = {
  /** Signature status and field position; re-renders PDFs generated before signature fields existed. */
  getStatus: (docType: SignableDocType, id: string) => {
    return request<{ success: boolean; data: ApiSignatureStatus }>(`/e-signatures/${docType}/${id}`);
  },

  /** Signs as the logged-in assigned surveyor; the document is locked afterwards. */
  sign: (docType: SignableDocType, id: string, location: string) => {
    return request<{ success: boolean; message: string; data: ApiSignatureStatus }>(`/e-signatures/${docType}/${id}/sign`, {
      method: 'POST',
      body: JSON.stringify({ location }),
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
