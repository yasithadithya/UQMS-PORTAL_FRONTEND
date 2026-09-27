import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { apiUrl, firstEntryService, operationsService } from '@/api';
import type { ApiFirstEntryFullReport, ApiChecklistItem, ApiSurveyType } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { Anchor, Award, CheckCircle2, ClipboardList, Download, Eye, FileText, PenLine, RefreshCw } from 'lucide-react';
import {
  Badge, Button, ButtonLink, Card, ConfirmDialog, EmptyState, LoadingBlock, Modal, PageHeader, Section, Spinner, StickyActionBar,
  buttonClassName,
} from '@/ui';
import ScccosModal from '@/components/ScccosModal';
import DockingSurveyModal from '@/components/DockingSurveyModal';
import DragDropFileUpload from '@/components/DragDropFileUpload';
import SignableDocumentModal from '@/components/ESignature/SignableDocumentModal';
import type { SignableDocType } from '@/api';
import s from './FirstEntryFullReportPage.module.css';
import { formatDate, formatDateTime, formatSigningDate } from '@/utils/date';
import { MODULE_KEYS } from '@/utils/permissions';

/** A stored document opened in the signing viewer. */
type OpenSignableDocument = {
  docType: SignableDocType;
  docId: string;
  title: string;
  fetchPdf: () => Promise<Blob>;
  downloadFileName: string;
};

