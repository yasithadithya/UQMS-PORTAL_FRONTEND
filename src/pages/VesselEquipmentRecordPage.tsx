import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { firstEntryService, vesselEquipmentRecordService } from '@/api';
import type { ApiFirstEntrySurveyReport, ApiVesselEquipmentRecordItem } from '@/api';

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
  const navigate = useNavigate();
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

  const renderRemarksField = (record: ApiVesselEquipmentRecordItem, originalIndex: number) => {
    const desc = record.questionId?.description || '';
    const code = record.questionId?.codeRefNo || '';
    const status = record.status;
    const value = record.remarks || '';

    // 1. Total number of Life rafts (Total number of persons accommodated) -> Count, Capacity, Serial Number
    if (desc.includes('Total number of Life rafts')) {
      const { count, capacity, serialNumber } = parseLifeRafts(value);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '280px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Count</label>
              <input
                type="text"
                placeholder="Count"
                className="form-input"
                value={count}
                onChange={(e) => {
                  const val = formatLifeRafts(e.target.value, capacity, serialNumber);
                  handleRemarksChange(originalIndex, val);
                }}
                style={{ margin: 0, padding: '6px 8px', fontSize: '12px', borderRadius: '6px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Capacity</label>
              <input
                type="text"
                placeholder="Capacity"
                className="form-input"
                value={capacity}
                onChange={(e) => {
                  const val = formatLifeRafts(count, e.target.value, serialNumber);
                  handleRemarksChange(originalIndex, val);
                }}
                style={{ margin: 0, padding: '6px 8px', fontSize: '12px', borderRadius: '6px' }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Serial Number</label>
            <input
              type="text"
              placeholder="Serial Number"
              className="form-input"
              value={serialNumber}
              onChange={(e) => {
                const val = formatLifeRafts(count, capacity, e.target.value);
                handleRemarksChange(originalIndex, val);
              }}
              style={{ margin: 0, padding: '6px 8px', fontSize: '12px', borderRadius: '6px' }}
            />
          </div>
        </div>
      );
    }

    // 2. Code 11.10 - Count, Serial Number, Expiry (only if status is Provided)
    if (code === '11.10') {
      if (status !== 'Provided') {
        return (
          <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
            Only available if Provided
          </div>
        );
      }
      const { count, serialNumber, expiry } = parse1110(value);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '280px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Count</label>
              <input
                type="text"
                placeholder="Count"
                className="form-input"
                value={count}
                onChange={(e) => {
                  const val = format1110(e.target.value, serialNumber, expiry);
                  handleRemarksChange(originalIndex, val);
                }}
                style={{ margin: 0, padding: '6px 8px', fontSize: '12px', borderRadius: '6px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Expiry</label>
              <input
                type="text"
                placeholder="Expiry"
                className="form-input"
                value={expiry}
                onChange={(e) => {
                  const val = format1110(count, serialNumber, e.target.value);
                  handleRemarksChange(originalIndex, val);
                }}
                style={{ margin: 0, padding: '6px 8px', fontSize: '12px', borderRadius: '6px' }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Serial Number</label>
            <input
              type="text"
              placeholder="Serial Number"
              className="form-input"
              value={serialNumber}
              onChange={(e) => {
                const val = format1110(count, e.target.value, expiry);
                handleRemarksChange(originalIndex, val);
              }}
              style={{ margin: 0, padding: '6px 8px', fontSize: '12px', borderRadius: '6px' }}
            />
          </div>
        </div>
      );
    }

    // 3. Number of Portable fire extinguishers & Type -> Count and Type
    if (desc === 'Number of Portable fire extinguishers & Type') {
      const { count, type } = parseExtinguishers(value);
      return (
        <div style={{ display: 'flex', gap: '8px', minWidth: '280px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Count</label>
            <input
              type="text"
              placeholder="Count"
              className="form-input"
              value={count}
              onChange={(e) => {
                const val = formatExtinguishers(e.target.value, type);
                handleRemarksChange(originalIndex, val);
              }}
              style={{ margin: 0, padding: '6px 8px', fontSize: '12px', borderRadius: '6px' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Type</label>
            <input
              type="text"
              placeholder="Type"
              className="form-input"
              value={type}
              onChange={(e) => {
                const val = formatExtinguishers(count, e.target.value);
                handleRemarksChange(originalIndex, val);
              }}
              style={{ margin: 0, padding: '6px 8px', fontSize: '12px', borderRadius: '6px' }}
            />
          </div>
        </div>
      );
    }

    // 4. Number of Fire hoses with spray nozzles -> Count, Material, Width and Length
    if (desc === 'Number of Fire hoses with spray nozzles') {
      const { count, material, width, length } = parseHoses(value);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '280px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Count</label>
              <input
                type="text"
                placeholder="Count"
                className="form-input"
                value={count}
                onChange={(e) => {
                  const val = formatHoses(e.target.value, material, width, length);
                  handleRemarksChange(originalIndex, val);
                }}
                style={{ margin: 0, padding: '6px 8px', fontSize: '12px', borderRadius: '6px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Material</label>
              <input
                type="text"
                placeholder="Material"
                className="form-input"
                value={material}
                onChange={(e) => {
                  const val = formatHoses(count, e.target.value, width, length);
                  handleRemarksChange(originalIndex, val);
                }}
                style={{ margin: 0, padding: '6px 8px', fontSize: '12px', borderRadius: '6px' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Width</label>
              <input
                type="text"
                placeholder="Width"
                className="form-input"
                value={width}
                onChange={(e) => {
                  const val = formatHoses(count, material, e.target.value, length);
                  handleRemarksChange(originalIndex, val);
                }}
                style={{ margin: 0, padding: '6px 8px', fontSize: '12px', borderRadius: '6px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Length</label>
              <input
                type="text"
                placeholder="Length"
                className="form-input"
                value={length}
                onChange={(e) => {
                  const val = formatHoses(count, material, width, e.target.value);
                  handleRemarksChange(originalIndex, val);
                }}
                style={{ margin: 0, padding: '6px 8px', fontSize: '12px', borderRadius: '6px' }}
              />
            </div>
          </div>
        </div>
      );
    }

    // Default remarks text input
    return (
      <input
        type="text"
        className="form-input"
        value={value}
        onChange={(e) => handleRemarksChange(originalIndex, e.target.value)}
        placeholder="Optional remarks..."
        style={{ margin: 0, padding: '8px 12px', fontSize: '12px', borderRadius: '8px', minWidth: '280px' }}
      />
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <p>Loading Record of Equipment...</p>
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ padding: '4px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to={`/${activeModule}/marine/first-entry/survey-report/edit/${id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '12px', background: 'var(--surface)', color: 'var(--label)', border: '1px solid var(--border)', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} className="hover-lift">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </Link>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: '24px', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--label)' }}>
              Record of Equipment Checklist
            </h1>
            {surveyReport && (
              <p style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500, marginTop: '4px' }}>
                Vessel: <strong style={{ color: 'var(--label)' }}>{surveyReport.shipName}</strong> {surveyReport.uqmsNo ? `(UQMS No: ${surveyReport.uqmsNo})` : ''} | Report: <strong style={{ color: 'var(--label)' }}>{surveyReport.reportNo}</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {Object.keys(groupedRecords).length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
            No equipment questions found in the database. Please run the seeder first.
          </div>
        ) : (
          Object.entries(groupedRecords).map(([codeRefNo, items]) => (
            <div key={codeRefNo} className="card animate-in" style={{ marginBottom: '24px' }}>
              <div className="card-header" style={{ fontSize: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '12px' }}>
                  Code {codeRefNo}
                </span>
                Recommended Equipment Specification
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Description</th>
                      <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '340px' }}>Status</th>
                      <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '320px' }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(({ originalIndex, record }) => (
                      <tr key={record.questionId._id} style={{ borderBottom: '1px solid var(--separator)' }}>
                        {/* Question Description */}
                        <td style={{ padding: '12px', fontSize: '13px', color: 'var(--label)', fontWeight: 500 }}>
                          {record.questionId.description}
                        </td>

                        {/* Status Selectors */}
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'inline-flex', gap: '4px', background: 'var(--bg-subtle)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            {(['Provided', 'Not Provided', 'Not Applicable'] as const).map((opt) => {
                              const isSelected = record.status === opt;
                              let activeBg = 'transparent';
                              let activeColor = 'var(--muted)';
                              
                              if (isSelected) {
                                if (opt === 'Provided') {
                                  activeBg = 'var(--green-subtle)';
                                  activeColor = 'var(--green)';
                                } else if (opt === 'Not Provided') {
                                  activeBg = 'var(--red-subtle)';
                                  activeColor = 'var(--red)';
                                } else {
                                  activeBg = 'var(--border)';
                                  activeColor = 'var(--label)';
                                }
                              }

                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handleStatusChange(originalIndex, opt)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    background: activeBg,
                                    color: activeColor,
                                    transition: 'all 0.15s ease',
                                    outline: 'none',
                                  }}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        {/* Remarks Input */}
                        <td style={{ padding: '12px' }}>
                          {renderRemarksField(record, originalIndex)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}

        {/* Buttons Row */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '32px', marginBottom: '40px' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{ minWidth: '180px', marginBottom: 0 }}
          >
            {saving ? 'Saving...' : 'Save Record'}
          </button>
          
          <Link to={`/${activeModule}/marine/first-entry/survey-report/edit/${id}`} style={{ textDecoration: 'none' }}>
            <button type="button" className="btn-secondary" style={{ minWidth: '180px', marginBottom: 0 }}>
              Cancel
            </button>
          </Link>
        </div>
      </form>
    </div>
  );
}
