import React, { useEffect, useState } from 'react';
import { Check, Plus, Trash2, UserPlus, X } from 'lucide-react';
import {
  Badge, Button, ButtonLink, Checkbox, Field, FormGrid, FormSection, FormWithNav, IconButton, Input, LoadingBlock, PageHeader,
  SectionNav, Select, StickyActionBar,
} from '@/ui';
import s from './CreateFirstEntrySurveyBooking.module.css';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import { useNavigate, useParams } from 'react-router-dom';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { toast } from 'react-toastify';
import { normalizeBuildDateText } from '@/utils/date';
import {
  vesselsService,
  operationsService,
  usersService,
  firstEntryService,
  requestsService
} from '@/api';
import type {
  ApiVessel,
  ApiVesselType,
  ApiSurveyType,
  ApiUserDirectoryEntry,
  ApiVisitDetail,
  ApiSurveyorAssignment,
  ApiRequest
} from '@/api';

export default function CreateFirstEntrySurveyBooking() {
  const navigate = useNavigate();
  const unsaved = useUnsavedChanges();
  const { id, module } = useParams<{ id?: string; module?: string }>(); // Booking ID if editing
  const activeModule = module || 'reporting';
  const isEdit = !!id;
  const { can } = useAuth();
  const canSave = can(MODULE_KEYS.marineBookings, isEdit ? 'update' : 'create');

  // Metadata Dropdowns
  const [vessels, setVessels] = useState<ApiVessel[]>([]);
  const [vesselTypes, setVesselTypes] = useState<ApiVesselType[]>([]);
  const [surveyTypes, setSurveyTypes] = useState<ApiSurveyType[]>([]);
  const [users, setUsers] = useState<ApiUserDirectoryEntry[]>([]);
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);

  // Original booking from DB (used to enforce read-only constraint on non-blank fields)
  const [originalBooking, setOriginalBooking] = useState<any>(null);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  // Form Fields - Left Column
  const [selectedVesselId, setSelectedVesselId] = useState('');
  const [shipName, setShipName] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [portOfSurvey, setPortOfSurvey] = useState('');
  const [reportNo, setReportNo] = useState('');
  const [portOfRegistry, setPortOfRegistry] = useState('');
  const [flag, setFlag] = useState('');
  const [shipType, setShipType] = useState('');
  const [shipBuilder, setShipBuilder] = useState('');
  const [engineBuilder, setEngineBuilder] = useState('');
  const [duallyClassWith, setDuallyClassWith] = useState('');
  const [dwt, setDwt] = useState<number | ''>('');
  const [keelDate, setKeelDate] = useState('');

  // Form Fields - Right Column
  const [uqmsNo, setUqmsNo] = useState('');
  const [requestedDate, setRequestedDate] = useState(new Date().toISOString().split('T')[0]);
  const [surveyMode, setSurveyMode] = useState('Singly');
  const [society, setSociety] = useState('');
  const [managedBy, setManagedBy] = useState('');
  const [buildDate, setBuildDate] = useState('');
  const [yardNo, setYardNo] = useState('');
  const [officialNo, setOfficialNo] = useState('');
  const [gt, setGt] = useState<number | ''>('');
  const [callSign, setCallSign] = useState('');

  // Form Arrays
  const [surveysRequested, setSurveysRequested] = useState<string[]>([]);
  const [visitDetails, setVisitDetails] = useState<ApiVisitDetail[]>([]);

  // Fetch Dropdowns & Edit Details
  useEffect(() => {
    const loadData = async () => {
      try {
        const [vesselsRes, vTypesRes, sTypesRes, usersRes, requestsRes] = await Promise.all([
          vesselsService.getVessels(),
          operationsService.getVesselTypes(),
          operationsService.getSurveyTypes(),
          usersService.getDirectory(),
          requestsService.getRequests()
        ]);

        if (vesselsRes.success) setVessels(vesselsRes.data);
        if (vTypesRes.success) setVesselTypes(vTypesRes.data);
        if (sTypesRes.success) setSurveyTypes(sTypesRes.data);
        if (usersRes.success) setUsers(usersRes.data);
        if (requestsRes.success) setRequests(requestsRes.data);

        if (isEdit && id) {
          const bookingRes = await firstEntryService.getFirstEntrySurveyBookingById(id);
          if (bookingRes.success) {
            const booking = bookingRes.data;
            setOriginalBooking(booking);
            
            setSelectedVesselId(typeof booking.vesselId === 'object' ? booking.vesselId?._id || '' : booking.vesselId || '');
            setShipName(booking.shipName);
            setRequestedBy(booking.requestedBy || '');
            setPortOfSurvey(booking.portOfSurvey || '');
            setReportNo(booking.reportNo || '');
            setPortOfRegistry(booking.portOfRegistry || '');
            setFlag(booking.flag || '');
            setShipType(booking.shipType || '');
            setShipBuilder(booking.shipBuilder || '');
            setEngineBuilder(booking.engineBuilder || '');
            setDuallyClassWith(booking.duallyClassWith || '');
            setDwt(booking.dwt || '');
            setKeelDate(booking.keelDate ? booking.keelDate.split('T')[0] : '');

            setUqmsNo(booking.uqmsNo || '');
            setRequestedDate(booking.requestedDate ? booking.requestedDate.split('T')[0] : new Date().toISOString().split('T')[0]);
            setSurveyMode(booking.surveyMode || 'Singly');
            setSociety(booking.society || '');
            setManagedBy(booking.managedBy || '');
            let db = booking.buildDate || '';
            if (db.includes('T')) {
              db = db.split('T')[0].split('-').join('/');
            }
            setBuildDate(normalizeBuildDateText(db));
            setYardNo(booking.yardNo || '');
            setOfficialNo(booking.officialNo || '');
            setGt(booking.gt || '');
            setCallSign(booking.callSign || '');
            const reqIds = (booking.requestIds || []).map((r: any) => typeof r === 'object' ? r._id || '' : r || '');
            setSelectedRequestIds(reqIds.filter(Boolean));

            setSurveysRequested(booking.surveysRequested || []);
            
            // Format visitDetails for state
            const formattedVisits = (booking.visitDetails || []).map(v => ({
              ...v,
              visitDate: v.visitDate ? v.visitDate.split('T')[0] : '',
              isLastVisitDate: !!v.isLastVisitDate || !!v.isLastVist,
              isLastVist: !!v.isLastVisitDate || !!v.isLastVist,
              surveyorAssignments: (v.surveyorAssignments || []).map(sa => ({
                ...sa,
                surveyorId: typeof sa.surveyorId === 'object' ? sa.surveyorId?._id || '' : sa.surveyorId || ''
              }))
            }));
            setVisitDetails(formattedVisits as any);
          }
        }
      } catch (err: any) {
        toast.error('Error loading lookup options: ' + err.message);
      } finally {
        setInitialLoading(false);
      }
    };

    loadData();
  }, [isEdit, id]);

  // Enforces that if a field was already filled/present in the DB, it becomes read-only
  const isFieldEditable = (fieldName: string) => {
    if (!isEdit) return true; // All fields are editable on creation
    if (!originalBooking) return true;

    const dbValue = originalBooking[fieldName];
    const isBlank = dbValue === undefined || dbValue === null || dbValue === '' || (Array.isArray(dbValue) && dbValue.length === 0);
    return isBlank;
  };

  const handleVesselChange = (vesselId: string) => {
    setSelectedVesselId(vesselId);
    setSelectedRequestIds([]);
    if (!vesselId) {
      handleRemoveVessel();
      return;
    }

    const vessel = vessels.find(v => v._id === vesselId);
    if (vessel) {
      if (isFieldEditable('shipName')) setShipName(vessel.vesselName || '');
      if (isFieldEditable('portOfRegistry')) setPortOfRegistry(vessel.portOfRegistry || '');
      if (isFieldEditable('flag')) setFlag(vessel.flag || '');
      if (isFieldEditable('callSign')) setCallSign(vessel.callSign || '');
      if (isFieldEditable('gt')) setGt(vessel.grossTonnage || '');
      if (isFieldEditable('dwt')) setDwt(vessel.deadweight || '');
      if (isFieldEditable('yardNo')) setYardNo(vessel.yardNo || '');
      if (isFieldEditable('shipBuilder')) setShipBuilder(vessel.builder || '');
      if (isFieldEditable('engineBuilder')) setEngineBuilder(vessel.engineBuilder || '');
      if (isFieldEditable('managedBy')) setManagedBy(vessel.managerName || '');
      if (isFieldEditable('uqmsNo')) setUqmsNo(vessel.uqmsNumber || '');
      
      if (vessel.dateOfBuild && isFieldEditable('buildDate')) {
        let db = vessel.dateOfBuild;
        if (db.includes('T')) {
          db = db.split('T')[0].split('-').join('/');
        }
        setBuildDate(normalizeBuildDateText(db));
      }
      if (vessel.keelDate && isFieldEditable('keelDate')) setKeelDate(vessel.keelDate.split('T')[0]);
      
      if (vessel.vesselType && isFieldEditable('shipType')) {
        const vtName = typeof vessel.vesselType === 'object' ? vessel.vesselType.name : '';
        setShipType(vtName);
      }
    }
  };

  // Clears/removes the vessel link and completely refreshes/resets the form fields to blank
  const handleRemoveVessel = () => {
    setSelectedVesselId('');
    setSelectedRequestIds([]);

    // Clear all fields if they are editable
    if (isFieldEditable('shipName')) setShipName('');
    if (isFieldEditable('requestedBy')) setRequestedBy('');
    if (isFieldEditable('portOfSurvey')) setPortOfSurvey('');
    if (isFieldEditable('reportNo')) setReportNo('');
    if (isFieldEditable('portOfRegistry')) setPortOfRegistry('');
    if (isFieldEditable('flag')) setFlag('');
    if (isFieldEditable('shipType')) setShipType('');
    if (isFieldEditable('shipBuilder')) setShipBuilder('');
    if (isFieldEditable('engineBuilder')) setEngineBuilder('');
    if (isFieldEditable('duallyClassWith')) setDuallyClassWith('');
    if (isFieldEditable('dwt')) setDwt('');
    if (isFieldEditable('keelDate')) setKeelDate('');
    if (isFieldEditable('uqmsNo')) setUqmsNo('');
    if (isFieldEditable('requestedDate')) setRequestedDate(new Date().toISOString().split('T')[0]);
    if (isFieldEditable('surveyMode')) setSurveyMode('Singly');
    if (isFieldEditable('society')) setSociety('');
    if (isFieldEditable('managedBy')) setManagedBy('');
    if (isFieldEditable('buildDate')) setBuildDate('');
    if (isFieldEditable('yardNo')) setYardNo('');
    if (isFieldEditable('officialNo')) setOfficialNo('');
    if (isFieldEditable('gt')) setGt('');
    if (isFieldEditable('callSign')) setCallSign('');
    if (isFieldEditable('surveysRequested')) setSurveysRequested([]);

    toast.info('Vessel association removed and form refreshed.');
  };

  const getRelevantRequests = () => {
    let filtered = [] as ApiRequest[];
    if (selectedVesselId) {
      const vessel = vessels.find(v => v._id === selectedVesselId);
      if (vessel) {
        filtered = requests.filter(req => {
          const nameMatch = req.vesselName?.trim().toLowerCase() === vessel.vesselName?.trim().toLowerCase();
          const imoMatch = vessel.imoNumber && req.imoNumber && req.imoNumber.trim() === vessel.imoNumber.trim();
          const mmsiMatch = vessel.mmsiNumber && req.mmsiNumber && req.mmsiNumber.trim() === vessel.mmsiNumber.trim();
          const uqmsMatch = vessel.uqmsNumber && req.uqmsNumber && req.uqmsNumber.trim() === vessel.uqmsNumber.trim();
          return (nameMatch || imoMatch || mmsiMatch || uqmsMatch);
        });
      }
    } else if (shipName.trim()) {
      filtered = requests.filter(req => req.vesselName?.trim().toLowerCase() === shipName.trim().toLowerCase() && req.status !== 'success');
    }

    // Always include requests that are already selected, even if they don't match the current filter
    selectedRequestIds.forEach(id => {
      if (!filtered.some(req => req._id === id)) {
        const existingReq = requests.find(req => req._id === id);
        if (existingReq) {
          filtered.push(existingReq);
        }
      }
    });

    return filtered;
  };

  const relevantRequests = getRelevantRequests();

  const handleRequestToggle = (requestId: string) => {
    if (!isFieldEditable('requestIds')) return; // read-only check

    let updatedRequestIds = [];
    if (selectedRequestIds.includes(requestId)) {
      updatedRequestIds = selectedRequestIds.filter(id => id !== requestId);
    } else {
      updatedRequestIds = [...selectedRequestIds, requestId];
    }
    setSelectedRequestIds(updatedRequestIds);

    // Automatically set requestedDate from the first selected request's createdAt date
    if (updatedRequestIds.length > 0) {
      const firstReq = requests.find(r => r._id === updatedRequestIds[0]);
      if (firstReq && firstReq.createdAt) {
        setRequestedDate(firstReq.createdAt.split('T')[0]);
      }
    }

    // Automatically load all survey codes from these selected requests
    const surveyCodes = new Set<string>();
    updatedRequestIds.forEach(reqId => {
      const reqObj = requests.find(r => r._id === reqId);
      if (reqObj && reqObj.surveyTypes) {
        reqObj.surveyTypes.forEach(st => {
          if (typeof st === 'object' && st.code) {
            surveyCodes.add(st.code);
          } else if (typeof st === 'string') {
            const stObj = surveyTypes.find(s => s._id === st || s.code === st);
            if (stObj) {
              surveyCodes.add(stObj.code);
            }
          }
        });
      }
    });

    setSurveysRequested(Array.from(surveyCodes));
  };

  // Visit details logic
  const addVisitRow = () => {
    const newVisit: ApiVisitDetail = {
      visitNo: `Visit ${visitDetails.length + 1}`,
      visitDate: '',
      startSurvey: '',
      endSurvey: '',
      location: '',
      status: 'scheduled',
      isLastVisitDate: false,
      isLastVist: false,
      surveyorAssignments: []
    };
    setVisitDetails([...visitDetails, newVisit]);
  };

  const removeVisitRow = (index: number) => {
    setVisitDetails(visitDetails.filter((_, i) => i !== index));
  };

  const updateVisitField = (visitIndex: number, field: keyof ApiVisitDetail, value: any) => {
    const updated = [...visitDetails];
    updated[visitIndex] = {
      ...updated[visitIndex],
      [field]: value
    };
    setVisitDetails(updated);
  };

  const handleLastVisitToggle = (visitIndex: number, checked: boolean) => {
    const updated = visitDetails.map((v, idx) => {
      if (idx === visitIndex) {
        return {
          ...v,
          isLastVisitDate: checked,
          isLastVist: checked
        };
      } else {
        return {
          ...v,
          isLastVisitDate: false,
          isLastVist: false
        };
      }
    });
    setVisitDetails(updated);
  };

  // Surveyor assignments logic
  const addSurveyorAssignment = (visitIndex: number) => {
    const updated = [...visitDetails];
    const newAssignment: ApiSurveyorAssignment = {
      surveyorId: '',
      currency: 'USD',
      specialAttendanceFees: 0
    };
    updated[visitIndex].surveyorAssignments.push(newAssignment);
    setVisitDetails(updated);
  };

  const removeSurveyorAssignment = (visitIndex: number, assignmentIndex: number) => {
    const updated = [...visitDetails];
    updated[visitIndex].surveyorAssignments = updated[visitIndex].surveyorAssignments.filter((_, i) => i !== assignmentIndex);
    setVisitDetails(updated);
  };

  const updateSurveyorAssignmentField = (visitIndex: number, assignmentIndex: number, field: keyof ApiSurveyorAssignment, value: any) => {
    const updated = [...visitDetails];
    const assignment = updated[visitIndex].surveyorAssignments[assignmentIndex];
    updated[visitIndex].surveyorAssignments[assignmentIndex] = {
      ...assignment,
      [field]: value
    };
    setVisitDetails(updated);
  };

  // Survey requested tags
  const handleSurveyRequestedToggle = (code: string) => {
    if (!isFieldEditable('surveysRequested')) return; // read-only check
    
    if (surveysRequested.includes(code)) {
      setSurveysRequested(surveysRequested.filter(c => c !== code));
    } else {
      setSurveysRequested([...surveysRequested, code]);
    }
  };

  type BookingErrors = Partial<Record<'shipName' | 'portOfSurvey' | 'shipBuilder' | 'engineBuilder', string>> & { visitDates?: number[] };
  const [errors, setErrors] = useState<BookingErrors>({});

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const found: BookingErrors = {};
    if (!shipName.trim()) found.shipName = 'Enter the ship name.';
    if (!portOfSurvey.trim()) found.portOfSurvey = 'Enter the port of survey.';
    if (!shipBuilder.trim()) found.shipBuilder = 'Enter the ship builder.';
    if (!engineBuilder.trim()) found.engineBuilder = 'Enter the engine builder.';
    // Visit dates are mandatory. (Back-dating before the requested date is currently allowed so old records can be entered.)
    const missingDates = visitDetails.map((v, i) => (v.visitDate ? -1 : i)).filter(i => i >= 0);
    if (missingDates.length) found.visitDates = missingDates;

    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error('Some required fields are missing. They are highlighted below.');
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        first?.focus({ preventScroll: true });
      });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        vesselId: selectedVesselId || undefined,
        requestIds: selectedRequestIds,
        shipName: shipName.trim(),
        requestedBy: requestedBy.trim() || undefined,
        portOfSurvey: portOfSurvey.trim() || undefined,
        reportNo: reportNo.trim() || undefined, // Will be generated automatically in the backend if creating
        portOfRegistry: portOfRegistry.trim() || undefined,
        flag: flag.trim() || undefined,
        shipType: shipType.trim() || undefined,
        shipBuilder: shipBuilder.trim() || undefined,
        engineBuilder: engineBuilder.trim() || undefined,
        duallyClassWith: duallyClassWith.trim() || undefined,
        dwt: dwt !== '' ? Number(dwt) : undefined,
        keelDate: keelDate || undefined,

        uqmsNo: uqmsNo.trim() || undefined,
        requestedDate: new Date(requestedDate).toISOString(),
        surveyMode,
        society: society.trim() || undefined,
        managedBy: managedBy.trim() || undefined,
        buildDate: buildDate || undefined,
        yardNo: yardNo.trim() || undefined,
        officialNo: officialNo.trim() || undefined,
        gt: gt !== '' ? Number(gt) : undefined,
        callSign: callSign.trim() || undefined,

        surveysRequested,
        visitDetails,
        status: 'active'
      };

      let res;
      if (isEdit && id) {
        res = await firstEntryService.updateFirstEntrySurveyBooking(id, payload as any);
      } else {
        res = await firstEntryService.createFirstEntrySurveyBooking(payload as any);
      }

      if (res.success) {
        toast.success(isEdit ? 'Survey Booking updated successfully!' : 'Survey Booking created successfully!');
        unsaved.allowNavigation();
        navigate(`/${activeModule}/marine/first-entry?tab=survey`);
      } else {
        toast.error(res.message || 'Failed to save booking.');
      }
    } catch (err: any) {
      toast.error('Error saving survey booking: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingBlock label="Loading survey booking…" />;
  }

  const listPath = `/${activeModule}/marine/first-entry?tab=survey`;
  const clearError = (key: 'shipName' | 'portOfSurvey' | 'shipBuilder' | 'engineBuilder') =>
    setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));
  const numberValue = (v: string): number | '' => (v !== '' ? Number(v) : '');
  const requestsEditable = isFieldEditable('requestIds');
  const surveysEditable = isFieldEditable('surveysRequested');

  const SECTIONS = [
    { id: 'sb-vessel', label: 'Vessel', invalid: !!errors.shipName },
    { id: 'sb-requests', label: 'Requests' },
    { id: 'sb-details', label: 'Particulars', invalid: !!(errors.portOfSurvey || errors.shipBuilder || errors.engineBuilder) },
    { id: 'sb-surveys', label: 'Surveys requested' },
    { id: 'sb-visits', label: 'Visits', invalid: !!errors.visitDates?.length },
  ];

  return (
    <div className="animate-in">
      <PageHeader
        back={{ href: listPath, label: 'Survey bookings' }}
        title={isEdit ? 'Edit survey booking' : 'Book survey'}
        description={isEdit
          ? 'Fields that already have a value are locked. Visits and surveyor assignments can always be changed.'
          : 'Link the vessel and its requests, then plan visits and assign surveyors. Fields marked * are required.'}
        meta={<Badge tone={reportNo ? 'accent' : 'neutral'} title="Report number">{reportNo || (isEdit ? 'No report no.' : 'Report no. assigned on save')}</Badge>}
      />

      <FormWithNav nav={<SectionNav sections={SECTIONS} />}>
        <form onSubmit={handleSubmit} onChangeCapture={unsaved.markDirty} noValidate>
          <FormSection id="sb-vessel" title="Vessel" description="Choosing a registered vessel fills in its registry, tonnage and engine details.">
            <FormGrid columns={2}>
              <Field label="Registered vessel" hint="Optional: leave empty for an unlisted vessel">
                <div className={s.inline}>
                  <Select value={selectedVesselId} onChange={e => handleVesselChange(e.target.value)} disabled={!isFieldEditable('vesselId')}>
                    <option value="">Unlisted vessel (enter manually)</option>
                    {vessels.map(v => (
                      <option key={v._id} value={v._id}>{v.vesselName} {v.uqmsNumber ? `(${v.uqmsNumber})` : ''}</option>
                    ))}
                  </Select>
                  {selectedVesselId && isFieldEditable('vesselId') && (
                    <IconButton label="Clear vessel" icon={<X />} variant="secondary" onClick={handleRemoveVessel} />
                  )}
                </div>
              </Field>
              <Field label="Ship name" required error={errors.shipName}>
                <Input placeholder="e.g. MV Apollo" value={shipName} disabled={!isFieldEditable('shipName')}
                  onChange={e => { setShipName(e.target.value); clearError('shipName'); }} />
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection
            id="sb-requests"
            title="Requests"
            description={`Survey requests for ${shipName || 'this ship'}. Selecting a request adds its surveys to this booking.`}
          >
            {relevantRequests.length === 0 ? (
              <p className={s.empty}>
                No open requests match {shipName ? `“${shipName}”` : 'this ship'}. Choose a registered vessel or enter the ship name as it appears on the request.
              </p>
            ) : (
              <div className={s.requestGrid}>
                {relevantRequests.map(req => {
                  const checked = selectedRequestIds.includes(req._id);
                  return (
                    <label key={req._id} className={`${s.requestCard} ${checked ? s.requestCardOn : ''} ${requestsEditable ? '' : s.requestCardLocked}`}>
                      <input
                        type="checkbox"
                        className={s.requestCheck}
                        checked={checked}
                        disabled={!requestsEditable}
                        onChange={() => handleRequestToggle(req._id)}
                      />
                      <span className={s.requestBody}>
                        <span className={s.requestNo}>{req.requestNumber}</span>
                        <span className={s.requestMeta}>{req.companyName} · <span className={s.capitalize}>{req.sector}</span></span>
                        {req.surveyTypes?.length > 0 && (
                          <span className={s.requestTags}>
                            {req.surveyTypes.map((st: any) => {
                              const code = typeof st === 'object' ? st.code : st;
                              return <Badge key={code} tone={checked ? 'accent' : 'neutral'} title={typeof st === 'object' ? st.name : st}>{code}</Badge>;
                            })}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </FormSection>

          <FormSection id="sb-details" title="Particulars">
            <FormGrid columns={3}>
              <Field label="Port of survey" required error={errors.portOfSurvey}>
                <Input placeholder="e.g. Colombo" value={portOfSurvey} disabled={!isFieldEditable('portOfSurvey')}
                  onChange={e => { setPortOfSurvey(e.target.value); clearError('portOfSurvey'); }} />
              </Field>
              <Field label="Requested date" required>
                <Input type="date" value={requestedDate} disabled={!isFieldEditable('requestedDate')} onChange={e => setRequestedDate(e.target.value)} />
              </Field>
              <Field label="Requested by">
                <Input placeholder="e.g. Agency name" value={requestedBy} disabled={!isFieldEditable('requestedBy')} onChange={e => setRequestedBy(e.target.value)} />
              </Field>
              <Field label="Survey mode">
                <Select value={surveyMode} disabled={!isFieldEditable('surveyMode')} onChange={e => setSurveyMode(e.target.value)}>
                  <option value="Singly">Singly</option>
                  <option value="Jointly">Jointly</option>
                  <option value="OnBehalf">Singly and on behalf</option>
                </Select>
              </Field>
              <Field label="Society">
                <Input placeholder="e.g. Lloyd's" value={society} disabled={!isFieldEditable('society')} onChange={e => setSociety(e.target.value)} />
              </Field>
              <Field label="Dually class with">
                <Input value={duallyClassWith} disabled={!isFieldEditable('duallyClassWith')} onChange={e => setDuallyClassWith(e.target.value)} />
              </Field>
              <Field label="UQMS number">
                <Input value={uqmsNo} disabled={!isFieldEditable('uqmsNo')} onChange={e => setUqmsNo(e.target.value)} />
              </Field>
              <Field label="Official no.">
                <Input value={officialNo} disabled={!isFieldEditable('officialNo')} onChange={e => setOfficialNo(e.target.value)} />
              </Field>
              <Field label="Call sign">
                <Input value={callSign} disabled={!isFieldEditable('callSign')} onChange={e => setCallSign(e.target.value)} />
              </Field>
              <Field label="Ship type">
                <Input placeholder="e.g. Container ship" value={shipType} disabled={!isFieldEditable('shipType')} onChange={e => setShipType(e.target.value)} />
              </Field>
              <Field label="Flag">
                <Input value={flag} disabled={!isFieldEditable('flag')} onChange={e => setFlag(e.target.value)} />
              </Field>
              <Field label="Port of registry">
                <Input value={portOfRegistry} disabled={!isFieldEditable('portOfRegistry')} onChange={e => setPortOfRegistry(e.target.value)} />
              </Field>
              <Field label="Managed by">
                <Input value={managedBy} disabled={!isFieldEditable('managedBy')} onChange={e => setManagedBy(e.target.value)} />
              </Field>
              <Field label="Gross tonnage">
                <Input type="number" inputMode="decimal" suffix="GT" value={gt} disabled={!isFieldEditable('gt')} onChange={e => setGt(numberValue(e.target.value))} />
              </Field>
              <Field label="Deadweight">
                <Input type="number" inputMode="decimal" suffix="DWT" value={dwt} disabled={!isFieldEditable('dwt')} onChange={e => setDwt(numberValue(e.target.value))} />
              </Field>
              <Field label="Ship builder" required error={errors.shipBuilder}>
                <Input value={shipBuilder} disabled={!isFieldEditable('shipBuilder')} onChange={e => { setShipBuilder(e.target.value); clearError('shipBuilder'); }} />
              </Field>
              <Field label="Engine builder" required error={errors.engineBuilder}>
                <Input value={engineBuilder} disabled={!isFieldEditable('engineBuilder')} onChange={e => { setEngineBuilder(e.target.value); clearError('engineBuilder'); }} />
              </Field>
              <Field label="Yard no.">
                <Input value={yardNo} disabled={!isFieldEditable('yardNo')} onChange={e => setYardNo(e.target.value)} />
              </Field>
              <Field label="Build date" hint="YYYY/MM/DD or YYYY/MM">
                <Input inputMode="numeric" placeholder="YYYY/MM/DD" value={buildDate} disabled={!isFieldEditable('buildDate')}
                  onChange={e => setBuildDate(e.target.value.replace(/[^\d/]/g, ''))} />
              </Field>
              <Field label="Keel date">
                <Input type="date" value={keelDate} disabled={!isFieldEditable('keelDate')} onChange={e => setKeelDate(e.target.value)} />
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection id="sb-surveys" title="Surveys requested" description="Filled in from the selected requests; adjust if needed.">
            {surveyTypes.length === 0 ? (
              <p className={s.empty}>No survey types are configured yet.</p>
            ) : (
              <div className={s.chips} role="group" aria-label="Surveys requested">
                {surveyTypes.map(st => {
                  const on = surveysRequested.includes(st.code);
                  return (
                    <button
                      type="button"
                      key={st._id}
                      className={`${s.chip} ${on ? s.chipOn : ''}`}
                      aria-pressed={on}
                      disabled={!surveysEditable}
                      onClick={() => { handleSurveyRequestedToggle(st.code); unsaved.markDirty(); }}
                    >
                      {on && <Check aria-hidden="true" />}
                      {st.name} <span className={s.chipCode}>{st.code}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </FormSection>

          <FormSection
            id="sb-visits"
            title="Visits"
            description="Plan each visit and assign surveyors. Mark the final visit as the last visit."
            actions={<Button size="sm" icon={<Plus />} onClick={() => { addVisitRow(); unsaved.markDirty(); }}>Add visit</Button>}
          >
            {visitDetails.length === 0 ? (
              <p className={s.empty}>No visits planned yet. Use “Add visit” to plan the first one.</p>
            ) : (
              <div className={s.visits}>
                {visitDetails.map((visit, visitIdx) => {
                  const dateMissing = errors.visitDates?.includes(visitIdx) && !visit.visitDate;
                  const isLast = !!visit.isLastVisitDate || !!visit.isLastVist;
                  return (
                    <section key={visitIdx} className={s.visit} aria-label={visit.visitNo || `Visit ${visitIdx + 1}`}>
                      <header className={s.visitHeader}>
                        <span className={s.visitNumber} aria-hidden="true">{visitIdx + 1}</span>
                        <span className={s.visitTitle}>{visit.visitNo || `Visit ${visitIdx + 1}`}</span>
                        {isLast && <Badge tone="accent">Last visit</Badge>}
                        <IconButton className={s.visitRemove} label={`Remove ${visit.visitNo || `visit ${visitIdx + 1}`}`} icon={<Trash2 />}
                          size="sm" variant="dangerGhost" onClick={() => { removeVisitRow(visitIdx); unsaved.markDirty(); }} />
                      </header>

                      <FormGrid columns={3}>
                        <Field label="Visit no.">
                          <Input placeholder="e.g. Visit 1" value={visit.visitNo || ''} onChange={e => updateVisitField(visitIdx, 'visitNo', e.target.value)} />
                        </Field>
                        <Field label="Visit date" required error={dateMissing ? 'Choose the visit date.' : undefined}>
                          <Input type="date" value={visit.visitDate} onChange={e => updateVisitField(visitIdx, 'visitDate', e.target.value)} />
                        </Field>
                        <Field label="Status">
                          <Select value={visit.status || 'scheduled'} onChange={e => updateVisitField(visitIdx, 'status', e.target.value)}>
                            <option value="scheduled">Scheduled</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </Select>
                        </Field>
                        <Field label="Survey start">
                          <Input type="time" value={visit.startSurvey || ''} onChange={e => updateVisitField(visitIdx, 'startSurvey', e.target.value)} />
                        </Field>
                        <Field label="Survey end">
                          <Input type="time" value={visit.endSurvey || ''} onChange={e => updateVisitField(visitIdx, 'endSurvey', e.target.value)} />
                        </Field>
                        <Field label="Location">
                          <Input placeholder="e.g. Anchorage" value={visit.location || ''} onChange={e => updateVisitField(visitIdx, 'location', e.target.value)} />
                        </Field>
                      </FormGrid>
                      <div className={s.lastVisit}>
                        <Checkbox label="This is the last visit" description="Only one visit can be the last one."
                          checked={isLast} onChange={e => handleLastVisitToggle(visitIdx, e.target.checked)} />
                      </div>

                      <div className={s.assignments}>
                        <div className={s.assignmentsHeader}>
                          <span className={s.assignmentsTitle}>Surveyors & special fees</span>
                          <Button size="sm" variant="ghost" icon={<UserPlus />} onClick={() => { addSurveyorAssignment(visitIdx); unsaved.markDirty(); }}>Add surveyor</Button>
                        </div>
                        {visit.surveyorAssignments.length === 0 ? (
                          <p className={s.emptySmall}>No surveyors assigned to this visit yet.</p>
                        ) : (
                          visit.surveyorAssignments.map((assignment, assignIdx) => (
                            <div key={assignIdx} className={s.assignment}>
                              <Field label="Surveyor">
                                <Select
                                  value={typeof assignment.surveyorId === 'object' ? (assignment.surveyorId as any)?._id || '' : assignment.surveyorId || ''}
                                  onChange={e => updateSurveyorAssignmentField(visitIdx, assignIdx, 'surveyorId', e.target.value)}
                                >
                                  <option value="">Choose surveyor</option>
                                  {users.map(u => <option key={u._id} value={u._id}>{u.fullName || u.username} ({u.username})</option>)}
                                </Select>
                              </Field>
                              <Field label="Currency">
                                <Input placeholder="USD" value={assignment.currency || 'USD'} onChange={e => updateSurveyorAssignmentField(visitIdx, assignIdx, 'currency', e.target.value)} />
                              </Field>
                              <Field label="Special attendance fee">
                                <Input type="number" inputMode="decimal" placeholder="0.00"
                                  value={assignment.specialAttendanceFees === undefined ? '' : assignment.specialAttendanceFees}
                                  onChange={e => updateSurveyorAssignmentField(visitIdx, assignIdx, 'specialAttendanceFees', e.target.value !== '' ? Number(e.target.value) : '')} />
                              </Field>
                              <IconButton className={s.assignmentRemove} label="Remove surveyor" icon={<X />} size="sm"
                                onClick={() => { removeSurveyorAssignment(visitIdx, assignIdx); unsaved.markDirty(); }} />
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </FormSection>

          <StickyActionBar dirty={unsaved.dirty}>
            <ButtonLink to={listPath}>Cancel</ButtonLink>
            <Button type="submit" variant="primary" loading={loading} disabled={!canSave}
              title={canSave ? undefined : 'You do not have permission to save this record.'}>
              {isEdit ? 'Save changes' : 'Book survey'}
            </Button>
          </StickyActionBar>
        </form>
      </FormWithNav>
      {unsaved.dialog}
    </div>
  );
}