export default function FirstEntryFullReportPage() {
  const { id, module } = useParams<{ id: string; module?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, can } = useAuth();
  const canEditReport = can(MODULE_KEYS.marineReports, 'update');
  const canIssueCertificates = can(MODULE_KEYS.marineCertificates, 'create');
  const canViewCertificates = can(MODULE_KEYS.marineCertificates, 'read');

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
  const [isScccosModalOpen, setIsScccosModalOpen] = useState(false);
  const [isDockingSurveyModalOpen, setIsDockingSurveyModalOpen] = useState(false);
  const [dockingSurveyCertExists, setDockingSurveyCertExists] = useState(false);
  const [openDocument, setOpenDocument] = useState<OpenSignableDocument | null>(null);
  const [surveyTypes, setSurveyTypes] = useState<ApiSurveyType[]>([]);

  // Remarks section states
  const [newRemarkText, setNewRemarkText] = useState('');
  const [postingRemark, setPostingRemark] = useState(false);
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [editingRemarkText, setEditingRemarkText] = useState('');
  const [updatingRemark, setUpdatingRemark] = useState(false);
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});
  const [postingCommentId, setPostingCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [updatingComment, setUpdatingComment] = useState(false);

  const vessel = report && typeof report.vesselId === 'object' && report.vesselId ? report.vesselId : null;
  const surveyReport = report && typeof report.firstEntrySurveyReportId === 'object' && report.firstEntrySurveyReportId ? report.firstEntrySurveyReportId : null;
  const booking = report && typeof report.bookingId === 'object' && report.bookingId ? report.bookingId : null;

  const isScccosEligible = useMemo(() => {
    if (!vessel || vessel.vesselCode !== 'SSC') return false;
    if (!booking) return false;

    // Has a last visit date or any visit detail marked as last visit
    const hasLastVisit = !!(
      booking.lastVisitDate ||
      booking.lastVisit ||
      booking.visitDetails?.some((v: any) => v.isLastVist || v.isLastVisitDate)
    );
    return hasLastVisit;
  }, [vessel, booking]);

  const isDockingSurveyEligible = useMemo(() => {
    if (!booking) return false;

    // surveysRequested stores survey type codes (e.g. 'ST05'), so resolve each entry to
    // its survey type before matching. Older bookings may hold the name directly.
    return (booking.surveysRequested || []).some((entry: string) => {
      const value = (entry || '').trim().toLowerCase();
      if (!value) return false;
      const match = surveyTypes.find(
        (st) => st.code.toLowerCase() === value || st.name.toLowerCase() === value || st._id === entry
      );
      return (match?.name || entry).toLowerCase().includes('docking survey');
    });
  }, [booking, surveyTypes]);

  const getCreatorId = (createdBy: any): string => {
    if (!createdBy) return '';
    if (typeof createdBy === 'object') {
      return (createdBy._id || createdBy.id || '').toString();
    }
    return createdBy.toString();
  };

  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !newRemarkText.trim() || postingRemark) return;

    try {
      setPostingRemark(true);
      const res = await firstEntryService.addGeneralRemark(report._id, newRemarkText);
      if (res.success) {
        setReport(res.data);
        setNewRemarkText('');
        toast.success('Remark added successfully.');
      } else {
        toast.error(res.message || 'Failed to add remark.');
      }
    } catch (err: any) {
      toast.error('Error adding remark: ' + err.message);
    } finally {
      setPostingRemark(false);
    }
  };

  const handleEditRemark = async (remarkId: string) => {
    if (!report || !editingRemarkText.trim() || updatingRemark) return;

    try {
      setUpdatingRemark(true);
      const res = await firstEntryService.editGeneralRemark(report._id, remarkId, editingRemarkText);
      if (res.success) {
        setReport(res.data);
        setEditingRemarkId(null);
        setEditingRemarkText('');
        toast.success('Remark updated successfully.');
      } else {
        toast.error(res.message || 'Failed to update remark.');
      }
    } catch (err: any) {
      toast.error('Error updating remark: ' + err.message);
    } finally {
      setUpdatingRemark(false);
    }
  };

  const handleToggleCloseRemark = async (remarkId: string) => {
    if (!report) return;

    try {
      const res = await firstEntryService.toggleCloseGeneralRemark(report._id, remarkId);
      if (res.success) {
        setReport(res.data);
        toast.success(res.message || 'Remark status updated.');
      } else {
        toast.error(res.message || 'Failed to update remark status.');
      }
    } catch (err: any) {
      toast.error('Error updating remark status: ' + err.message);
    }
  };

  const handleAddComment = async (remarkId: string, e: React.FormEvent) => {
    e.preventDefault();
    const commentText = newCommentTexts[remarkId] || '';
    if (!report || !commentText.trim() || postingCommentId) return;

    try {
      setPostingCommentId(remarkId);
      const res = await firstEntryService.addRemarkComment(report._id, remarkId, commentText);
      if (res.success) {
        setReport(res.data);
        setNewCommentTexts((prev) => ({ ...prev, [remarkId]: '' }));
        toast.success('Comment added successfully.');
      } else {
        toast.error(res.message || 'Failed to add comment.');
      }
    } catch (err: any) {
      toast.error('Error adding comment: ' + err.message);
    } finally {
      setPostingCommentId(null);
    }
  };

  const handleEditComment = async (remarkId: string, commentId: string) => {
    if (!report || !editingCommentText.trim() || updatingComment) return;

    try {
      setUpdatingComment(true);
      const res = await firstEntryService.editRemarkComment(report._id, remarkId, commentId, editingCommentText);
      if (res.success) {
        setReport(res.data);
        setEditingCommentId(null);
        setEditingCommentText('');
        toast.success('Comment updated successfully.');
      } else {
        toast.error(res.message || 'Failed to update comment.');
      }
    } catch (err: any) {
      toast.error('Error updating comment: ' + err.message);
    } finally {
      setUpdatingComment(false);
    }
  };

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

      // Check if Docking Survey Cert exists
      try {
        const dsRes = await firstEntryService.getDockingSurveyCertBySurveyReportId(id);
        if (dsRes.success && dsRes.data) {
          setDockingSurveyCertExists(true);
        }
      } catch (dsErr) {
        // Likely not found
        setDockingSurveyCertExists(false);
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
      navigate(`${basePath}?tab=reports`);
    }
  };

  useEffect(() => {
    fetchFullReport();
  }, [id]);

  // Survey types are needed to resolve the codes stored in booking.surveysRequested
  useEffect(() => {
    const loadSurveyTypes = async () => {
      try {
        const res = await operationsService.getSurveyTypes();
        if (res.success) setSurveyTypes(res.data);
      } catch {
        // Non-fatal: only used to decide which certificate actions to offer.
      }
    };
    loadSurveyTypes();
  }, []);

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

  const handleFileUpload = async (originalIndex: number, files: FileList | null) => {
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

  const handleViewDailyReport = () => {
    if (!report) return;
    setOpenDocument({
      docType: 'daily-report',
      docId: report._id,
      title: 'Daily Visit Report',
      fetchPdf: () => firstEntryService.getDailyReportPdfBlob(report._id),
      downloadFileName: report.dailyReportPdfFilename || `daily-visit-report-${report._id}.pdf`,
    });
  };

  const handleViewCos = async () => {
    if (!surveyReport?._id) return;
    try {
      const res = await firstEntryService.getScccosCertificateBySurveyReportId(surveyReport._id);
      if (res.success && res.data) {
        const certificate = res.data;
        setOpenDocument({
          docType: 'scccos',
          docId: certificate._id,
          title: `SSC Certificate of Survey — ${certificate.certificateNumber}`,
          fetchPdf: () => firstEntryService.getScccosFinalBlob(certificate._id),
          downloadFileName: `scc_certificate_${certificate.certificateNumber.replace(/\s+/g, '_')}.pdf`,
        });
      } else {
        toast.error('Could not find the certificate record.');
      }
    } catch (err: any) {
      toast.error('Failed to retrieve certificate: ' + err.message);
    }
  };

  const handleViewDockingSurvey = async () => {
    if (!surveyReport?._id) return;
    try {
      const res = await firstEntryService.getDockingSurveyCertBySurveyReportId(surveyReport._id);
      if (res.success && res.data) {
        const certificate = res.data;
        setOpenDocument({
          docType: 'docking-cert',
          docId: certificate._id,
          title: `Docking Survey Certificate — ${certificate.certificateNumber}`,
          fetchPdf: () => firstEntryService.getDockingSurveyFinalBlob(certificate._id),
          downloadFileName: `docking_survey_${certificate.certificateNumber.replace(/\s+/g, '_')}.pdf`,
        });
      } else {
        toast.error('Could not find the certificate record.');
      }
    } catch (err: any) {
      toast.error('Failed to retrieve certificate: ' + err.message);
    }
  };

  if (loading) {
    return <LoadingBlock label="Loading survey checklist…" />;
  }

  if (!report) {
    return (
      <Card padding="none">
        <EmptyState
          icon={<ClipboardList />}
          title="Full report not found"
          description="We couldn't load or generate the checklist report for this survey report."
          action={<ButtonLink to={`${basePath}?tab=reports`}>Back to survey reports</ButtonLink>}
        />
      </Card>
    );
  }

  return (
    <div className={s.container}>
      <PageHeader
        back={{ href: `${basePath}?tab=reports`, label: 'Survey reports' }}
        title="Survey check sheet"
        description={`Report ${surveyReport?.reportNo || '—'}${vessel?.vesselName ? ` · ${vessel.vesselName}` : ''}`}
        meta={<Badge tone={progressStats.percentage === 100 ? 'success' : 'neutral'}>{progressStats.completed}/{progressStats.total} checked</Badge>}
      />

      {/* Header Info Panel */}
      <div className={s.headerCard}>
        <div className={s.progressWrap}>
          <div className={s.progressText}>
            Progress: {progressStats.completed} / {progressStats.total} ({progressStats.percentage}%)
          </div>
          <div
            className={s.progressBarBg}
            role="progressbar"
            aria-label="Checklist progress"
            aria-valuenow={progressStats.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={s.progressBarFill} style={{ width: `${progressStats.percentage}%` }} />
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
              {surveyReport?.anniversaryDate ? formatDate(surveyReport.anniversaryDate) : 'N/A'}
            </span>
          </div>
        </div>
        <div className={s.reportRow}>
          <div className={s.reportInfo}>
            {report.dailyReportPdfGeneratedAt ? (
              <>
                <span className={s.reportLine}>
                  <FileText aria-hidden="true" />
                  Daily report PDF:{' '}
                  <a href={apiUrl(`/first-entry-full-reports/public-pdf/${report._id}`)} target="_blank" rel="noreferrer">
                    {report.dailyReportPdfFilename || 'View PDF'}
                  </a>
                  <span className={s.reportMeta}>Generated {formatDateTime(report.dailyReportPdfGeneratedAt)}</span>
                </span>
                {report.eSignature ? (
                  <Badge tone="success" icon={<CheckCircle2 />}>
                    Signed by {report.eSignature.signedByName} on {formatSigningDate(report.eSignature.signedAt)}
                  </Badge>
                ) : (
                  <Badge tone="warning" dot>Not signed yet</Badge>
                )}
              </>
            ) : (
              <span className={s.reportMeta}>No daily report PDF generated yet.</span>
            )}
          </div>
          <div className={s.reportActions}>
            {report.dailyReportPdfGeneratedAt && (
              <Button size="sm" icon={<PenLine />} onClick={handleViewDailyReport}>
                {report.eSignature ? 'View signed daily report' : 'View & sign daily report'}
              </Button>
            )}
            <Button
              size="sm"
              variant="primary"
              icon={<Eye />}
              onClick={handlePreviewDailyReport}
              loading={previewLoading}
              disabled={generatingPdf || !!report.eSignature}
              title={report.eSignature ? 'The daily report is signed and locked. An administrator must revoke the signature to regenerate it.' : undefined}
            >
              Preview & generate daily report
            </Button>
            {isScccosEligible && booking && (
              surveyReport?.status === 'COS Generated'
                ? <Button size="sm" icon={<Award />} onClick={handleViewCos} disabled={!canViewCertificates}>View COS</Button>
                : <Button size="sm" icon={<Award />} onClick={() => setIsScccosModalOpen(true)} disabled={!canIssueCertificates}>Generate SSC COS</Button>
            )}
            {isDockingSurveyEligible && booking && (
              dockingSurveyCertExists
                ? <Button size="sm" icon={<Anchor />} onClick={handleViewDockingSurvey} disabled={!canViewCertificates}>View docking survey</Button>
                : <Button size="sm" icon={<Anchor />} onClick={() => setIsDockingSurveyModalOpen(true)} disabled={!canIssueCertificates}>Generate docking survey</Button>
            )}
          </div>
        </div>
      </div>

      {/* Checklist Sections grouped by Question Category */}
      {Object.keys(groupedChecklist).length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<ClipboardList />}
            title="No checklist questions"
            description="No checklist questions match this report's survey category, boat type, area of operation or vessel code."
            action={<Button icon={<RefreshCw />} onClick={handleRegenerate}>Reload questions</Button>}
          />
        </Card>
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
                <Button size="sm" variant="ghost" icon={<RefreshCw />} onClick={(e) => { e.stopPropagation(); handleRegenerate(); }}>
                  Regenerate
                </Button>
              </div>

              {isOpen && (
                <div className={s.groupBody}>
                  <div className={s.questionsList}>
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
                                <div className={s.questionDescription}>
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
                              <label className={`${s.checkedLabel} ${isLocked ? s.checkedLocked : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={item.isChecked || false}
                                  onChange={(e) => handleCheckedChange(item.originalIndex, e.target.checked)}
                                  disabled={isLocked}
                                />
                                <span>Checked</span>
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
                                      ? `${visit.visitNo} (${formatDate(visit.visitDate)})`
                                      : `Visit ${idx + 1} (${formatDate(visit.visitDate)})`;
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
                              <DragDropFileUpload
                                onFilesSelected={(files) => handleFileUpload(item.originalIndex, files)}
                                multiple={false}
                                accept=".pdf,.doc,.docx,image/*"
                                disabled={isLocked || isUploadingThis}
                                className={s.uploadTrigger}
                                text={
                                  isUploadingThis ? (
                                    <>
                                      <Spinner size={12} label="Uploading" />
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
                                  )
                                }
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

      {/* Discussion & Remarks Section */}
      <div className={s.discussionCard}>
        <div className={s.discussionHeader}>
          <h2 className={s.discussionTitle}>
            💬 General Remarks & Discussion
          </h2>
          <p className={s.discussionSubtitle}>
            A general remark must be added before generating the Daily Visit Report PDF. Closed remarks are omitted from the PDF.
          </p>
        </div>

        <div className={s.remarksContainer}>
          {!report.remarks || report.remarks.length === 0 ? (
            <div className={s.emptyRemarks}>
              <p>No general remarks added yet.</p>
              <span>Please add at least one remark below to generate the daily report PDF.</span>
            </div>
          ) : (
            <div className={s.remarksList}>
              {report.remarks.map((rem) => {
                const isRemarkCreator = getCreatorId(rem.createdBy) === currentUser?.id;
                const remarkInitials = rem.createdByName ? rem.createdByName.trim().charAt(0).toUpperCase() : 'U';

                return (
                  <div key={rem._id} className={`${s.remarkItem} ${rem.isClosed ? s.remarkItemClosed : ''}`}>
                    {/* Remark Body */}
                    <div className={s.remarkMain}>
                      <div className={s.avatar} title={rem.createdByName}>
                        {remarkInitials}
                      </div>

                      <div className={s.remarkContent}>
                        <div className={s.remarkMeta}>
                          <span className={s.remarkAuthor}>{rem.createdByName}</span>
                          <span className={s.remarkDate}>
                            {formatDateTime(rem.createdAt)}
                          </span>
                          {rem.isClosed ? (
                            <span className={`${s.badge} ${s.badgeClosed}`}>Closed (Omitted from PDF)</span>
                          ) : (
                            <span className={`${s.badge} ${s.badgeOpen}`}>Open (Visible in PDF)</span>
                          )}
                        </div>

                        {editingRemarkId === rem._id ? (
                          <div className={s.editBox}>
                            <textarea
                              value={editingRemarkText}
                              onChange={(e) => setEditingRemarkText(e.target.value)}
                              className={s.editTextarea}
                              rows={3}
                              disabled={updatingRemark}
                            />
                            <div className={s.editActions}>
                              <button
                                className={buttonClassName({ size: "sm" })}
                                onClick={() => {
                                  setEditingRemarkId(null);
                                  setEditingRemarkText('');
                                }}
                                disabled={updatingRemark}
                              >
                                Cancel
                              </button>
                              <button
                                className={buttonClassName({ variant: "primary", size: "sm" })}
                                onClick={() => handleEditRemark(rem._id)}
                                disabled={updatingRemark || !editingRemarkText.trim()}
                              >
                                {updatingRemark ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={s.remarkText}>{rem.text}</div>
                        )}

                        {/* Remark Action Buttons */}
                        <div className={s.remarkActions}>
                          <button
                            type="button"
                            className={s.actionBtn}
                            onClick={() => handleToggleCloseRemark(rem._id)}
                          >
                            {rem.isClosed ? '🔓 Reopen Remark' : '🔒 Close Remark'}
                          </button>

                          {isRemarkCreator && editingRemarkId !== rem._id && (
                            <button
                              type="button"
                              className={s.actionBtn}
                              onClick={() => {
                                setEditingRemarkId(rem._id);
                                setEditingRemarkText(rem.text);
                              }}
                            >
                              ✏️ Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Comments (Indented Sub-Thread) */}
                    <div className={s.commentsSection}>
                      {rem.comments && rem.comments.length > 0 && (
                        <div className={s.commentsList}>
                          {rem.comments.map((comment) => {
                            const isCommentCreator = getCreatorId(comment.createdBy) === currentUser?.id;
                            const commentInitials = comment.createdByName ? comment.createdByName.trim().charAt(0).toUpperCase() : 'U';

                            return (
                              <div key={comment._id} className={s.commentItem}>
                                <div className={`${s.avatar} ${s.avatarComment}`} title={comment.createdByName}>
                                  {commentInitials}
                                </div>
                                <div className={s.commentContent}>
                                  <div className={s.commentMeta}>
                                    <span className={s.commentAuthor}>{comment.createdByName}</span>
                                    <span className={s.commentDate}>
                                      {formatDateTime(comment.createdAt)}
                                    </span>
                                  </div>

                                  {editingCommentId === comment._id ? (
                                    <div className={s.editBox}>
                                      <textarea
                                        value={editingCommentText}
                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                        className={s.editTextarea}
                                        rows={2}
                                        disabled={updatingComment}
                                      />
                                      <div className={s.editActions}>
                                        <button
                                          className={buttonClassName({ size: "sm" })}
                                          onClick={() => {
                                            setEditingCommentId(null);
                                            setEditingCommentText('');
                                          }}
                                          disabled={updatingComment}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          className={buttonClassName({ variant: "primary", size: "sm" })}
                                          onClick={() => handleEditComment(rem._id, comment._id)}
                                          disabled={updatingComment || !editingCommentText.trim()}
                                        >
                                          {updatingComment ? 'Saving...' : 'Save'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={s.commentText}>{comment.text}</div>
                                  )}

                                  {isCommentCreator && editingCommentId !== comment._id && (
                                    <div className={s.commentActions}>
                                      <button
                                        type="button"
                                        className={s.actionBtn}
                                        onClick={() => {
                                          setEditingCommentId(comment._id);
                                          setEditingCommentText(comment.text);
                                        }}
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add Comment Input Form */}
                      <form onSubmit={(e) => handleAddComment(rem._id, e)} className={s.commentForm}>
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={newCommentTexts[rem._id] || ''}
                          onChange={(e) =>
                            setNewCommentTexts((prev) => ({
                              ...prev,
                              [rem._id]: e.target.value,
                            }))
                          }
                          className={s.commentInput}
                          disabled={postingCommentId === rem._id}
                        />
                        <button
                          type="submit"
                          className={s.commentSubmitBtn}
                          disabled={postingCommentId === rem._id || !(newCommentTexts[rem._id] || '').trim()}
                        >
                          {postingCommentId === rem._id ? '...' : 'Post'}
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Remark Input Form */}
        <form onSubmit={handleAddRemark} className={s.remarkForm}>
          <h3 className={s.formTitle}>Add General Remark</h3>
          <textarea
            placeholder="Type your general remark here... (This remark will be printable in the Daily Visit Report PDF)"
            value={newRemarkText}
            onChange={(e) => setNewRemarkText(e.target.value)}
            className={s.remarkTextarea}
            rows={4}
            disabled={postingRemark}
          />
          <Button
            type="submit"
            variant="primary"
            className={s.remarkSubmit}
            loading={postingRemark}
            disabled={!newRemarkText.trim() || !canEditReport}
          >
            Post general remark
          </Button>
        </form>
      </div>

      {isScccosEligible && booking && (
        <Section
          className={s.cosCard}
          title="Small Craft Code Certificate of Survey"
          description={surveyReport?.status === 'COS Generated'
            ? 'The statutory survey certificate has been generated for this survey report.'
            : 'The survey visit is complete. Record the findings and generate the SSC Certificate of Survey.'}
          actions={surveyReport?.status === 'COS Generated'
            ? <Button icon={<Download />} onClick={handleViewCos} disabled={!canViewCertificates}>View COS</Button>
            : <Button variant="primary" icon={<Award />} onClick={() => setIsScccosModalOpen(true)} disabled={!canIssueCertificates}>Generate SSC COS</Button>}
        />
      )}

      {hasChanges && (
        <StickyActionBar dirty>
          <Button onClick={handleDiscard} disabled={saving}>Discard changes</Button>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={!canEditReport}>Save changes</Button>
        </StickyActionBar>
      )}

      <ConfirmDialog
        open={showDiscardConfirm}
        title="Discard Unsaved Changes"
        message="Are you sure you want to discard your unsaved changes?"
        confirmText="Discard"
        cancelText="Cancel"
        onConfirm={handleConfirmDiscard}
        onCancel={() => setShowDiscardConfirm(false)}
        destructive
      />

      <ConfirmDialog
        open={showRegenerateConfirm}
        title="Regenerate Checklist"
        message="Warning: Regenerating will reload all questions from the database matching the criteria. Any unsaved checklist status updates might be overwritten. Do you want to proceed?"
        confirmText="Regenerate"
        cancelText="Cancel"
        onConfirm={handleConfirmRegenerate}
        onCancel={() => setShowRegenerateConfirm(false)}
        destructive
      />

      <Modal
        open={showPreviewModal && !!previewUrl}
        onClose={handleClosePreview}
        dismissible={!generatingPdf}
        size="xl"
        title="Daily visit report preview"
        description="Check the PDF, then generate the daily report."
        footer={
          <>
            <Button onClick={handleClosePreview} disabled={generatingPdf}>Cancel</Button>
            <Button variant="primary" onClick={handleGenerateDailyReport} loading={generatingPdf} disabled={!canEditReport}>Generate daily report</Button>
          </>
        }
      >
        {previewUrl && <iframe src={previewUrl} title="Daily visit report preview" className={s.previewFrame} />}
      </Modal>

      {openDocument && (
        <SignableDocumentModal
          key={`${openDocument.docType}-${openDocument.docId}`}
          isOpen
          onClose={() => setOpenDocument(null)}
          title={openDocument.title}
          docType={openDocument.docType}
          docId={openDocument.docId}
          fetchPdf={openDocument.fetchPdf}
          downloadFileName={openDocument.downloadFileName}
          onStatusChange={(status) => {
            if (openDocument.docType !== 'daily-report') return;
            setReport((prev) => (prev ? { ...prev, eSignature: status.eSignature || undefined } : prev));
          }}
        />
      )}

      {isScccosModalOpen && booking && (
        <ScccosModal
          isOpen={isScccosModalOpen}
          onClose={() => setIsScccosModalOpen(false)}
          booking={booking as any}
          surveyReportId={surveyReport?._id || ''}
          onSuccess={() => {
            toast.success('SCCCOS Certificate generated successfully.');
          }}
        />
      )}

      {isDockingSurveyModalOpen && booking && (
        <DockingSurveyModal
          isOpen={isDockingSurveyModalOpen}
          onClose={() => setIsDockingSurveyModalOpen(false)}
          booking={booking as any}
          surveyReportId={surveyReport?._id || ''}
          defaultClient={vessel?.managerName || booking?.managedBy || surveyReport?.managedBy || ''}
          onSuccess={() => {
            toast.success('Docking Survey Certificate generated successfully.');
            setDockingSurveyCertExists(true);
          }}
        />
      )}
    </div>
  );
}
