import { request } from '../client';
import type { ApiNote, ApiNoteItem } from '../types';

export const notesService = {
  getNotesByVesselId: (vesselId: string) => {
    return request<{ success: boolean; data: ApiNote }>(`/notes/vessel/${vesselId}`);
  },
  updateNotesByVesselId: (vesselId: string, notes: ApiNoteItem[]) => {
    return request<{ success: boolean; message: string; data: ApiNote }>(`/notes/vessel/${vesselId}`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  },
};
