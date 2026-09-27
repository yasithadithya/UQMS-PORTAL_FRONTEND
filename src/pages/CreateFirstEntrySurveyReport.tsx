import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Award, ClipboardList, Download, FileText, StickyNote } from 'lucide-react';
import {
  Badge, Button, ButtonLink, Card, Checkbox, EmptyState, Field, FormGrid, FormSection, Input, LoadingBlock, PageHeader, Select,
  StatusBadge, StickyActionBar, Textarea,
} from '@/ui';
import s from './CreateFirstEntrySurveyReport.module.css';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import ScccosModal from '@/components/ScccosModal';
import VesselNotesModal from '@/components/VesselNotesModal';
import { toast } from 'react-toastify';
import { firstEntryService, operationsService } from '@/api';
import type { ApiFirstEntrySurveyBooking, ApiFirstEntrySurveyReport, ApiSurveyReportCategory, ApiSurveyType } from '@/api';
import { formatDate } from '@/utils/date';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';

export default function CreateFirstEntrySurveyReport() {
  const navigate = useNavigate();
  const unsaved = useUnsavedChanges();
  const { id, module } = useParams<{ id?: string; module?: string }>(); // Report ID if editing
  const activeModule = module || 'reporting';
  const isEdit = !!id;
  const { can } = useAuth();
  const canSave = can(MODULE_KEYS.marineReports, isEdit ? 'update' : 'create');
  const canApprove = can(MODULE_KEYS.marineReports, 'approve');
  const canIssueCos = can(MODULE_KEYS.marineCertificates, 'create');
  const canViewCos = can(MODULE_KEYS.marineCertificates, 'read');

  // Bookings List (only needed for creating a new report)
  const [bookings, setBookings] = useState<ApiFirstEntrySurveyBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [surveyTypes, setSurveyTypes] = useState<ApiSurveyType[]>([]);

  // Loading & Action States
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  // Form Fields - Derived & Locked Metadata
  const [shipName, setShipName] = useState('');
  const [managedBy, setManagedBy] = useState('');
  const [uqmsNo, setUqmsNo] = useState('');
  const [reportNo, setReportNo] = useState('');
  const [portOfSurvey, setPortOfSurvey] = useState('');
  const [surveyRequestedDate, setSurveyRequestedDate] = useState('');
  const [firstSurveyDate, setFirstSurveyDate] = useState('');
  const [lastSurveyDate, setLastSurveyDate] = useState('');

  // Form Fields - Editable Report Metadata
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [reportRemarks, setReportRemarks] = useState('');
  const [status, setStatus] = useState('Draft');

  // Form Fields - Editable Surveys Grid
  const [surveys, setSurveys] = useState<ApiSurveyReportCategory[]>([]);

  // SCCCOS certificate states
  const [booking, setBooking] = useState<ApiFirstEntrySurveyBooking | null>(null);
  const [vessel, setVessel] = useState<any | null>(null);
  const [isScccosModalOpen, setIsScccosModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

  const isScccosEligible = useMemo(() => {
    if (!isEdit || !vessel || vessel.vesselCode !== 'SSC') return false;
    if (!booking) return false;

    // Has a last visit date or any visit detail marked as last visit
    const hasLastVisit = !!(
      booking.lastVisitDate ||
      booking.lastVisit ||
      booking.visitDetails?.some((v: any) => v.isLastVist || v.isLastVisitDate)
    );
    return hasLastVisit;
  }, [isEdit, vessel, booking]);

  // Fetch initial lookups and data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Fetch survey types for category display names
        const sTypesRes = await operationsService.getSurveyTypes();
        if (sTypesRes.success) {
          setSurveyTypes(sTypesRes.data);
        }

        if (isEdit && id) {
          // Editing existing report
          const reportRes = await firstEntryService.getFirstEntrySurveyReportById(id);
          if (reportRes.success) {
            const report = reportRes.data;
            setSelectedBookingId(typeof report.bookingId === 'object' ? report.bookingId._id : report.bookingId);
            setShipName(report.shipName || '');
            setManagedBy(report.managedBy || '');
            setUqmsNo(report.uqmsNo || '');
            setReportNo(report.reportNo || '');
            setPortOfSurvey(report.portOfSurvey || '');
            setSurveyRequestedDate(report.surveyRequestedDate ? report.surveyRequestedDate.split('T')[0] : '');
            setFirstSurveyDate(report.firstSurveyDate ? report.firstSurveyDate.split('T')[0] : '');
            setLastSurveyDate(report.lastSurveyDate ? report.lastSurveyDate.split('T')[0] : '');
            setAnniversaryDate(report.anniversaryDate ? report.anniversaryDate.split('T')[0] : '');
            setReportRemarks(report.reportRemarks || '');
            setStatus(report.status || 'Draft');

            if (typeof report.bookingId === 'object') {
              setBooking(report.bookingId as any);
            }
            if (typeof report.vesselId === 'object') {
              setVessel(report.vesselId as any);
            }

            // Format dates inside surveys array
            const formattedSurveys = (report.surveys || []).map(s => ({
              ...s,
              postponeDate: s.postponeDate ? s.postponeDate.split('T')[0] : '',
              surveyDate: s.surveyDate ? s.surveyDate.split('T')[0] : '',
              assignedDate: s.assignedDate ? s.assignedDate.split('T')[0] : '',
              dueFrom: s.dueFrom ? s.dueFrom.split('T')[0] : '',
              dueTo: s.dueTo ? s.dueTo.split('T')[0] : ''
            }));
            setSurveys(formattedSurveys);
          }
        } else {
          // Creating new report - get available bookings that are not already in use
          const [bookingsRes, reportsRes] = await Promise.all([
            firstEntryService.getFirstEntrySurveyBookings(),
            firstEntryService.getFirstEntrySurveyReports()
          ]);
          if (bookingsRes.success && reportsRes.success) {
            const usedBookingIds = new Set(
              reportsRes.data
                .map(r => typeof r.bookingId === 'object' && r.bookingId ? r.bookingId._id : r.bookingId)
                .filter(Boolean)
            );
            const filteredBookings = bookingsRes.data.filter(b => !usedBookingIds.has(b._id));
            setBookings(filteredBookings);
          }
        }
      } catch (err: any) {
        toast.error('Error loading report form data: ' + err.message);
      } finally {
        setInitialLoading(false);
      }
    };

    loadInitialData();
  }, [isEdit, id]);

  // Handle booking selection change (pre-populate report details)
  const handleBookingChange = async (bookingId: string) => {
    setSelectedBookingId(bookingId);
    if (!bookingId) {
      clearForm();
      return;
    }

    try {
      setLoading(true);
      const prePopRes = await firstEntryService.getPrePopulatedReportData(bookingId);
      if (prePopRes.success) {
        const data = prePopRes.data;
        setShipName(data.shipName || '');
        setManagedBy(data.managedBy || '');
        setUqmsNo(data.uqmsNo || '');
        setReportNo(data.reportNo || '');
        setPortOfSurvey(data.portOfSurvey || '');
        setSurveyRequestedDate(data.surveyRequestedDate ? data.surveyRequestedDate.split('T')[0] : '');
        setFirstSurveyDate(data.firstSurveyDate ? data.firstSurveyDate.split('T')[0] : '');
        setLastSurveyDate(data.lastSurveyDate ? data.lastSurveyDate.split('T')[0] : '');
        setSurveys(data.surveys || []);
        toast.success('Report details pre-populated from booking successfully!');
      } else {
        toast.error('Failed to pre-populate details.');
      }
    } catch (err: any) {
      toast.error('Error pre-populating data: ' + err.message);
      clearForm();
    } finally {
      setLoading(false);
    }
  };

  // Resolve survey name from survey code (category)
  const getSurveyName = (code: string) => {
    const match = surveyTypes.find(t => t.code === code);
    return match ? match.name : code;
  };

  const clearForm = () => {
    setShipName('');
    setManagedBy('');
    setUqmsNo('');
    setReportNo('');
    setPortOfSurvey('');
    setSurveyRequestedDate('');
    setFirstSurveyDate('');
    setLastSurveyDate('');
    setAnniversaryDate('');
    setReportRemarks('');
    setSurveys([]);
  };

  // Inline grid updates
  const updateSurveyField = (index: number, field: keyof ApiSurveyReportCategory, value: any) => {
    const updated = [...surveys];
    updated[index] = {
      ...updated[index],
      [field]: value
    };

    // If isPostponed is unchecked, clear postponeDate automatically
    if (field === 'isPostponed' && !value) {
      updated[index].postponeDate = '';
    }

    setSurveys(updated);
  };

  const [bookingError, setBookingError] = useState<string>();

  // Submit / Save Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBookingId) {
      setBookingError('Choose the survey booking this report is for.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        bookingId: selectedBookingId,
        shipName,
        managedBy: managedBy || undefined,
        uqmsNo: uqmsNo || undefined,
        reportNo,
        portOfSurvey: portOfSurvey || undefined,
        surveyRequestedDate: surveyRequestedDate || undefined,
        firstSurveyDate: firstSurveyDate || undefined,
        lastSurveyDate: lastSurveyDate || undefined,
        anniversaryDate: anniversaryDate || undefined,
        reportRemarks: reportRemarks || undefined,
        status,
        surveys: surveys.map(s => ({
          ...s,
          postponeDate: s.postponeDate || undefined,
          surveyDate: s.surveyDate || undefined,
          assignedDate: s.assignedDate || undefined,
          dueFrom: s.dueFrom || undefined,
          dueTo: s.dueTo || undefined
        }))
      };

      let res;
      if (isEdit && id) {
        res = await firstEntryService.updateFirstEntrySurveyReport(id, payload as any);
      } else {
        res = await firstEntryService.createFirstEntrySurveyReport(payload as any);
      }

      if (res.success) {
        toast.success(isEdit ? 'Survey Report updated successfully!' : 'Survey Report created successfully!');
        unsaved.allowNavigation();
        navigate(`/${activeModule}/marine/first-entry?tab=reports`);
      } else {
        toast.error(res.message || 'Failed to save Survey Report.');
      }
    } catch (err: any) {
      toast.error('Error saving Survey Report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCos = async (reportId: string) => {
    try {
      const res = await firstEntryService.getScccosCertificateBySurveyReportId(reportId);
      if (res.success && res.data) {
        const blob = await firstEntryService.getScccosFinalBlob(res.data._id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scc_certificate_${res.data.certificateNumber.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        toast.error('Could not find the certificate record for this Survey Report.');
      }
    } catch (err: any) {
      toast.error('Failed to retrieve certificate: ' + err.message);
    }
  };

  if (initialLoading) {
    return <LoadingBlock label="Loading survey report…" />;
  }

  const listPath = `/${activeModule}/marine/first-entry?tab=reports`;
  const reportBase = `/${activeModule}/marine/first-entry/survey-report`;

  const headerActions = isEdit && id && (
    <>
      {vessel && <Button icon={<StickyNote />} onClick={() => setIsNotesModalOpen(true)}>Vessel notes</Button>}
      <ButtonLink to={`${reportBase}/equipment-record/${id}`} icon={<ClipboardList />}>Equipment record</ButtonLink>
      <ButtonLink to={`${reportBase}/final/${id}`} icon={<FileText />}>Final report</ButtonLink>
      {isScccosEligible && booking && (
        status === 'COS Generated'
          ? <Button icon={<Download />} onClick={() => handleViewCos(id)} disabled={!canViewCos}>Download COS</Button>
          : <Button variant="primary" icon={<Award />} onClick={() => setIsScccosModalOpen(true)} disabled={!canIssueCos}>Generate SSC COS</Button>
      )}
    </>
  );

  const fact = (label: string, value?: string) => (
    <div className={s.fact}>
      <dt>{label}</dt>
      <dd>{value || <span className={s.none}>—</span>}</dd>
    </div>
  );

  return (
    <div className="animate-in">
      <PageHeader
        back={{ href: listPath, label: 'Survey reports' }}
        title={isEdit ? 'Edit survey report' : 'Create survey report'}
        description={isEdit ? 'Update report details and each survey’s status.' : 'Choose a survey booking; the vessel details, dates and surveys are filled in from it.'}
        meta={
          <>
            {reportNo && <Badge tone="accent" title="Report number">{reportNo}</Badge>}
            {isEdit && <StatusBadge status={status} />}
          </>
        }
        actions={headerActions}
      />

      <form onSubmit={handleSubmit} onChangeCapture={unsaved.markDirty} noValidate className={s.form}>
        {!isEdit && (
          <FormSection title="Survey booking">
            <div className={s.narrow}>
              <Field label="Booking" required error={bookingError}>
                <Select
                  placeholder="Choose a survey booking"
                  value={selectedBookingId}
                  onChange={e => { handleBookingChange(e.target.value); setBookingError(undefined); }}
                >
                  {bookings.map(b => (
                    <option key={b._id} value={b._id}>
                      {b.reportNo || 'No report no.'} · {b.shipName} {b.uqmsNo ? `(${b.uqmsNo})` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </FormSection>
        )}

        {!selectedBookingId && !isEdit && (
          <Card padding="none">
            <EmptyState icon={<FileText />} title="Choose a booking to start" description="The report is built from the booking’s vessel, visit dates and requested surveys." />
          </Card>
        )}

        {selectedBookingId && (
          <>
            <FormSection title="Vessel & timeline" description="From the survey booking.">
              <dl className={s.facts}>
                {fact('Ship', shipName)}
                {fact('Managed by', managedBy)}
                {fact('UQMS no.', uqmsNo)}
                {fact('Port of survey', portOfSurvey)}
                {fact('Survey requested', surveyRequestedDate ? formatDate(surveyRequestedDate) : '')}
                {fact('First survey visit', firstSurveyDate ? formatDate(firstSurveyDate) : '')}
                {fact('Last survey visit', lastSurveyDate ? formatDate(lastSurveyDate) : '')}
              </dl>
            </FormSection>

            <FormSection title="Report details">
              <FormGrid columns={2}>
                <Field label="Anniversary date">
                  <Input type="date" value={anniversaryDate} onChange={e => setAnniversaryDate(e.target.value)} />
                </Field>
                <Field label="Report status" hint={canApprove ? undefined : 'Only approvers can change the status.'}>
                  <Select value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="Draft" disabled={!canApprove && status !== 'Draft'}>Draft</option>
                    <option value="Approved" disabled={!canApprove && status !== 'Approved'}>Approved</option>
                    {status === 'COS Generated' && <option value="COS Generated">COS Generated</option>}
                  </Select>
                </Field>
                <Field label="Report remarks" full>
                  <Textarea rows={4} placeholder="Overall remarks, summary of condition and certificate recommendations…" value={reportRemarks} onChange={e => setReportRemarks(e.target.value)} />
                </Field>
              </FormGrid>
            </FormSection>

            <FormSection title="Surveys" description={surveys.length ? `${surveys.length} ${surveys.length === 1 ? 'survey' : 'surveys'} from the booking.` : undefined}>
              {surveys.length === 0 ? (
                <p className={s.emptyNote}>This booking has no requested surveys.</p>
              ) : (
                <div className={s.surveys}>
                  {surveys.map((survey, index) => (
                    <section key={index} className={s.survey} aria-label={getSurveyName(survey.surveyCategory)}>
                      <header className={s.surveyHeader}>
                        <span className={s.surveyName}>{getSurveyName(survey.surveyCategory)}</span>
                        <StatusBadge status={survey.surveyStatus || 'Pending'} />
                      </header>
                      <FormGrid columns={3}>
                        <Field label="Status">
                          <Select value={survey.surveyStatus || 'Pending'} onChange={e => updateSurveyField(index, 'surveyStatus', e.target.value)}>
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                            <option value="Partially Completed">Partially completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </Select>
                        </Field>
                        <Field label="Survey date">
                          <Input type="date" value={survey.surveyDate || ''} onChange={e => updateSurveyField(index, 'surveyDate', e.target.value)} />
                        </Field>
                        <Field label="Assigned date">
                          <Input type="date" value={survey.assignedDate || ''} onChange={e => updateSurveyField(index, 'assignedDate', e.target.value)} />
                        </Field>
                        <Field label="Due from">
                          <Input type="date" value={survey.dueFrom || ''} onChange={e => updateSurveyField(index, 'dueFrom', e.target.value)} />
                        </Field>
                        <Field label="Due to">
                          <Input type="date" value={survey.dueTo || ''} onChange={e => updateSurveyField(index, 'dueTo', e.target.value)} />
                        </Field>
                        <div className={s.postpone}>
                          <Checkbox label="Postponed" checked={!!survey.isPostponed} onChange={e => updateSurveyField(index, 'isPostponed', e.target.checked)} />
                          {survey.isPostponed && (
                            <Field label="Postponed to" hideLabel>
                              <Input type="date" value={survey.postponeDate || ''} onChange={e => updateSurveyField(index, 'postponeDate', e.target.value)} aria-label="Postponed to" />
                            </Field>
                          )}
                        </div>
                        <Field label="Remarks" full>
                          <Textarea rows={2} placeholder="Add remarks…" value={survey.remarks || ''} onChange={e => updateSurveyField(index, 'remarks', e.target.value)} />
                        </Field>
                      </FormGrid>
                    </section>
                  ))}
                </div>
              )}
            </FormSection>

            <StickyActionBar dirty={unsaved.dirty}>
              <ButtonLink to={listPath}>Cancel</ButtonLink>
              <Button type="submit" variant="primary" loading={loading} disabled={!canSave}
                title={canSave ? undefined : 'You do not have permission to save this record.'}>
                {isEdit ? 'Save changes' : 'Create report'}
              </Button>
            </StickyActionBar>
          </>
        )}
      </form>

      {isScccosModalOpen && booking && (
        <ScccosModal
          isOpen={isScccosModalOpen}
          onClose={() => setIsScccosModalOpen(false)}
          booking={booking}
          surveyReportId={id || ''}
        />
      )}

      {isNotesModalOpen && vessel && (
        <VesselNotesModal
          isOpen={isNotesModalOpen}
          onClose={() => setIsNotesModalOpen(false)}
          vesselId={typeof vessel === 'object' ? vessel._id : String(vessel)}
          vesselName={typeof vessel === 'object' ? vessel.vesselName : 'Vessel'}
        />
      )}
      {unsaved.dialog}
    </div>
  );
}
