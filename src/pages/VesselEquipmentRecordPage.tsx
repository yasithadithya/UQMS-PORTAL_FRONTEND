import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { firstEntryService, vesselEquipmentRecordService } from '@/api';
import type { ApiFirstEntrySurveyReport, ApiVesselEquipmentRecordItem } from '@/api';

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
                      <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '300px' }}>Remarks</th>
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
                          <input
                            type="text"
                            className="form-input"
                            value={record.remarks || ''}
                            onChange={(e) => handleRemarksChange(originalIndex, e.target.value)}
                            placeholder="Optional remarks..."
                            style={{ margin: 0, padding: '8px 12px', fontSize: '12px', borderRadius: '8px' }}
                          />
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
