import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
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
  ApiUser,
  ApiVisitDetail,
  ApiSurveyorAssignment,
  ApiRequest
} from '@/api';

export default function CreateFirstEntrySurveyBooking() {
  const navigate = useNavigate();
  const { id, module } = useParams<{ id?: string; module?: string }>(); // Booking ID if editing
  const activeModule = module || 'reporting';
  const isEdit = !!id;

  // Metadata Dropdowns
  const [vessels, setVessels] = useState<ApiVessel[]>([]);
  const [vesselTypes, setVesselTypes] = useState<ApiVesselType[]>([]);
  const [surveyTypes, setSurveyTypes] = useState<ApiSurveyType[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
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
          usersService.getUsers(),
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
            setBuildDate(booking.buildDate ? booking.buildDate.split('T')[0] : '');
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
      
      if (vessel.dateOfBuild && isFieldEditable('buildDate')) setBuildDate(vessel.dateOfBuild.split('T')[0]);
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
          const uqmsMatch = vessel.uqmsNumber && req.uqmsNumber && req.uqmsNumber.trim() === vessel.uqmsNumber.trim();
          return (nameMatch || imoMatch || uqmsMatch) && req.status !== 'success';
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

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shipName.trim()) {
      toast.error('Ship Name is required.');
      return;
    }

    // MANDATORY FIELD VALIDATION
    if (!portOfSurvey.trim()) {
      toast.error('Port of Survey is required.');
      return;
    }
    if (!shipBuilder.trim()) {
      toast.error('Ship Builder is required.');
      return;
    }
    if (!engineBuilder.trim()) {
      toast.error('Engine Builder is required.');
      return;
    }

    // Validate visits (visitDate is mandatory and cannot be before requestedDate)
    for (let i = 0; i < visitDetails.length; i++) {
      if (!visitDetails[i].visitDate) {
        toast.error(`Please select a visit date for ${visitDetails[i].visitNo || `Row ${i + 1}`}`);
        return;
      }
      const vDateStr = visitDetails[i].visitDate;
      if (new Date(vDateStr) < new Date(requestedDate)) {
        toast.error(`Visit date for ${visitDetails[i].visitNo || `Row ${i + 1}`} cannot be a backdate from the Requested Date (${requestedDate}).`);
        return;
      }
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
        navigate(`/${activeModule}/marine`);
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
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <p>Loading survey booking details...</p>
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
              {isEdit ? 'Edit Survey Booking' : 'Book First Entry Survey'}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500, marginTop: '4px' }}>
              Book a surveyor and visit details for the first entry vessel. {isEdit && "Non-blank fields are locked and read-only."}
            </p>
          </div>
        </div>

        {/* Report Number Top Section Badge */}
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
          <span style={{ fontSize: '15px', fontWeight: 800, color: reportNo ? 'var(--primary)' : 'var(--muted)', fontFamily: 'monospace' }}>
            {reportNo || (isEdit ? 'N/A' : 'GEN-AUTO')}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Vessel Association */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">Vessel Association</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px 24px', alignItems: 'end' }}>
            <div>
              <label className="form-label" htmlFor="vesselSelect">Select Registered Vessel (Optional)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  id="vesselSelect"
                  className="form-input"
                  value={selectedVesselId}
                  onChange={e => handleVesselChange(e.target.value)}
                  style={{ width: '100%', cursor: 'pointer' }}
                  disabled={!isFieldEditable('vesselId')}
                >
                  <option value="">-- Manual Input / Unlisted Vessel --</option>
                  {vessels.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.vesselName} {v.uqmsNumber ? `(${v.uqmsNumber})` : ''}
                    </option>
                  ))}
                </select>
                {selectedVesselId && isFieldEditable('vesselId') && (
                  <button
                    type="button"
                    onClick={handleRemoveVessel}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--red)', background: 'transparent', whiteSpace: 'nowrap', marginBottom: 0 }}
                  >
                    Remove Vessel
                  </button>
                )}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                Selecting a vessel will auto-populate existing registry, tonnages, and engine details.
              </p>
            </div>
            <div>
              <label className="form-label" htmlFor="shipName">Ship Name *</label>
              <input
                id="shipName"
                type="text"
                className="form-input"
                value={shipName}
                onChange={e => setShipName(e.target.value)}
                placeholder="e.g. MV Apollo"
                required
                disabled={!isFieldEditable('shipName')}
              />
            </div>
          </div>
        </div>

        {/* Request Association Card */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
            Request Association (Multiple Requests)
          </div>
          <div>
            <label className="form-label">
              Select Relevant Survey Requests for {shipName || 'Selected Ship'}
            </label>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px', fontWeight: 500 }}>
              Checking requests will automatically load and add their requested surveys to this booking. Only requests matching the selected vessel or ship name are loaded.
            </p>

            {relevantRequests.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--border)',
                  borderRadius: '12px',
                  color: 'var(--muted)',
                  fontSize: '13px',
                }}
              >
                No active survey requests found matching "{shipName || 'the selected ship'}". 
                Please ensure a vessel is selected or a valid ship name is provided.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                {relevantRequests.map((req) => {
                  const isChecked = selectedRequestIds.includes(req._id);
                  const isEditable = isFieldEditable('requestIds');
                  return (
                    <div
                      key={req._id}
                      onClick={() => isEditable && handleRequestToggle(req._id)}
                      style={{
                        padding: '14px 18px',
                        borderRadius: '12px',
                        border: isChecked ? '1px solid var(--primary)' : '1px solid var(--border)',
                        background: isChecked ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-subtle)',
                        cursor: isEditable ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        opacity: isEditable ? 1 : 0.7,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        disabled={!isEditable}
                        style={{
                          marginTop: '4px',
                          cursor: isEditable ? 'pointer' : 'default',
                          accentColor: 'var(--primary)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: isChecked ? 'var(--primary)' : 'var(--label)',
                            marginBottom: '4px',
                          }}
                        >
                          {req.requestNumber}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: 600, marginBottom: '2px' }}>
                          {req.companyName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          Sector: <span style={{ textTransform: 'capitalize' }}>{req.sector}</span>
                        </div>
                        {req.surveyTypes && req.surveyTypes.length > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {req.surveyTypes.map((st: any) => {
                              const code = typeof st === 'object' ? st.code : st;
                              const name = typeof st === 'object' ? st.name : st;
                              return (
                                <span
                                  key={code}
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: isChecked ? 'rgba(99, 102, 241, 0.12)' : 'var(--border)',
                                    color: isChecked ? 'var(--primary)' : 'var(--muted)',
                                  }}
                                  title={name}
                                >
                                  {code}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 2 Column Details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* Left Column Pane */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              Vessel Details (Left Pane)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
              <div>
                <label className="form-label" htmlFor="requestedBy">Requested By</label>
                <input id="requestedBy" type="text" className="form-input" value={requestedBy} onChange={e => setRequestedBy(e.target.value)} placeholder="e.g. Agency name" disabled={!isFieldEditable('requestedBy')} />
              </div>
              <div>
                <label className="form-label" htmlFor="portOfSurvey">Port of Survey *</label>
                <input id="portOfSurvey" type="text" className="form-input" value={portOfSurvey} onChange={e => setPortOfSurvey(e.target.value)} placeholder="e.g. Colombo" required disabled={!isFieldEditable('portOfSurvey')} />
              </div>

              <div>
                <label className="form-label" htmlFor="portOfRegistry">Port of Registry</label>
                <input id="portOfRegistry" type="text" className="form-input" value={portOfRegistry} onChange={e => setPortOfRegistry(e.target.value)} disabled={!isFieldEditable('portOfRegistry')} />
              </div>
              <div>
                <label className="form-label" htmlFor="flag">Flag</label>
                <input id="flag" type="text" className="form-input" value={flag} onChange={e => setFlag(e.target.value)} disabled={!isFieldEditable('flag')} />
              </div>
              <div>
                <label className="form-label" htmlFor="shipType">Ship Type</label>
                <input id="shipType" type="text" className="form-input" value={shipType} onChange={e => setShipType(e.target.value)} placeholder="e.g. Container Ship" disabled={!isFieldEditable('shipType')} />
              </div>
              <div>
                <label className="form-label" htmlFor="shipBuilder">Ship Builder *</label>
                <input id="shipBuilder" type="text" className="form-input" value={shipBuilder} onChange={e => setShipBuilder(e.target.value)} required disabled={!isFieldEditable('shipBuilder')} />
              </div>
              <div>
                <label className="form-label" htmlFor="engineBuilder">Engine Builder *</label>
                <input id="engineBuilder" type="text" className="form-input" value={engineBuilder} onChange={e => setEngineBuilder(e.target.value)} required disabled={!isFieldEditable('engineBuilder')} />
              </div>
              <div>
                <label className="form-label" htmlFor="duallyClassWith">Dually Class With</label>
                <input id="duallyClassWith" type="text" className="form-input" value={duallyClassWith} onChange={e => setDuallyClassWith(e.target.value)} disabled={!isFieldEditable('duallyClassWith')} />
              </div>
              <div>
                <label className="form-label" htmlFor="dwt">Deadweight (DWT)</label>
                <input id="dwt" type="number" className="form-input" value={dwt} onChange={e => setDwt(e.target.value !== '' ? Number(e.target.value) : '')} disabled={!isFieldEditable('dwt')} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label" htmlFor="keelDate">Keel Date</label>
                <input id="keelDate" type="date" className="form-input" value={keelDate} onChange={e => setKeelDate(e.target.value)} disabled={!isFieldEditable('keelDate')} />
              </div>
            </div>
          </div>

          {/* Right Column Pane */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              Booking & Specs (Right Pane)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
              <div>
                <label className="form-label" htmlFor="uqmsNo">UQMS Number</label>
                <input id="uqmsNo" type="text" className="form-input" value={uqmsNo} onChange={e => setUqmsNo(e.target.value)} placeholder="UQMS number" disabled={!isFieldEditable('uqmsNo')} />
              </div>
              <div>
                <label className="form-label" htmlFor="requestedDate">Requested Date *</label>
                <input id="requestedDate" type="date" className="form-input" value={requestedDate} onChange={e => setRequestedDate(e.target.value)} required disabled={!isFieldEditable('requestedDate')} />
              </div>
              <div>
                <label className="form-label" htmlFor="surveyMode">Survey Mode</label>
                <select id="surveyMode" className="form-input" value={surveyMode} onChange={e => setSurveyMode(e.target.value)} disabled={!isFieldEditable('surveyMode')}>
                  <option value="Singly">Singly</option>
                  <option value="Dually">Dually</option>
                  <option value="Interim">Interim</option>
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="society">Society</label>
                <input id="society" type="text" className="form-input" value={society} onChange={e => setSociety(e.target.value)} placeholder="e.g. Lloyds" disabled={!isFieldEditable('society')} />
              </div>
              <div>
                <label className="form-label" htmlFor="managedBy">Managed By</label>
                <input id="managedBy" type="text" className="form-input" value={managedBy} onChange={e => setManagedBy(e.target.value)} disabled={!isFieldEditable('managedBy')} />
              </div>
              <div>
                <label className="form-label" htmlFor="buildDate">Build Date</label>
                <input id="buildDate" type="date" className="form-input" value={buildDate} onChange={e => setBuildDate(e.target.value)} disabled={!isFieldEditable('buildDate')} />
              </div>
              <div>
                <label className="form-label" htmlFor="yardNo">Yard No.</label>
                <input id="yardNo" type="text" className="form-input" value={yardNo} onChange={e => setYardNo(e.target.value)} disabled={!isFieldEditable('yardNo')} />
              </div>
              <div>
                <label className="form-label" htmlFor="officialNo">Official No.</label>
                <input id="officialNo" type="text" className="form-input" value={officialNo} onChange={e => setOfficialNo(e.target.value)} disabled={!isFieldEditable('officialNo')} />
              </div>
              <div>
                <label className="form-label" htmlFor="gt">Gross Tonnage (GT)</label>
                <input id="gt" type="number" className="form-input" value={gt} onChange={e => setGt(e.target.value !== '' ? Number(e.target.value) : '')} disabled={!isFieldEditable('gt')} />
              </div>
              <div>
                <label className="form-label" htmlFor="callSign">Call Sign</label>
                <input id="callSign" type="text" className="form-input" value={callSign} onChange={e => setCallSign(e.target.value)} disabled={!isFieldEditable('callSign')} />
              </div>
            </div>
          </div>
        </div>

        {/* Surveys Requested Checklist */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ marginBottom: '14px' }}>Surveys Requested</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {surveyTypes.map(st => {
              const isSelected = surveysRequested.includes(st.code);
              const isEditable = isFieldEditable('surveysRequested');
              return (
                <button
                  type="button"
                  key={st._id}
                  onClick={() => handleSurveyRequestedToggle(st.code)}
                  disabled={!isEditable}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '30px',
                    border: '1px solid var(--border)',
                    background: isSelected ? 'var(--primary)' : 'var(--bg-subtle)',
                    color: isSelected ? '#ffffff' : 'var(--label)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isEditable ? 'pointer' : 'default',
                    opacity: isEditable ? 1 : 0.7,
                    transition: 'all 0.15s ease-in-out'
                  }}
                >
                  {st.name} ({st.code})
                </button>
              );
            })}
            {surveyTypes.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No Survey Types configured in system.</p>
            )}
          </div>
        </div>

        {/* Visit Details Grid (Fully Editable) */}
        <div className="card" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="card-header" style={{ margin: 0 }}>Visit Details Grid (Editable Section)</div>
            <button
              type="button"
              className="btn-secondary"
              onClick={addVisitRow}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 14px', borderRadius: '8px', marginBottom: 0 }}
            >
              + Add Visit Row
            </button>
          </div>

          {visitDetails.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', background: 'var(--bg-subtle)', border: '1px dashed var(--border)', borderRadius: '10px', color: 'var(--muted)', fontSize: '13px' }}>
              No visits planned or added yet. Click "+ Add Visit Row" to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {visitDetails.map((visit, visitIdx) => (
                <div
                  key={visitIdx}
                  className="animate-in"
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    background: 'var(--bg-subtle)',
                    padding: '16px',
                    position: 'relative'
                  }}
                >
                  {/* Remove Visit Button */}
                  <button
                    type="button"
                    onClick={() => removeVisitRow(visitIdx)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--red)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Remove Visit
                  </button>

                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--label)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary)', color: '#ffffff', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                      {visitIdx + 1}
                    </span>
                    {visit.visitNo || `Visit ${visitIdx + 1}`}
                  </h4>

                  {/* Visit Basic Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Visit No</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                        value={visit.visitNo || ''}
                        onChange={e => updateVisitField(visitIdx, 'visitNo', e.target.value)}
                        placeholder="e.g. Visit 1"
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Visit Date *</label>
                      <input
                        type="date"
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                        value={visit.visitDate}
                        onChange={e => updateVisitField(visitIdx, 'visitDate', e.target.value)}
                        required
                        min={requestedDate}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Start Survey Time</label>
                      <input
                        type="time"
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                        value={visit.startSurvey || ''}
                        onChange={e => updateVisitField(visitIdx, 'startSurvey', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>End Survey Time</label>
                      <input
                        type="time"
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                        value={visit.endSurvey || ''}
                        onChange={e => updateVisitField(visitIdx, 'endSurvey', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Location</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                        value={visit.location || ''}
                        onChange={e => updateVisitField(visitIdx, 'location', e.target.value)}
                        placeholder="e.g. Anchorage"
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Status</label>
                      <select
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                        value={visit.status || 'scheduled'}
                        onChange={e => updateVisitField(visitIdx, 'status', e.target.value)}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingLeft: '4px', alignSelf: 'end', marginBottom: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
                        <input
                          type="checkbox"
                          checked={!!visit.isLastVisitDate || !!visit.isLastVist}
                          onChange={e => handleLastVisitToggle(visitIdx, e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                        Is Last Visit?
                      </label>
                    </div>
                  </div>

                  {/* Surveyor Assignments Nested Box */}
                  <div style={{ background: 'var(--surface)', borderRadius: '8px', padding: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h5 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', margin: 0 }}>Surveyor Assignments & Special Fees</h5>
                      <button
                        type="button"
                        onClick={() => addSurveyorAssignment(visitIdx)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        + Add Surveyor Assignment
                      </button>
                    </div>

                    {visit.surveyorAssignments.length === 0 ? (
                      <p style={{ color: 'var(--muted)', fontSize: '11px', textAlign: 'center', margin: '8px 0' }}>No surveyors assigned to this visit yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {visit.surveyorAssignments.map((assignment, assignIdx) => (
                          <div
                            key={assignIdx}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 1fr 1fr auto',
                              gap: '12px',
                              alignItems: 'end',
                              background: 'var(--bg-subtle)',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)'
                            }}
                          >
                            {/* Primary Surveyor Select */}
                            <div>
                              <label style={{ fontSize: '10px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Surveyor</label>
                              <select
                                className="form-input"
                                style={{ padding: '4px 6px', fontSize: '12px', height: '30px' }}
                                value={typeof assignment.surveyorId === 'object' ? (assignment.surveyorId as any)?._id || '' : assignment.surveyorId || ''}
                                onChange={e => updateSurveyorAssignmentField(visitIdx, assignIdx, 'surveyorId', e.target.value)}
                              >
                                <option value="">-- Choose Surveyor --</option>
                                {users.map(u => (
                                  <option key={u._id} value={u._id}>{u.username} ({u.email})</option>
                                ))}
                              </select>
                            </div>

                            {/* Currency */}
                            <div>
                              <label style={{ fontSize: '10px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Currency</label>
                              <input
                                type="text"
                                className="form-input"
                                style={{ padding: '4px 6px', fontSize: '12px', height: '30px' }}
                                value={assignment.currency || 'USD'}
                                onChange={e => updateSurveyorAssignmentField(visitIdx, assignIdx, 'currency', e.target.value)}
                                placeholder="USD"
                              />
                            </div>

                            {/* Special Attendance Fees */}
                            <div>
                              <label style={{ fontSize: '10px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Special Attendance Fee</label>
                              <input
                                type="number"
                                className="form-input"
                                style={{ padding: '4px 6px', fontSize: '12px', height: '30px' }}
                                value={assignment.specialAttendanceFees === undefined ? '' : assignment.specialAttendanceFees}
                                onChange={e => updateSurveyorAssignmentField(visitIdx, assignIdx, 'specialAttendanceFees', e.target.value !== '' ? Number(e.target.value) : '')}
                                placeholder="0.00"
                              />
                            </div>

                            {/* Remove assignment button */}
                            <button
                              type="button"
                              onClick={() => removeSurveyorAssignment(visitIdx, assignIdx)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--red)',
                                fontSize: '16px',
                                cursor: 'pointer',
                                height: '30px',
                                padding: '0 4px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buttons Row */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '40px' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ minWidth: '180px', marginBottom: 0 }}
          >
            {loading ? 'Saving...' : 'Save Survey Booking'}
          </button>
          <Link to={`/${activeModule}/marine`} style={{ textDecoration: 'none' }}>
            <button type="button" className="btn-secondary" style={{ minWidth: '180px', marginBottom: 0 }}>
              Cancel
            </button>
          </Link>
        </div>
      </form>
    </div>
  );
}
