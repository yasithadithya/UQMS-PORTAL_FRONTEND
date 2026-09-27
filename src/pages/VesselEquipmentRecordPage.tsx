import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { Badge, Button, ButtonLink, Card, EmptyState, Field, Input, LoadingBlock, PageHeader, Section, StickyActionBar } from '@/ui';
import s from './VesselEquipmentRecordPage.module.css';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { toast } from 'react-toastify';
import { firstEntryService, vesselEquipmentRecordService } from '@/api';
import type { ApiFirstEntrySurveyReport, ApiVesselEquipmentRecordItem } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';

// Parsers and formatters for structured remarks
const parseLifeRafts = (val: string) => {
  const count = val.match(/Count:\s*([^;]+)/i)?.[1]?.trim() || '';
  const capacity = val.match(/Capacity:\s*([^;]+)/i)?.[1]?.trim() || '';
  const serialNumber = val.match(/Serial Number:\s*([^;]+)/i)?.[1]?.trim() || '';
  return { count, capacity, serialNumber };
};

const formatLifeRafts = (count: string, capacity: string, serialNumber: string) => {
  const parts = [];
  if (count) parts.push(`Count: ${count}`);
  if (capacity) parts.push(`Capacity: ${capacity}`);
  if (serialNumber) parts.push(`Serial Number: ${serialNumber}`);
  return parts.join('; ');
};

const parse1110 = (val: string) => {
  const count = val.match(/Count:\s*([^;]+)/i)?.[1]?.trim() || '';
  const serialNumber = val.match(/Serial Number:\s*([^;]+)/i)?.[1]?.trim() || '';
  const expiry = val.match(/Expiry:\s*([^;]+)/i)?.[1]?.trim() || '';
  return { count, serialNumber, expiry };
};

const format1110 = (count: string, serialNumber: string, expiry: string) => {
  const parts = [];
  if (count) parts.push(`Count: ${count}`);
  if (serialNumber) parts.push(`Serial Number: ${serialNumber}`);
  if (expiry) parts.push(`Expiry: ${expiry}`);
  return parts.join('; ');
};

const parseExtinguishers = (val: string) => {
  const count = val.match(/Count:\s*([^;]+)/i)?.[1]?.trim() || '';
  const type = val.match(/Type:\s*([^;]+)/i)?.[1]?.trim() || '';
  return { count, type };
};

const formatExtinguishers = (count: string, type: string) => {
  const parts = [];
  if (count) parts.push(`Count: ${count}`);
  if (type) parts.push(`Type: ${type}`);
  return parts.join('; ');
};

const parseHoses = (val: string) => {
  const count = val.match(/Count:\s*([^;]+)/i)?.[1]?.trim() || '';
  const material = val.match(/Material:\s*([^;]+)/i)?.[1]?.trim() || '';
  const width = val.match(/Width:\s*([^;]+)/i)?.[1]?.trim() || '';
  const length = val.match(/Length:\s*([^;]+)/i)?.[1]?.trim() || '';
  return { count, material, width, length };
};

const formatHoses = (count: string, material: string, width: string, length: string) => {
  const parts = [];
  if (count) parts.push(`Count: ${count}`);
  if (material) parts.push(`Material: ${material}`);
  if (width) parts.push(`Width: ${width}`);
  if (length) parts.push(`Length: ${length}`);
  return parts.join('; ');
};

