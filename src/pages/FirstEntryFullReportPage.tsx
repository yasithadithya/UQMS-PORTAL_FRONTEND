import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { firstEntryService } from '@/api';
import type { ApiFirstEntryFullReport, ApiChecklistItem } from '@/api';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/ConfirmModal';
import s from './FirstEntryFullReportPage.module.css';

export default function FirstEntryFullReportPage() {
  const { id, module } = useParams<{ id: string; module?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();

  // Derive the base path for this First Entry module
  const basePath = (() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const feIndex = segments.findIndex((s) => s === 'first-entry');
    if (feIndex >= 0) return '/' + segments.slice(0, feIndex + 1).join('/');
    return `/${module || 'reporting'}/marine/first-entry`;
  })();

  const [report, setReport] = useState<ApiFirstEntryFullReport | null>(null);
  const [originalChecklist, setOriginalChecklist] = useState<ApiChecklistItem[]>([]);
  const [checklist, setChecklist] = useState<ApiChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Fetch the full report details
  const fetchFullReport = async () => {
    try {
      setLoading(true);
      if (!id) return;
      const res = await firstEntryService.getFirstEntryFullReportBySurveyReportId(id);
      if (res.success) {
        setReport(res.data);
        setOriginalChecklist(res.data.checklist || []);
        setChecklist(res.data.checklist || []);

        // Expand all groups by default
        const uniqueCategories = Array.from(
          new Set(
            (res.data.checklist || []).map((item) => {
              const questionObj = typeof item.checklistQuestionId === 'object' ? item.checklistQuestionId : null;
              return questionObj?.qCategory || 'General';
            })
          )
        );
        const initialExpanded: Record<string, boolean> = {};
        uniqueCategories.forEach((name) => {
          initialExpanded[name] = true;
        });
        setExpandedGroups(initialExpanded);
      }
    } catch (err: any) {
      if (err.message?.includes('not found')) {
        // Full report does not exist yet. Let's try to generate it.
        await generateFullReport();
      } else {
        toast.error('Failed to load Full Report: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate a full report if it wasn't pre-generated
  const generateFullReport = async () => {
    try {
      if (!id) return;
      const res = await firstEntryService.triggerFullReportGeneration(id);
      if (res.success) {
        toast.info('Full report generated successfully.');
        setReport(res.data);
        setOriginalChecklist(res.data.checklist || []);
        setChecklist(res.data.checklist || []);
        
        const uniqueCategories = Array.from(
          new Set(
            (res.data.checklist || []).map((item) => {
              const questionObj = typeof item.checklistQuestionId === 'object' ? item.checklistQuestionId : null;
              return questionObj?.qCategory || 'General';
            })
          )
        );
        const initialExpanded: Record<string, boolean> = {};
        uniqueCategories.forEach((name) => {
          initialExpanded[name] = true;
        });
        setExpandedGroups(initialExpanded);
      }
    } catch (err: any) {
      toast.error('Failed to generate Full Report: ' + err.message);
      navigate(basePath);
    }
  };

  useEffect(() => {
    fetchFullReport();
  }, [id]);

  // Group checklist items by qCategory (Question Category, e.g., Hull, Machinery, General)
  const groupedChecklist = useMemo(() => {
    const groups: Record<string, Array<ApiChecklistItem & { originalIndex: number }>> = {};
    checklist.forEach((item, index) => {
      const questionObj = typeof item.checklistQuestionId === 'object' ? item.checklistQuestionId : null;
      const category = questionObj?.qCategory || 'General';

      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ ...item, originalIndex: index });
    });
    return groups;
  }, [checklist]);

  // Determine if there are unsaved changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(checklist) !== JSON.stringify(originalChecklist);
  }, [checklist, originalChecklist]);

  // Calculate check progress
  const progressStats = useMemo(() => {
    const total = checklist.length;
    const completed = checklist.filter((item) => item.isChecked).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [checklist]);

  // Expand / collapse accordions
  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Checklist actions
  const handleCheckedChange = (originalIndex: number, isChecked: boolean) => {
    setChecklist((prev) => {
      const next = [...prev];
      next[originalIndex] = {
        ...next[originalIndex],
        isChecked,
        surveyorName: currentUser?.username,
        surveyorId: currentUser?.id,
        updatedDate: new Date().toISOString(),
      };
      return next;
    });
  };

  const handleCommentChange = (originalIndex: number, comment: 'Satisfactory' | 'Unsatisfactory' | 'N/A' | '') => {
    setChecklist((prev) => {
      const next = [...prev];
      next[originalIndex] = {
        ...next[originalIndex],
        comment,
        surveyorName: currentUser?.username,
        surveyorId: currentUser?.id,
        updatedDate: new Date().toISOString(),
      };
      return next;
    });
  };

  const handleRemarksChange = (originalIndex: number, remarks: string) => {
    setChecklist((prev) => {
      const next = [...prev];
      next[originalIndex] = {
        ...next[originalIndex],
        remarks,
        surveyorName: currentUser?.username,
        surveyorId: currentUser?.id,
      };
      return next;
    });
  };

  const handleAdditionalFieldChange = (originalIndex: number, fieldName: string, value: string) => {
    setChecklist((prev) => {
      const next = [...prev];
      const item = next[originalIndex];
      const newAdditionalFields = [...(item.additionalFields || [])];
      
      const fieldIdx = newAdditionalFields.findIndex(f => f.name === fieldName);
      if (fieldIdx >= 0) {
        newAdditionalFields[fieldIdx] = { ...newAdditionalFields[fieldIdx], value };
      } else {
        newAdditionalFields.push({ name: fieldName, value });
      }

      next[originalIndex] = {
        ...item,
        additionalFields: newAdditionalFields,
        surveyorName: currentUser?.username,
        surveyorId: currentUser?.id,
      };
      return next;
    });
  };

  const handleVisitChange = (originalIndex: number, visitNumber: string) => {
    setChecklist((prev) => {
      const next = [...prev];
      next[originalIndex] = {
        ...next[originalIndex],
        visitNumber,
        surveyorName: currentUser?.username,
        surveyorId: currentUser?.id,
        updatedDate: new Date().toISOString(),
      };
      return next;
    });
  };

  const triggerFileInput = (itemKey: string) => {
    fileInputRefs.current[itemKey]?.click();
  };

  const handleFileUpload = async (originalIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const itemKey = checklist[originalIndex]._id || String(originalIndex);

    try {
      setUploadingQuestionId(itemKey);
      const res = await firstEntryService.uploadChecklistDocument(file);
      if (res.success && res.data) {
        setChecklist((prev) => {
          const next = [...prev];
          const currentFiles = next[originalIndex].files || [];
          next[originalIndex] = {
            ...next[originalIndex],
            surveyorName: currentUser?.username,
            surveyorId: currentUser?.id,
            files: [
              ...currentFiles,
              {
                filename: file.name,
                key: res.data.key,
                url: res.data.url,
                mimeType: res.data.contentType,
                size: res.data.size,
              },
            ],
          };
          return next;
        });
        toast.success(`Uploaded ${file.name} successfully.`);
      } else {
        toast.error(res.message || 'File upload failed.');
      }
    } catch (err: any) {
      toast.error('Error uploading file: ' + err.message);
    } finally {
      setUploadingQuestionId(null);
      e.target.value = ''; // Reset file input
    }
  };

  const handleRemoveFile = (originalIndex: number, fileKey: string) => {
    setChecklist((prev) => {
      const next = [...prev];
      const currentFiles = next[originalIndex].files || [];
      next[originalIndex] = {
        ...next[originalIndex],
        surveyorName: currentUser?.username,
        surveyorId: currentUser?.id,
        files: currentFiles.filter((f) => f.key !== fileKey),
      };
      return next;
    });
    toast.info('File removed from local list. Save changes to make it permanent.');
  };

  const handleSave = async () => {
    if (!report) return;
    try {
      setSaving(true);
      const res = await firstEntryService.updateFirstEntryFullReport(report._id, { checklist });
      if (res.success) {
        toast.success('Full survey checklist saved successfully.');
        setOriginalChecklist(res.data.checklist || []);
        setChecklist(res.data.checklist || []);
      } else {
        toast.error(res.message || 'Failed to save checklist.');
      }
    } catch (err: any) {
      toast.error('Error saving checklist: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setShowDiscardConfirm(true);
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    setChecklist(originalChecklist);
  };

  const handleRegenerate = () => {
    setShowRegenerateConfirm(true);
  };

  const handleConfirmRegenerate = async () => {
    setShowRegenerateConfirm(false);
    try {
      setLoading(true);
      if (!id) return;
      const res = await firstEntryService.triggerFullReportGeneration(id);
      if (res.success) {
        toast.success('Checklist regenerated successfully.');
        setReport(res.data);
        setOriginalChecklist(res.data.checklist || []);
        setChecklist(res.data.checklist || []);
      }
    } catch (err: any) {
      toast.error('Error regenerating checklist: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewDailyReport = async () => {
    if (!report || previewLoading) return;
    if (hasChanges) {
      toast.warn('Please save your changes before generating the daily report preview.');
      return;
    }

    try {
      setPreviewLoading(true);
      const blob = await firstEntryService.getDailyReportPdfPreview(report._id);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setShowPreviewModal(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load daily report PDF preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerateDailyReport = async () => {
    if (!report || generatingPdf) return;
    try {
      setGeneratingPdf(true);
      const res = await firstEntryService.generateDailyReportPdf(report._id);
      if (res.success) {
        toast.success('Daily Visit Report PDF generated successfully.');
        setReport(res.data);
        setOriginalChecklist(res.data.checklist || []);
        setChecklist(res.data.checklist || []);
        handleClosePreview();
      } else {
        toast.error(res.message || 'Failed to generate PDF.');
      }
    } catch (err: any) {
      toast.error('Error generating daily visit report PDF: ' + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--muted)' }}>
        <div
          style={{
            display: 'inline-block',
            width: '32px',
            height: '32px',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px',
          }}
        />
        <p>Loading survey checklist...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className={s.container}>
        <div className={s.emptyState}>
          <h3>First Entry Full Report Not Found</h3>
          <p>We could not retrieve or generate a full checklist report for this survey report.</p>
          <Link to={basePath}>
            <button className="btn-primary" style={{ marginTop: '16px' }}>
              Go Back
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const vessel = typeof report.vesselId === 'object' && report.vesselId ? report.vesselId : null;
  const surveyReport = typeof report.firstEntrySurveyReportId === 'object' && report.firstEntrySurveyReportId ? report.firstEntrySurveyReportId : null;

  return (
    <div className={s.container}>
      <Link to={basePath} className={s.backLink}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Survey Reports
      </Link>

      {/* Header Info Panel */}
      <div className={s.headerCard}>
        <div className={s.headerTop}>
          <div>
            <h1 className={s.title}>Survey Check Sheet Report</h1>
            <p className={s.subtitle}>
              Report No: <strong style={{ color: 'var(--label)' }}>{surveyReport?.reportNo || 'N/A'}</strong> &bull; Booking Ref
            </p>
          </div>
          <div className={s.progressWrap}>
            <div className={s.progressText}>
              Progress: {progressStats.completed} / {progressStats.total} ({progressStats.percentage}%)
            </div>
            <div className={s.progressBarBg}>
              <div className={s.progressBarFill} style={{ width: `${progressStats.percentage}%` }} />
            </div>
          </div>
        </div>

        <div className={s.infoGrid}>
          <div className={s.infoItem}>
            <span className={s.infoLabel}>Vessel Name</span>
            <span className={s.infoValue}>{vessel?.vesselName || 'N/A'}</span>
          </div>
          <div className={s.infoItem}>
            <span className={s.infoLabel}>UQMS Number</span>
            <span className={s.infoValue}>
              {report.uqmsNo ? <span className={`${s.badge} ${s.badgeUqms}`}>{report.uqmsNo}</span> : 'N/A'}
            </span>
          </div>
          <div className={s.infoItem}>
            <span className={s.infoLabel}>Vessel Code</span>
            <span className={s.infoValue}>{vessel?.vesselCode || 'N/A'}</span>
          </div>
          <div className={s.infoItem}>
            <span className={s.infoLabel}>Anniversary Date</span>
            <span className={s.infoValue}>
              {surveyReport?.anniversaryDate ? new Date(surveyReport.anniversaryDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
        <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--separator)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            {report.dailyReportPdfGeneratedAt ? (
              <span style={{ fontSize: '13.5px', color: 'var(--secondary)', fontWeight: 500 }}>
                📄 Daily Report PDF: <a href={report.dailyReportPdfUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: 'var(--primary)', textDecoration: 'underline' }}>{report.dailyReportPdfFilename || 'View PDF'}</a>
                <span style={{ color: 'var(--muted)', marginLeft: '8px', fontSize: '12px' }}>
                  (Generated: {new Date(report.dailyReportPdfGeneratedAt).toLocaleString()})
                </span>
              </span>
            ) : (
              <span style={{ fontSize: '13.5px', color: 'var(--muted)' }}>
                No daily report PDF generated yet.
              </span>
            )}
          </div>
          <div>
            <button
              className="btn-primary"
              onClick={handlePreviewDailyReport}
              disabled={previewLoading || generatingPdf}
              style={{ marginBottom: 0, padding: '8px 16px', fontSize: '13px', width: 'auto', minWidth: 'unset' }}
            >
              {previewLoading ? 'Loading Preview...' : 'Preview & Generate Daily Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Checklist Sections grouped by Question Category */}
      {Object.keys(groupedChecklist).length === 0 ? (
        <div className="card" style={{ padding: '60px 40px', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px', background: 'transparent' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.6 }}>📋</div>
          <h3 style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '8px' }}>No Checklist Questions Found</h3>
          <p style={{ color: 'var(--muted)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5', fontSize: '13px', marginBottom: '20px' }}>
            There are no checklist questions matching the survey category, boat type, area of operation, or vessel code for this report.
          </p>
          <button className={s.regenerateBtn} onClick={handleRegenerate}>
            Force Reload Questions
          </button>
        </div>
      ) : (
        Object.entries(groupedChecklist).map(([qCategory, items]) => {
          const isOpen = expandedGroups[qCategory] !== false;
          const count = items.length;

          return (
            <div key={qCategory} className={s.surveyGroup}>
              <div className={s.groupHeader} onClick={() => toggleGroup(qCategory)}>
                <span className={s.groupTitle}>
                  <svg
                    className={`${s.chevron} ${isOpen ? s.chevronOpen : ''}`}
                    width="16"
                    height="16"
                    viewBox="0 0 10 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="2 2 5 5 8 2" />
                  </svg>
                  {qCategory}
                  <span className={s.groupCount}>{count} Items</span>
                </span>
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', height: 'auto', marginBottom: 0 }} onClick={(e) => { e.stopPropagation(); handleRegenerate(); }}>
                  Regenerate
                </button>
              </div>

              {isOpen && (
                <div className={s.groupBody}>
                  <div className={s.questionsList} style={{ marginTop: '20px' }}>
                    {items.map((item) => {
                      const question = typeof item.checklistQuestionId === 'object' ? item.checklistQuestionId : null;
                      const itemKey = item._id || String(item.originalIndex);
                      const isUploadingThis = uploadingQuestionId === itemKey;
                      const isLocked = originalChecklist[item.originalIndex]?.comment === 'Satisfactory';
                      const rowClass = `${s.questionRow} ${item.comment === 'Unsatisfactory' ? s.questionRowUnsatisfied : ''}`;

                      return (
                        <div key={itemKey} className={rowClass}>
                          <div className={s.questionTop}>
                            <div className={s.questionText}>
                              {question?.item || (question as any)?.question || 'Unknown Item'}
                              {question?.description && (
                                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', fontWeight: 'normal' }}>
                                  {question.description}
                                </div>
                              )}
                              {((item.surveyNames && item.surveyNames.length > 0) || item.surveyorName) && (
                                <div className={s.surveyBadges}>
                                  {item.surveyNames?.map((name, idx) => (
                                    <span key={idx} className={s.badgeSurveyName}>
                                      {name}
                                    </span>
                                  ))}
                                  {item.surveyorName && (
                                    <span className={s.surveyorBadge}>
                                      👤 {item.surveyorName}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Checked Checkbox */}
                            <div className={s.statusPills}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isLocked ? 'not-allowed' : 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={item.isChecked || false}
                                  onChange={(e) => handleCheckedChange(item.originalIndex, e.target.checked)}
                                  disabled={isLocked}
                                  style={{ width: '18px', height: '18px' }}
                                />
                                <span style={{ fontWeight: '500', fontSize: '14px' }}>Checked</span>
                              </label>
                            </div>
                          </div>

                          <div className={s.rowInputs}>
                            {/* Comment Dropdown */}
                            <div className={s.visitArea}>
                              <span className={s.inputLabel}>Comment</span>
                              <select
                                value={item.comment || ''}
                                onChange={(e) => handleCommentChange(item.originalIndex, e.target.value as any)}
                                className={s.visitSelect}
                                disabled={isLocked}
                              >
                                <option value="">Select Comment...</option>
                                <option value="Satisfactory">Satisfactory</option>
                                <option value="Unsatisfactory">Unsatisfactory</option>
                                <option value="N/A">N/A</option>
                              </select>
                            </div>
                            {/* Visit Selector Dropdown */}
                            <div className={s.visitArea}>
                              <span className={s.inputLabel}>Visit</span>
                              <select
                                value={item.visitNumber || ''}
                                onChange={(e) => handleVisitChange(item.originalIndex, e.target.value)}
                                className={s.visitSelect}
                                disabled={isLocked}
                              >
                                <option value="">Select Visit...</option>
                                {report.bookingId && typeof report.bookingId === 'object' && (report.bookingId as any).visitDetails
                                  ?.filter((visit: any) => {
                                    if (!currentUser) return false;
                                    return visit.surveyorAssignments?.some((assign: any) => {
                                      const sId = typeof assign.surveyorId === 'object' && assign.surveyorId
                                        ? assign.surveyorId._id
                                        : assign.surveyorId;
                                      return sId === currentUser.id;
                                    });
                                  })
                                  ?.map((visit: any, idx: number) => {
                                    const visitVal = visit.visitNo || `Visit ${idx + 1}`;
                                    const visitLabel = visit.visitNo 
                                      ? `${visit.visitNo} (${new Date(visit.visitDate).toLocaleDateString()})`
                                      : `Visit ${idx + 1} (${new Date(visit.visitDate).toLocaleDateString()})`;
                                    return (
                                      <option key={idx} value={visitVal}>
                                        {visitLabel}
                                      </option>
                                    );
                                  })}
                              </select>
                            </div>

                            {/* Remarks Column */}
                            <div className={s.remarksArea}>
                              <span className={s.inputLabel}>Remarks</span>
                              <input
                                type="text"
                                className={s.remarksInput}
                                placeholder="Enter survey findings or remarks..."
                                value={item.remarks || ''}
                                onChange={(e) => handleRemarksChange(item.originalIndex, e.target.value)}
                                disabled={isLocked}
                              />
                            </div>

                            {/* File Upload Column */}
                            <div className={s.uploadsArea}>
                              <span className={s.inputLabel}>Attachments (PDF, Word, Image)</span>
                              <div
                                className={s.uploadTrigger}
                                onClick={() => !isLocked && triggerFileInput(itemKey)}
                                style={isLocked ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                              >
                                {isUploadingThis ? (
                                  <>
                                    <div style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                      <polyline points="17 8 12 3 7 8"></polyline>
                                      <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                    Attach File
                                  </>
                                )}
                              </div>
                              <input
                                ref={(el) => {
                                  fileInputRefs.current[itemKey] = el;
                                }}
                                type="file"
                                style={{ display: 'none' }}
                                accept=".pdf,.doc,.docx,image/*"
                                onChange={(e) => handleFileUpload(item.originalIndex, e)}
                                disabled={isLocked}
                              />

                              {/* List of uploaded files */}
                              {item.files && item.files.length > 0 && (
                                <div className={s.fileList}>
                                  {item.files.map((file) => (
                                    <div key={file.key} className={s.fileBadge}>
                                      <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={s.fileName}
                                        title={file.filename}
                                      >
                                        {file.filename}
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveFile(item.originalIndex, file.key)}
                                        className={s.removeFileBtn}
                                        title="Delete Attachment"
                                        disabled={isLocked}
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <line x1="18" y1="6" x2="6" y2="18"></line>
                                          <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Additional Fields Block */}
                          {item.additionalFields && item.additionalFields.length > 0 && (
                            <div className={s.additionalFieldsRow}>
                              {item.additionalFields.map((field: any, idx: number) => (
                                <div key={idx} className={s.additionalField}>
                                  <span className={s.inputLabel}>{field.name}</span>
                                  <input
                                    type="text"
                                    className={s.remarksInput}
                                    placeholder={`Enter ${field.name}...`}
                                    value={field.value || ''}
                                    onChange={(e) => handleAdditionalFieldChange(item.originalIndex, field.name, e.target.value)}
                                    disabled={isLocked}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Floating Bottom Unsaved Changes Banner */}
      {hasChanges && (
        <div className={s.footerBar}>
          <span className={s.footerText}>You have unsaved changes in the survey checklist.</span>
          <div className={s.footerButtons}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDiscard}
              disabled={saving}
              style={{ marginBottom: 0 }}
            >
              Discard Changes
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ marginBottom: 0 }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      <div style={{ height: '80px' }} /> {/* Spacer so bottom banner doesn't cover contents */}

      <ConfirmModal
        isOpen={showDiscardConfirm}
        title="Discard Unsaved Changes"
        message="Are you sure you want to discard your unsaved changes?"
        confirmText="Discard"
        cancelText="Cancel"
        onConfirm={handleConfirmDiscard}
        onCancel={() => setShowDiscardConfirm(false)}
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={showRegenerateConfirm}
        title="Regenerate Checklist"
        message="Warning: Regenerating will reload all questions from the database matching the criteria. Any unsaved checklist status updates might be overwritten. Do you want to proceed?"
        confirmText="Regenerate"
        cancelText="Cancel"
        onConfirm={handleConfirmRegenerate}
        onCancel={() => setShowRegenerateConfirm(false)}
        isDestructive={true}
      />

      {showPreviewModal && previewUrl && (
        <div className={s.overlay} style={{ padding: 0 }}>
          <div className={s.modal} style={{ maxWidth: '100%', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 0, border: 'none' }}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>Daily Visit Report PDF Preview</h3>
              <button className={s.closeBtn} type="button" onClick={handleClosePreview}>
                &times;
              </button>
            </div>
            
            <div className={s.modalBody} style={{ flex: 1, padding: '16px 24px', position: 'relative' }}>
              <iframe
                src={previewUrl}
                title="Daily Visit Report PDF Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
            </div>
            
            <div className={s.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px' }}>
              <button className="btn-secondary" type="button" onClick={handleClosePreview} disabled={generatingPdf}>
                Cancel
              </button>
              <button className="btn-primary" type="button" onClick={handleGenerateDailyReport} disabled={generatingPdf}>
                {generatingPdf ? 'Generating...' : 'Generate Daily Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
