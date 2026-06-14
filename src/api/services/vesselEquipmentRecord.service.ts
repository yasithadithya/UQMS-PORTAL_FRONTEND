import { request } from '../client';
import type { ApiVesselEquipmentRecord } from '../types';

export const vesselEquipmentRecordService = {
  getEquipmentRecordBySurveyReportId: (surveyReportId: string) => {
    return request<{ success: boolean; data: ApiVesselEquipmentRecord }>(`/vessel-equipment-records/report/${surveyReportId}`);
  },
  saveEquipmentRecord: (surveyReportId: string, payload: { vesselId: string; equipmentRecords: any[] }) => {
    return request<{ success: boolean; message: string; data: ApiVesselEquipmentRecord }>(`/vessel-equipment-records/report/${surveyReportId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