export default function VesselEquipmentRecordPage() {
  const { can } = useAuth();
  const canSave = can(MODULE_KEYS.marineReports, 'update');
  const navigate = useNavigate();
  const unsaved = useUnsavedChanges();
  const { id, module } = useParams<{ id: string; module?: string }>(); // Survey Report ID
  const activeModule = module || 'reporting';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [surveyReport, setSurveyReport] = useState<ApiFirstEntrySurveyReport | null>(null);
  const [vesselId, setVesselId] = useState('');
  const [equipmentRecords, setEquipmentRecords] = useState<ApiVesselEquipmentRecordItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!id) return;

        // Fetch Survey Report details to show header info
        const reportRes = await firstEntryService.getFirstEntrySurveyReportById(id);
        if (reportRes.success && reportRes.data) {
          setSurveyReport(reportRes.data);
          const vId = typeof reportRes.data.vesselId === 'object' 
            ? reportRes.data.vesselId._id 
            : reportRes.data.vesselId || '';
          setVesselId(vId);
        } else {
          toast.error('Survey Report details could not be loaded.');
        }

        // Fetch Equipment Records for this Survey Report
        const recordRes = await vesselEquipmentRecordService.getEquipmentRecordBySurveyReportId(id);
        if (recordRes.success && recordRes.data) {
          setEquipmentRecords(recordRes.data.equipmentRecords || []);
        } else {
          toast.error('Failed to load equipment checklist.');
        }
      } catch (err: any) {
        toast.error('Error loading page data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Handle status toggle (Provided, Not Provided, Not Applicable)
  const handleStatusChange = (index: number, newStatus: 'Provided' | 'Not Provided' | 'Not Applicable') => {
    const updated = [...equipmentRecords];
    updated[index] = {
      ...updated[index],
      status: newStatus,
    };
    setEquipmentRecords(updated);
  };

  // Handle remarks change
  const handleRemarksChange = (index: number, val: string) => {
    const updated = [...equipmentRecords];
    updated[index] = {
      ...updated[index],
      remarks: val,
    };
    setEquipmentRecords(updated);
  };

  // Group records by Code Ref No for grouped UI rendering
  const groupedRecords = useMemo(() => {
    const groups: { [key: string]: { originalIndex: number; record: ApiVesselEquipmentRecordItem }[] } = {};
    equipmentRecords.forEach((item, index) => {
      const code = item.questionId?.codeRefNo || 'Other';
      if (!groups[code]) {
        groups[code] = [];
      }
      groups[code].push({ originalIndex: index, record: item });
    });
    return groups;
  }, [equipmentRecords]);

  // Handle form save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !vesselId) {
      toast.error('Missing required Survey Report or Vessel reference.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        vesselId,
        equipmentRecords: equipmentRecords.map(item => ({
          questionId: item.questionId._id,
          status: item.status,
          remarks: item.remarks || '',
        })),
      };

      const res = await vesselEquipmentRecordService.saveEquipmentRecord(id, payload);
      if (res.success) {
        toast.success('Record of Equipment saved successfully!');
        // Navigate back to the survey report edit page
        unsaved.allowNavigation();
        navigate(`/${activeModule}/marine/first-entry/survey-report/edit/${id}`);
      } else {
        toast.error(res.message || 'Failed to save equipment record.');
      }
    } catch (err: any) {
      toast.error('Error saving equipment record: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  /** A small labelled input used by the structured remarks (count, serial number, …). */
  const part = (label: string, value: string, onChange: (v: string) => void) => (
    <Field label={label} key={label}>
      <Input placeholder={label} value={value} onChange={e => onChange(e.target.value)} />
    </Field>
  );

  const renderRemarksField = (record: ApiVesselEquipmentRecordItem, originalIndex: number) => {
    const desc = record.questionId?.description || '';
    const code = record.questionId?.codeRefNo || '';
    const status = record.status;
    const value = record.remarks || '';
    const set = (v: string) => handleRemarksChange(originalIndex, v);

    // 1. Total number of Life rafts (Total number of persons accommodated) -> Count, Capacity, Serial Number
    if (desc.includes('Total number of Life rafts')) {
      const { count, capacity, serialNumber } = parseLifeRafts(value);
      return (
        <div className={s.parts}>
          {part('Count', count, v => set(formatLifeRafts(v, capacity, serialNumber)))}
          {part('Capacity', capacity, v => set(formatLifeRafts(count, v, serialNumber)))}
          {part('Serial number', serialNumber, v => set(formatLifeRafts(count, capacity, v)))}
        </div>
      );
    }

    // 2. Code 11.10 - Count, Serial Number, Expiry (only if status is Provided)
    if (code === '11.10') {
      if (status !== 'Provided') {
        return <p className={s.note}>Details can be added once this is marked Provided.</p>;
      }
      const { count, serialNumber, expiry } = parse1110(value);
      return (
        <div className={s.parts}>
          {part('Count', count, v => set(format1110(v, serialNumber, expiry)))}
          {part('Expiry', expiry, v => set(format1110(count, serialNumber, v)))}
          {part('Serial number', serialNumber, v => set(format1110(count, v, expiry)))}
        </div>
      );
    }

    // 3. Number of Portable fire extinguishers & Type -> Count and Type
    if (desc === 'Number of Portable fire extinguishers & Type') {
      const { count, type } = parseExtinguishers(value);
      return (
        <div className={s.parts}>
          {part('Count', count, v => set(formatExtinguishers(v, type)))}
          {part('Type', type, v => set(formatExtinguishers(count, v)))}
        </div>
      );
    }

    // 4. Number of Fire hoses with spray nozzles -> Count, Material, Width and Length
    if (desc === 'Number of Fire hoses with spray nozzles') {
      const { count, material, width, length } = parseHoses(value);
      return (
        <div className={s.parts}>
          {part('Count', count, v => set(formatHoses(v, material, width, length)))}
          {part('Material', material, v => set(formatHoses(count, v, width, length)))}
          {part('Width', width, v => set(formatHoses(count, material, v, length)))}
          {part('Length', length, v => set(formatHoses(count, material, width, v)))}
        </div>
      );
    }

    // Default remarks text input
    return (
      <Field label="Remarks" hideLabel>
        <Input value={value} onChange={e => set(e.target.value)} placeholder="Remarks (optional)" />
      </Field>
    );
  };

  const STATUS_OPTIONS = [
    { value: 'Provided', label: 'Provided', tone: s.optProvided },
    { value: 'Not Provided', label: 'Not provided', tone: s.optMissing },
    { value: 'Not Applicable', label: 'N/A', tone: s.optNa },
  ] as const;

  if (loading) {
    return <LoadingBlock label="Loading record of equipment…" />;
  }

  const backPath = `/${activeModule}/marine/first-entry/survey-report/edit/${id}`;
  const groups = Object.entries(groupedRecords);
  const answered = equipmentRecords.filter(r => r.status).length;

  return (
    <div className="animate-in">
      <PageHeader
        back={{ href: backPath, label: 'Survey report' }}
        title="Record of equipment"
        description={surveyReport
          ? [surveyReport.shipName, surveyReport.uqmsNo, surveyReport.reportNo].filter(Boolean).join(' · ')
          : 'Recommended equipment for the vessel, grouped by code.'}
        meta={equipmentRecords.length > 0 && <Badge tone={answered === equipmentRecords.length ? 'success' : 'neutral'}>{answered}/{equipmentRecords.length} answered</Badge>}
      />

      <form onSubmit={handleSave} onChangeCapture={unsaved.markDirty} className={s.form}>
        {groups.length === 0 ? (
          <Card padding="none">
            <EmptyState icon={<ClipboardList />} title="No equipment questions yet" description="Equipment questions are set up by an administrator in master data." />
          </Card>
        ) : (
          groups.map(([codeRefNo, items]) => (
            <Section key={codeRefNo} title={<><Badge tone="accent">Code {codeRefNo}</Badge> Recommended equipment</>} padding="none">
              <ul className={s.items}>
                {items.map(({ originalIndex, record }) => (
                  <li key={record.questionId._id} className={s.item}>
                    <p className={s.question}>{record.questionId.description}</p>
                    <div className={s.segmented} role="radiogroup" aria-label={`Status: ${record.questionId.description}`}>
                      {STATUS_OPTIONS.map(opt => {
                        const on = record.status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            className={`${s.opt} ${on ? `${s.optOn} ${opt.tone}` : ''}`}
                            onClick={() => { handleStatusChange(originalIndex, opt.value); unsaved.markDirty(); }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className={s.remarks}>{renderRemarksField(record, originalIndex)}</div>
                  </li>
                ))}
              </ul>
            </Section>
          ))
        )}

        <StickyActionBar dirty={unsaved.dirty}>
          <ButtonLink to={backPath}>Cancel</ButtonLink>
          <Button type="submit" variant="primary" loading={saving} disabled={!canSave}
            title={canSave ? undefined : 'You do not have permission to save this record.'}>
            Save record
          </Button>
        </StickyActionBar>
      </form>
      {unsaved.dialog}
    </div>
  );
}
