import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import ScccosModal from '@/components/ScccosModal';
import VesselNotesModal from '@/components/VesselNotesModal';
import { toast } from 'react-toastify';
import { firstEntryService, operationsService } from '@/api';
import type { ApiFirstEntrySurveyBooking, ApiFirstEntrySurveyReport, ApiSurveyReportCategory, ApiSurveyType } from '@/api';
import { formatDate } from '@/utils/date';

export default function CreateFirstEntrySurveyReport() {
  const navigate = useNavigate();
  const { id, module } = useParams<{ id?: string; module?: string }>(); // Report ID if editing
  const activeModule = module || 'reporting';
  const isEdit = !!id;

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
          // Creating new report - get available bookings
          const bookingsRes = await firstEntryService.getFirstEntrySurveyBookings();
          if (bookingsRes.success) {
            setBookings(bookingsRes.data);
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

  // Submit / Save Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBookingId) {
      toast.error('Please associate this report with a Survey Booking.');
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
        navigate(`/${activeModule}/marine`);
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
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <p>Loading survey report details...</p>
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ padding: '4px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to={`/${activeModule}/marine`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '12px', background: 'var(--surface)', color: 'var(--label)', border: '1px solid var(--border)', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} className="hover-lift">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </Link>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: '24px', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--label)' }}>
              {isEdit ? 'Edit Survey Report' : 'Generate Survey Report'}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500, marginTop: '4px' }}>
              Create or modify first entry survey report documents and review compliance statuses.
            </p>
          </div>
        </div>

        {/* Report Number Top Section Badge */}
        {reportNo && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '8px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            minWidth: '150px'
          }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '2px' }}>
              Report Number
            </span>
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
              {reportNo}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Booking Association */}
        {!isEdit && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">Select Survey Booking</div>
            <div style={{ maxWidth: '600px' }}>
              <label className="form-label" htmlFor="bookingSelect">Select Booking *</label>
              <select
                id="bookingSelect"
                className="form-input"
                value={selectedBookingId}
                onChange={e => handleBookingChange(e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
                required
              >
                <option value="">-- Choose A Survey Booking --</option>
                {bookings.map(b => (
                  <option key={b._id} value={b._id}>
                    {b.reportNo || 'REP-AUTO'} - {b.shipName} {b.uqmsNo ? `(${b.uqmsNo})` : ''}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                Selecting a survey booking will dynamically pull and calculate dates, vessel registry information, and categories.
              </p>
            </div>
          </div>
        )}

        {/* Vessel Specifications & Dates */}
        {selectedBookingId && (
          <div className="card animate-in" style={{ marginBottom: '24px' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              Vessel Details & Survey Timeline
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px 24px', marginBottom: '20px' }}>
              <div>
                <label className="form-label">Ship Name</label>
                <input type="text" className="form-input" value={shipName} readOnly style={{ background: 'var(--bg-subtle)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label className="form-label">Managed By</label>
                <input type="text" className="form-input" value={managedBy || 'N/A'} readOnly style={{ background: 'var(--bg-subtle)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label className="form-label">UQMS Number</label>
                <input type="text" className="form-input" value={uqmsNo || 'N/A'} readOnly style={{ background: 'var(--bg-subtle)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label className="form-label">Port of Survey</label>
                <input type="text" className="form-input" value={portOfSurvey || 'N/A'} readOnly style={{ background: 'var(--bg-subtle)', color: 'var(--muted)' }} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--separator)', margin: '20px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px 24px' }}>
              <div>
                <label className="form-label">Survey Requested Date</label>
                <input type="text" className="form-input" value={surveyRequestedDate ? formatDate(surveyRequestedDate) : 'N/A'} readOnly style={{ background: 'var(--bg-subtle)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label className="form-label">First Survey Visit Date (1st Survey Date)</label>
                <input type="text" className="form-input" value={firstSurveyDate ? formatDate(firstSurveyDate) : 'N/A'} readOnly style={{ background: 'var(--bg-subtle)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label className="form-label">Last Survey Visit Date (Last Survey Date)</label>
                <input type="text" className="form-input" value={lastSurveyDate ? formatDate(lastSurveyDate) : 'N/A'} readOnly style={{ background: 'var(--bg-subtle)', color: 'var(--muted)' }} />
              </div>
            </div>
          </div>
        )}

        {/* Report Remarks & Status */}
        {selectedBookingId && (
          <div className="card animate-in" style={{ marginBottom: '24px' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              Report Customization
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: '20px' }}>
              <div>
                <label className="form-label" htmlFor="anniversaryDate">Anniversary Date</label>
                <input
                  id="anniversaryDate"
                  type="date"
                  className="form-input"
                  value={anniversaryDate}
                  onChange={e => setAnniversaryDate(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="statusSelect">Report Status</label>
                <select
                  id="statusSelect"
                  className="form-input"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  style={{ width: '100%', cursor: 'pointer' }}
                >
                  <option value="Draft">Draft</option>
                  <option value="Approved">Approved</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="remarksArea">Report Remarks</label>
              <textarea
                id="remarksArea"
                className="form-input form-textarea"
                placeholder="Enter overall remarks, summary of condition, and certificate recommendations..."
                value={reportRemarks}
                onChange={e => setReportRemarks(e.target.value)}
                style={{ height: '110px' }}
              />
            </div>
          </div>
        )}

        {/* Survey Categories Grid */}
        {selectedBookingId && (
          <div className="card animate-in" style={{ marginBottom: '32px' }}>
            <div className="card-header" style={{ marginBottom: '14px' }}>Survey Name Details Grid</div>

            {surveys.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-subtle)', borderRadius: '10px', color: 'var(--muted)', fontSize: '13px' }}>
                No surveys requested in this booking.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', margin: '0 -24px -24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '250px' }}>Survey Name</th>
                      <th style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '150px' }}>Status</th>
                      <th style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '100px' }}>Postponed?</th>
                      <th style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '140px' }}>Postpone Date</th>
                      <th style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '140px' }}>Survey Date</th>
                      <th style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '140px' }}>Assigned Date</th>
                      <th style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '220px' }}>Due Range (From - To)</th>
                      <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '350px' }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surveys.map((survey, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                        {/* Category Name */}
                        <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
                          <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: '4px', background: 'var(--primary-subtle)', color: 'var(--primary)', fontWeight: 700 }}>
                            {getSurveyName(survey.surveyCategory)}
                          </span>
                        </td>

                        {/* Status Select */}
                        <td style={{ padding: '14px 14px' }}>
                          <select
                            className="form-input"
                            value={survey.surveyStatus || 'Pending'}
                            onChange={e => updateSurveyField(index, 'surveyStatus', e.target.value)}
                            style={{ padding: '6px 8px', fontSize: '12px', height: 'auto', minWidth: '130px', cursor: 'pointer' }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                            <option value="Partially Completed">Partially Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>

                        {/* Is Postponed Checkbox */}
                        <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!survey.isPostponed}
                            onChange={e => updateSurveyField(index, 'isPostponed', e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                        </td>

                        {/* Postpone Date */}
                        <td style={{ padding: '14px 14px' }}>
                          <input
                            type="date"
                            className="form-input"
                            value={survey.postponeDate || ''}
                            onChange={e => updateSurveyField(index, 'postponeDate', e.target.value)}
                            disabled={!survey.isPostponed}
                            style={{ padding: '6px 8px', fontSize: '12px', height: 'auto', background: !survey.isPostponed ? 'var(--bg-subtle)' : 'var(--bg)' }}
                          />
                        </td>

                        {/* Survey Date */}
                        <td style={{ padding: '14px 14px' }}>
                          <input
                            type="date"
                            className="form-input"
                            value={survey.surveyDate || ''}
                            onChange={e => updateSurveyField(index, 'surveyDate', e.target.value)}
                            style={{ padding: '6px 8px', fontSize: '12px', height: 'auto' }}
                          />
                        </td>

                        {/* Assigned Date */}
                        <td style={{ padding: '14px 14px' }}>
                          <input
                            type="date"
                            className="form-input"
                            value={survey.assignedDate || ''}
                            onChange={e => updateSurveyField(index, 'assignedDate', e.target.value)}
                            style={{ padding: '6px 8px', fontSize: '12px', height: 'auto' }}
                          />
                        </td>

                        {/* Due Range (From - To) */}
                        <td style={{ padding: '14px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="date"
                              className="form-input"
                              value={survey.dueFrom || ''}
                              onChange={e => updateSurveyField(index, 'dueFrom', e.target.value)}
                              style={{ padding: '4px 6px', fontSize: '11px', height: 'auto' }}
                            />
                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>to</span>
                            <input
                              type="date"
                              className="form-input"
                              value={survey.dueTo || ''}
                              onChange={e => updateSurveyField(index, 'dueTo', e.target.value)}
                              style={{ padding: '4px 6px', fontSize: '11px', height: 'auto' }}
                            />
                          </div>
                        </td>

                        {/* Remarks */}
                        <td style={{ padding: '14px 20px' }}>
                          <textarea
                            className="form-input"
                            placeholder="Add remarks..."
                            value={survey.remarks || ''}
                            onChange={e => updateSurveyField(index, 'remarks', e.target.value)}
                            style={{ padding: '6px 8px', fontSize: '12px', minWidth: '320px', height: '64px', resize: 'vertical', lineHeight: '1.4' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Buttons Row */}
        {selectedBookingId && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '40px' }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ minWidth: '180px', marginBottom: 0 }}
            >
              {loading ? 'Saving...' : 'Save Survey Report'}
            </button>

            {isEdit && vessel && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsNotesModalOpen(true)}
                style={{
                  minWidth: '180px',
                  marginBottom: 0,
                  background: 'var(--primary)',
                  borderColor: 'var(--primary)'
                }}
              >
                Manage Vessel Notes
              </button>
            )}

            {isEdit && id && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate(`/${activeModule}/marine/first-entry/survey-report/equipment-record/${id}`)}
                style={{
                  minWidth: '180px',
                  marginBottom: 0,
                  background: 'var(--primary)',
                  borderColor: 'var(--primary)'
                }}
              >
                Record of Equipment
              </button>
            )}

            {isEdit && id && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate(`/${activeModule}/marine/first-entry/survey-report/final/${id}`)}
                style={{
                  minWidth: '180px',
                  marginBottom: 0,
                  background: 'var(--primary)',
                  borderColor: 'var(--primary)'
                }}
              >
                Final Survey Report
              </button>
            )}

            {isScccosEligible && booking && (
              status === 'COS Generated' ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleViewCos(id || '')}
                  style={{
                    minWidth: '180px',
                    marginBottom: 0,
                    background: 'var(--primary)',
                    borderColor: 'var(--primary)'
                  }}
                >
                  View COS
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setIsScccosModalOpen(true)}
                  style={{
                    minWidth: '180px',
                    marginBottom: 0,
                    background: 'var(--green)',
                    borderColor: 'var(--green)'
                  }}
                >
                  Generate SSC COS Certificate
                </button>
              )
            )}

            <Link to={`/${activeModule}/marine`} style={{ textDecoration: 'none' }}>
              <button type="button" className="btn-secondary" style={{ minWidth: '180px', marginBottom: 0 }}>
                Cancel
              </button>
            </Link>
          </div>
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
    </div>
  );
}
