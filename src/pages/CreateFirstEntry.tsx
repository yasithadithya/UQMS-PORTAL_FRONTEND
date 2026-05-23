import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  requestsService,
  vesselsService,
  operationsService,
  firstEntryService
} from '@/api';
import type {
  ApiRequest,
  ApiVessel,
  ApiVesselType,
  ApiAreaOfOperation,
  ApiScheduleIIDocument
} from '@/api';

export default function CreateFirstEntry() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>(); // FirstEntry ID if editing
  const isEdit = !!id;

  // Metadata Dropdowns
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [vesselTypes, setVesselTypes] = useState<ApiVesselType[]>([]);
  const [areaOperations, setAreaOperations] = useState<ApiAreaOfOperation[]>([]);
  const [allVessels, setAllVessels] = useState<ApiVessel[]>([]);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  // Form Fields
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [uqmsNumber, setUqmsNumber] = useState('');
  const [vesselName, setVesselName] = useState('');
  const [imoNumber, setImoNumber] = useState('');
  const [vesselType, setVesselType] = useState('');
  const [areaOfOperation, setAreaOfOperation] = useState('');
  const [description, setDescription] = useState('');
  const [callSign, setCallSign] = useState('');
  const [flag, setFlag] = useState('');
  const [portOfRegistry, setPortOfRegistry] = useState('');
  const [dateOfRegistry, setDateOfRegistry] = useState('');

  // Classification
  const [classNotationHull, setClassNotationHull] = useState('');
  const [classNotationMachinery, setClassNotationMachinery] = useState('');

  // Tonnages
  const [grossTonnage, setGrossTonnage] = useState<number | ''>('');
  const [netTonnage, setNetTonnage] = useState<number | ''>('');
  const [deadweight, setDeadweight] = useState<number | ''>('');
  const [lightship, setLightship] = useState<number | ''>('');

  // Dimensions
  const [overallLength, setOverallLength] = useState<number | ''>('');
  const [lbp, setLbp] = useState<number | ''>('');
  const [length, setLength] = useState<number | ''>('');
  const [breadth, setBreadth] = useState<number | ''>('');
  const [draught, setDraught] = useState<number | ''>('');
  const [depth, setDepth] = useState<number | ''>('');
  const [freeboard, setFreeboard] = useState<number | ''>('');
  const [ballastWtrCapacity, setBallastWtrCapacity] = useState<number | ''>('');

  // Machinery & Build
  const [material, setMaterial] = useState('');
  const [builder, setBuilder] = useState('');
  const [placeOfBuilt, setPlaceOfBuilt] = useState('');
  const [yardNo, setYardNo] = useState('');
  const [dateOfBuild, setDateOfBuild] = useState('');
  const [keelDate, setKeelDate] = useState('');
  const [buildingContractDate, setBuildingContractDate] = useState('');
  const [majorConversionDate, setMajorConversionDate] = useState('');

  // Engine
  const [mainEngineModel, setMainEngineModel] = useState('');
  const [noOfEngines, setNoOfEngines] = useState<number | ''>('');
  const [totalPower, setTotalPower] = useState<number | ''>('');
  const [stroke, setStroke] = useState('');
  const [engineBuilder, setEngineBuilder] = useState('');
  const [engineBuilt, setEngineBuilt] = useState('');
  const [propeller, setPropeller] = useState('');
  const [speed, setSpeed] = useState<number | ''>('');
  const [rpm, setRpm] = useState<number | ''>('');
  const [electricalInstallation, setElectricalInstallation] = useState('');
  const [boilers, setBoilers] = useState('');

  // Owners & Registry
  const [registeredOwnerName, setRegisteredOwnerName] = useState('');
  const [registeredOwnerAddress, setRegisteredOwnerAddress] = useState('');
  const [invoicingName, setInvoicingName] = useState('');
  const [invoicingAddress, setInvoicingAddress] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerAddress, setManagerAddress] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [status, setStatus] = useState('active');

  // Sister Ships
  const [selectedSisterShipIds, setSelectedSisterShipIds] = useState<string[]>([]);

  // First Entry fields
  const [isQuoted, setIsQuoted] = useState(false);
  const [quotationNumber, setQuotationNumber] = useState('');
  const [quotationComments, setQuotationComments] = useState('');

  // Schedule II Uploads
  const [attachedDocuments, setAttachedDocuments] = useState<ApiScheduleIIDocument[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Warning Modal State
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [existingVesselId, setExistingVesselId] = useState<string | null>(null);
  const [existingScheduleIIId, setExistingScheduleIIId] = useState<string | null>(null);

  // Fetch Lookups and Edit Details
  useEffect(() => {
    const loadData = async () => {
      try {
        const [reqsRes, vTypesRes, areasRes, vesselsRes] = await Promise.all([
          requestsService.getRequests(),
          operationsService.getVesselTypes(),
          operationsService.getAreaOperations(),
          vesselsService.getVessels(),
        ]);

        if (reqsRes.success) setRequests(reqsRes.data);
        if (vTypesRes.success) setVesselTypes(vTypesRes.data);
        if (areasRes.success) setAreaOperations(areasRes.data);
        if (vesselsRes.success) setAllVessels(vesselsRes.data);

        if (isEdit && id) {
          const entryRes = await firstEntryService.getFirstEntryById(id);
          if (entryRes.success) {
            const entry = entryRes.data;
            setSelectedRequestId(typeof entry.request === 'object' ? entry.request._id : entry.request);
            setIsQuoted(entry.isQuoted);
            setQuotationNumber(entry.quotationNumber || '');
            setQuotationComments(entry.quotationComments || '');

            if (entry.scheduleII && typeof entry.scheduleII === 'object') {
              setExistingScheduleIIId(entry.scheduleII._id);
              setAttachedDocuments(entry.scheduleII.documents || []);
            } else if (typeof entry.scheduleII === 'string') {
              setExistingScheduleIIId(entry.scheduleII);
              // Fetch schedule directly
              const sched = await firstEntryService.getScheduleIIById(entry.scheduleII);
              if (sched.success) {
                setAttachedDocuments(sched.data.documents || []);
              }
            }

            if (entry.vessel && typeof entry.vessel === 'object') {
              populateVesselForm(entry.vessel);
            } else if (typeof entry.vessel === 'string') {
              const v = await vesselsService.getVesselById(entry.vessel);
              if (v.success) {
                populateVesselForm(v.data);
              }
            }
          }
        }
      } catch (err: any) {
        alert('Error loading page lookup options: ' + err.message);
      } finally {
        setInitialLoading(false);
      }
    };

    loadData();
  }, [isEdit, id]);

  const populateVesselForm = (vessel: ApiVessel) => {
    setExistingVesselId(vessel._id);
    setUqmsNumber(vessel.uqmsNumber || '');
    setVesselName(vessel.vesselName);
    setImoNumber(vessel.imoNumber || '');
    setVesselType(typeof vessel.vesselType === 'object' ? vessel.vesselType?._id || '' : vessel.vesselType || '');
    setAreaOfOperation(typeof vessel.areaOfOperation === 'object' ? vessel.areaOfOperation?._id || '' : vessel.areaOfOperation || '');
    setDescription(vessel.description || '');
    setCallSign(vessel.callSign || '');
    setFlag(vessel.flag || '');
    setPortOfRegistry(vessel.portOfRegistry || '');
    setDateOfRegistry(vessel.dateOfRegistry ? vessel.dateOfRegistry.split('T')[0] : '');
    setClassNotationHull(vessel.classNotationHull || '');
    setClassNotationMachinery(vessel.classNotationMachinery || '');
    setGrossTonnage(vessel.grossTonnage || '');
    setNetTonnage(vessel.netTonnage || '');
    setDeadweight(vessel.deadweight || '');
    setLightship(vessel.lightship || '');
    setOverallLength(vessel.overallLength || '');
    setLbp(vessel.lbp || '');
    setLength(vessel.length || '');
    setBreadth(vessel.breadth || '');
    setDraught(vessel.draught || '');
    setDepth(vessel.depth || '');
    setFreeboard(vessel.freeboard || '');
    setBallastWtrCapacity(vessel.ballastWtrCapacity || '');
    setMaterial(vessel.material || '');
    setBuilder(vessel.builder || '');
    setPlaceOfBuilt(vessel.placeOfBuilt || '');
    setYardNo(vessel.yardNo || '');
    setDateOfBuild(vessel.dateOfBuild ? vessel.dateOfBuild.split('T')[0] : '');
    setKeelDate(vessel.keelDate ? vessel.keelDate.split('T')[0] : '');
    setBuildingContractDate(vessel.buildingContractDate ? vessel.buildingContractDate.split('T')[0] : '');
    setMajorConversionDate(vessel.majorConversionDate ? vessel.majorConversionDate.split('T')[0] : '');
    setMainEngineModel(vessel.mainEngineModel || '');
    setNoOfEngines(vessel.noOfEngines || '');
    setTotalPower(vessel.totalPower || '');
    setStroke(vessel.stroke || '');
    setEngineBuilder(vessel.engineBuilder || '');
    setEngineBuilt(vessel.engineBuilt || '');
    setPropeller(vessel.propeller || '');
    setSpeed(vessel.speed || '');
    setRpm(vessel.rpm || '');
    setElectricalInstallation(vessel.electricalInstallation || '');
    setBoilers(vessel.boilers || '');
    setRegisteredOwnerName(vessel.registeredOwnerName || '');
    setRegisteredOwnerAddress(vessel.registeredOwnerAddress || '');
    setInvoicingName(vessel.invoicingName || '');
    setInvoicingAddress(vessel.invoicingAddress || '');
    setManagerName(vessel.managerName || '');
    setManagerAddress(vessel.managerAddress || '');
    setCompanyId(vessel.companyId || '');
    setStatus(vessel.status || 'active');
    setSelectedSisterShipIds((vessel.sisterShips || []).map(s => typeof s === 'object' ? s._id : s));
  };

  // Document Uploading
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const res = await firstEntryService.uploadScheduleIIDocument(file);
      if (res.success) {
        const doc: ApiScheduleIIDocument = {
          name: file.name,
          key: res.data.key,
          url: res.data.url,
          contentType: res.data.contentType,
          size: res.data.size,
        };
        setAttachedDocuments(prev => [...prev, doc]);
      }
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploadingFile(false);
      e.target.value = ''; // Reset input
    }
  };

  const removeDocument = (index: number) => {
    setAttachedDocuments(prev => prev.filter((_, i) => i !== index));
  };

  // Submit / Save Logic
  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRequestId) {
      toast.error('Please associate this First Entry with a Request.');
      return;
    }

    if (!vesselName.trim()) {
      toast.error('Vessel Name is required.');
      return;
    }

    if (!portOfRegistry.trim()) {
      toast.error('Port of Registry is required.');
      return;
    }

    if (!flag.trim()) {
      toast.error('Flag is required.');
      return;
    }

    if (grossTonnage === '' || grossTonnage === undefined || grossTonnage === null) {
      toast.error('Gross Tonnage is required.');
      return;
    }

    if (overallLength === '' || overallLength === undefined || overallLength === null) {
      toast.error('Overall Length is required.');
      return;
    }

    // Check soft-validation conditions
    const isQuotationCompleted = isQuoted
      ? quotationNumber.trim().length > 0
      : quotationComments.trim().length > 0;

    const isScheduleIIAttached = attachedDocuments.length > 0;

    if (!isQuotationCompleted || !isScheduleIIAttached) {
      // Trigger warning dialog
      setShowWarningModal(true);
    } else {
      // Direct save
      performSave();
    }
  };

  const performSave = async () => {
    try {
      setLoading(true);
      setShowWarningModal(false);

      const vesselPayload: Partial<ApiVessel> = {
        vesselName,
        imoNumber: imoNumber.trim() || undefined,
        vesselType: vesselType || undefined,
        areaOfOperation: areaOfOperation || undefined,
        description: description.trim() || undefined,
        callSign: callSign.trim() || undefined,
        flag: flag.trim() || undefined,
        portOfRegistry: portOfRegistry.trim() || undefined,
        dateOfRegistry: dateOfRegistry || undefined,
        classNotationHull: classNotationHull.trim() || undefined,
        classNotationMachinery: classNotationMachinery.trim() || undefined,
        grossTonnage: grossTonnage !== '' ? Number(grossTonnage) : undefined,
        netTonnage: netTonnage !== '' ? Number(netTonnage) : undefined,
        deadweight: deadweight !== '' ? Number(deadweight) : undefined,
        lightship: lightship !== '' ? Number(lightship) : undefined,
        overallLength: overallLength !== '' ? Number(overallLength) : undefined,
        lbp: lbp !== '' ? Number(lbp) : undefined,
        length: length !== '' ? Number(length) : undefined,
        breadth: breadth !== '' ? Number(breadth) : undefined,
        draught: draught !== '' ? Number(draught) : undefined,
        depth: depth !== '' ? Number(depth) : undefined,
        freeboard: freeboard !== '' ? Number(freeboard) : undefined,
        ballastWtrCapacity: ballastWtrCapacity !== '' ? Number(ballastWtrCapacity) : undefined,
        material: material.trim() || undefined,
        builder: builder.trim() || undefined,
        placeOfBuilt: placeOfBuilt.trim() || undefined,
        yardNo: yardNo.trim() || undefined,
        dateOfBuild: dateOfBuild || undefined,
        keelDate: keelDate || undefined,
        buildingContractDate: buildingContractDate || undefined,
        majorConversionDate: majorConversionDate || undefined,
        mainEngineModel: mainEngineModel.trim() || undefined,
        noOfEngines: noOfEngines !== '' ? Number(noOfEngines) : undefined,
        totalPower: totalPower !== '' ? Number(totalPower) : undefined,
        stroke: stroke.trim() || undefined,
        engineBuilder: engineBuilder.trim() || undefined,
        engineBuilt: engineBuilt.trim() || undefined,
        propeller: propeller.trim() || undefined,
        speed: speed !== '' ? Number(speed) : undefined,
        rpm: rpm !== '' ? Number(rpm) : undefined,
        electricalInstallation: electricalInstallation.trim() || undefined,
        boilers: boilers.trim() || undefined,
        registeredOwnerName: registeredOwnerName.trim() || undefined,
        registeredOwnerAddress: registeredOwnerAddress.trim() || undefined,
        invoicingName: invoicingName.trim() || undefined,
        invoicingAddress: invoicingAddress.trim() || undefined,
        managerName: managerName.trim() || undefined,
        managerAddress: managerAddress.trim() || undefined,
        companyId: companyId.trim() || undefined,
        status: status || 'active',
        sisterShips: selectedSisterShipIds,
      };

      let finalVesselId = existingVesselId;

      if (isEdit && existingVesselId) {
        await vesselsService.updateVessel(existingVesselId, vesselPayload);
      } else {
        const vRes = await vesselsService.createVessel(vesselPayload);
        if (!vRes.success) throw new Error(vRes.message);
        finalVesselId = vRes.data._id;
      }

      if (!finalVesselId) throw new Error('Vessel could not be verified.');

      // Save/Update FirstEntry
      let finalFirstEntryId = id;
      const firstEntryPayload = {
        request: selectedRequestId,
        vessel: finalVesselId,
        isQuoted,
        quotationNumber: isQuoted ? quotationNumber.trim() : undefined,
        quotationComments: !isQuoted ? quotationComments.trim() : undefined,
      };

      if (isEdit && id) {
        await firstEntryService.updateFirstEntry(id, firstEntryPayload);
      } else {
        const feRes = await firstEntryService.createFirstEntry(firstEntryPayload);
        if (!feRes.success) throw new Error(feRes.message);
        finalFirstEntryId = feRes.data._id;
      }

      if (!finalFirstEntryId) throw new Error('First Entry could not be verified.');

      // Save/Update Schedule II documents
      if (attachedDocuments.length > 0) {
        if (existingScheduleIIId) {
          await firstEntryService.updateScheduleII(existingScheduleIIId, {
            status: 'attached',
            documents: attachedDocuments,
          });
        } else {
          await firstEntryService.createScheduleII({
            firstEntryId: finalFirstEntryId,
            status: 'attached',
            documents: attachedDocuments,
          });
        }
      } else {
        // If Schedule II is cleared
        if (existingScheduleIIId) {
          await firstEntryService.deleteScheduleII(existingScheduleIIId);
        }
      }

      toast.success(isEdit ? 'First Entry updated successfully!' : 'First Entry created successfully!');
      navigate('/reporting/marine');
    } catch (err: any) {
      toast.error('Failed to save entries: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <p>Loading workflow details...</p>
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ padding: '4px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Link to="/reporting/marine" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: 'var(--surface)', color: 'var(--label)', border: '1px solid var(--border)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </Link>
        <div>
          <h1 className="section-header" style={{ margin: 0 }}>
            {isEdit ? 'Edit First Entry' : 'Create First Entry'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500, marginTop: '2px' }}>
            Enter vessel specifications, quotation status, and attach Schedule II documents.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveClick}>
        {/* SECTION 1: Request Association */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>1. Request Association</span>
            {/* {uqmsNumber && (
              <span style={{ 
                fontSize: '11px', 
                background: 'var(--green-subtle)', 
                color: 'var(--green)', 
                padding: '4px 10px', 
                borderRadius: '20px', 
                fontWeight: 600, 
                border: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                Request Locked
              </span>
            )} */}
          </div>
          <div style={{ maxWidth: '520px' }}>
            <label className="form-label" htmlFor="requestId">Select Request *</label>
            <select
              id="requestId"
              className="form-input"
              value={selectedRequestId}
              onChange={e => {
                const val = e.target.value;
                setSelectedRequestId(val);
                setUqmsNumber('');

                // Auto-populate vessel fields from selected Request
                if (val) {
                  const reqObj = requests.find(r => r._id === val);
                  if (reqObj) {
                    if (reqObj.vesselName) setVesselName(reqObj.vesselName);
                    if (reqObj.imoNumber) setImoNumber(reqObj.imoNumber);

                    if (reqObj.vesselType) {
                      const vtId = typeof reqObj.vesselType === 'object' ? reqObj.vesselType._id : reqObj.vesselType;
                      setVesselType(vtId || '');
                    }

                    if (reqObj.areaOfOperation) {
                      const aoId = typeof reqObj.areaOfOperation === 'object' ? reqObj.areaOfOperation._id : reqObj.areaOfOperation;
                      setAreaOfOperation(aoId || '');
                    }

                    if (reqObj.companyName) {
                      setRegisteredOwnerName(reqObj.companyName);
                      setInvoicingName(reqObj.companyName);
                    }

                    if (reqObj.registerdAddress) {
                      setRegisteredOwnerAddress(reqObj.registerdAddress);
                    }

                    if (reqObj.invoicingAddress) {
                      setInvoicingAddress(reqObj.invoicingAddress);
                    }
                  }
                }
              }}
              required
              disabled={!!uqmsNumber}
              style={{ width: '100%', WebkitAppearance: 'none', background: 'var(--bg-subtle)', cursor: 'pointer' }}
            >
              <option value="">-- Choose an Approved Request --</option>
              {requests
                .filter(r => r.status === 'print' || r._id === selectedRequestId)
                .map(r => (
                  <option key={r._id} value={r._id}>
                    {r.requestNumber} - {r.vesselName} ({r.companyName})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* SECTION 2: Vessel Details */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>2. Vessel Specifications</span>
            {uqmsNumber && (
              <span style={{
                fontSize: '11px',
                background: 'var(--green-subtle)',
                color: 'var(--green)',
                padding: '4px 10px',
                borderRadius: '20px',
                fontWeight: 600,
                border: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                UQMS Generated: {uqmsNumber}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px 24px', marginBottom: '20px' }}>
            {/* General Info */}
            <div>
              <label className="form-label" htmlFor="vName">Vessel Name *</label>
              <input
                id="vName"
                type="text"
                className="form-input"
                placeholder="e.g. Queen Elizabeth"
                value={vesselName}
                onChange={e => setVesselName(e.target.value)}
                required
                disabled={!!uqmsNumber}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="imo">IMO Number</label>
              <input
                id="imo"
                type="text"
                className="form-input"
                placeholder="e.g. 9134543"
                value={imoNumber}
                onChange={e => setImoNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="vType">Vessel Type</label>
              <select
                id="vType"
                className="form-input"
                value={vesselType}
                onChange={e => setVesselType(e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              >
                <option value="">-- Select Vessel Type --</option>
                {vesselTypes.map(vt => (
                  <option key={vt._id} value={vt._id}>{vt.name} ({vt.group})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="areaOp">Area of Operations</label>
              <select
                id="areaOp"
                className="form-input"
                value={areaOfOperation}
                onChange={e => setAreaOfOperation(e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              >
                <option value="">-- Select Area --</option>
                {areaOperations.map(ao => (
                  <option key={ao._id} value={ao._id}>{ao.description} ({ao.AreaCategory})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px 24px', marginBottom: '20px' }}>
            <div>
              <label className="form-label" htmlFor="callSign">Call Sign</label>
              <input
                id="callSign"
                type="text"
                className="form-input"
                value={callSign}
                onChange={e => setCallSign(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="flag">Flag *</label>
              <input
                id="flag"
                type="text"
                className="form-input"
                value={flag}
                onChange={e => setFlag(e.target.value)}
                disabled={!!uqmsNumber}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="portReg">Port Of Registry *</label>
              <input
                id="portReg"
                type="text"
                className="form-input"
                value={portOfRegistry}
                onChange={e => setPortOfRegistry(e.target.value)}
                disabled={!!uqmsNumber}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="dateReg">Date Of Registry</label>
              <input
                id="dateReg"
                type="date"
                className="form-input"
                value={dateOfRegistry}
                onChange={e => setDateOfRegistry(e.target.value)}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--separator)', margin: '20px 0' }} />
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '14px' }}>Tonnages & Dimensions</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px 20px', marginBottom: '20px' }}>
            <div>
              <label className="form-label" htmlFor="grossTon">Gross Tonnage *</label>
              <input
                id="grossTon"
                type="number"
                className="form-input"
                value={grossTonnage}
                onChange={e => setGrossTonnage(e.target.value !== '' ? Number(e.target.value) : '')}
                disabled={!!uqmsNumber}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="netTon">Net Tonnage</label>
              <input
                id="netTon"
                type="number"
                className="form-input"
                value={netTonnage}
                onChange={e => setNetTonnage(e.target.value !== '' ? Number(e.target.value) : '')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="deadweight">Deadweight (DWT)</label>
              <input
                id="deadweight"
                type="number"
                className="form-input"
                value={deadweight}
                onChange={e => setDeadweight(e.target.value !== '' ? Number(e.target.value) : '')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="lightship">Lightship</label>
              <input
                id="lightship"
                type="number"
                className="form-input"
                value={lightship}
                onChange={e => setLightship(e.target.value !== '' ? Number(e.target.value) : '')}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px 20px', marginBottom: '20px' }}>
            <div>
              <label className="form-label" htmlFor="oLength">Overall Length (LOA) *</label>
              <input
                id="oLength"
                type="number"
                className="form-input"
                value={overallLength}
                onChange={e => setOverallLength(e.target.value !== '' ? Number(e.target.value) : '')}
                disabled={!!uqmsNumber}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="lbp">LBP</label>
              <input
                id="lbp"
                type="number"
                className="form-input"
                value={lbp}
                onChange={e => setLbp(e.target.value !== '' ? Number(e.target.value) : '')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="length">Length</label>
              <input
                id="length"
                type="number"
                className="form-input"
                value={length}
                onChange={e => setLength(e.target.value !== '' ? Number(e.target.value) : '')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="breadth">Breadth</label>
              <input
                id="breadth"
                type="number"
                className="form-input"
                value={breadth}
                onChange={e => setBreadth(e.target.value !== '' ? Number(e.target.value) : '')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="draught">Draught</label>
              <input
                id="draught"
                type="number"
                className="form-input"
                value={draught}
                onChange={e => setDraught(e.target.value !== '' ? Number(e.target.value) : '')}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px 20px', marginBottom: '20px' }}>
            <div>
              <label className="form-label" htmlFor="depth">Depth</label>
              <input
                id="depth"
                type="number"
                className="form-input"
                value={depth}
                onChange={e => setDepth(e.target.value !== '' ? Number(e.target.value) : '')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="freeboard">Freeboard</label>
              <input
                id="freeboard"
                type="number"
                className="form-input"
                value={freeboard}
                onChange={e => setFreeboard(e.target.value !== '' ? Number(e.target.value) : '')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="ballast">Ballast Wtr Capacity</label>
              <input
                id="ballast"
                type="number"
                className="form-input"
                value={ballastWtrCapacity}
                onChange={e => setBallastWtrCapacity(e.target.value !== '' ? Number(e.target.value) : '')}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--separator)', margin: '20px 0' }} />
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '14px' }}>Machinery & Engine Specs</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px 20px', marginBottom: '20px' }}>
            <div>
              <label className="form-label" htmlFor="engModel">Main Engine Model</label>
              <input
                id="engModel"
                type="text"
                className="form-input"
                value={mainEngineModel}
                onChange={e => setMainEngineModel(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="numEng">No Of Engines</label>
              <input
                id="numEng"
                type="number"
                className="form-input"
                value={noOfEngines}
                onChange={e => setNoOfEngines(e.target.value !== '' ? Number(e.target.value) : '')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="power">Total Power (kW)</label>
              <input
                id="power"
                type="number"
                className="form-input"
                value={totalPower}
                onChange={e => setTotalPower(e.target.value !== '' ? Number(e.target.value) : '')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="speed">Speed (knots)</label>
              <input
                id="speed"
                type="number"
                className="form-input"
                value={speed}
                onChange={e => setSpeed(e.target.value !== '' ? Number(e.target.value) : '')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="rpm">RPM</label>
              <input
                id="rpm"
                type="number"
                className="form-input"
                value={rpm}
                onChange={e => setRpm(e.target.value !== '' ? Number(e.target.value) : '')}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px 20px', marginBottom: '20px' }}>
            <div>
              <label className="form-label" htmlFor="classHull">Class Notation Hull</label>
              <input
                id="classHull"
                type="text"
                className="form-input"
                value={classNotationHull}
                onChange={e => setClassNotationHull(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="classMach">Class Notation Machinery</label>
              <input
                id="classMach"
                type="text"
                className="form-input"
                value={classNotationMachinery}
                onChange={e => setClassNotationMachinery(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="elect">Electrical Inst.</label>
              <input
                id="elect"
                type="text"
                className="form-input"
                value={electricalInstallation}
                onChange={e => setElectricalInstallation(e.target.value)}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--separator)', margin: '20px 0' }} />
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '14px' }}>Registry & Owners</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px 24px', marginBottom: '20px' }}>
            <div>
              <label className="form-label" htmlFor="regOwner">Registered Owner Name</label>
              <input
                id="regOwner"
                type="text"
                className="form-input"
                value={registeredOwnerName}
                onChange={e => setRegisteredOwnerName(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="ownerAdd">Owner Address</label>
              <input
                id="ownerAdd"
                type="text"
                className="form-input"
                value={registeredOwnerAddress}
                onChange={e => setRegisteredOwnerAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="invName">Invoicing Name</label>
              <input
                id="invName"
                type="text"
                className="form-input"
                value={invoicingName}
                onChange={e => setInvoicingName(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="invAdd">Invoicing Address</label>
              <input
                id="invAdd"
                type="text"
                className="form-input"
                value={invoicingAddress}
                onChange={e => setInvoicingAddress(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px 24px', marginBottom: '20px' }}>
            <div>
              <label className="form-label" htmlFor="builder">Builder</label>
              <input
                id="builder"
                type="text"
                className="form-input"
                value={builder}
                onChange={e => setBuilder(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="placeBuilt">Place of Built</label>
              <input
                id="placeBuilt"
                type="text"
                className="form-input"
                value={placeOfBuilt}
                onChange={e => setPlaceOfBuilt(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="yardNo">Yard No.</label>
              <input
                id="yardNo"
                type="text"
                className="form-input"
                value={yardNo}
                onChange={e => setYardNo(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="buildDate">Build Date</label>
              <input
                id="buildDate"
                type="date"
                className="form-input"
                value={dateOfBuild}
                onChange={e => setDateOfBuild(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px 24px' }}>
            <div>
              <label className="form-label">Sister Ships</label>
              <select
                multiple
                className="form-input"
                value={selectedSisterShipIds}
                onChange={e => {
                  const opts = Array.from(e.target.selectedOptions, option => option.value);
                  setSelectedSisterShipIds(opts);
                }}
                style={{ width: '100%', height: '110px', padding: '8px', cursor: 'pointer' }}
              >
                {allVessels
                  .filter(v => v._id !== existingVesselId) // Exclude current vessel
                  .map(v => (
                    <option key={v._id} value={v._id}>
                      {v.vesselName} {v.uqmsNumber ? `(${v.uqmsNumber})` : '(Pending)'}
                    </option>
                  ))}
              </select>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                Hold Ctrl (Windows) or Cmd (Mac) to select multiple vessels.
              </p>
            </div>
            <div>
              <label className="form-label" htmlFor="vDesc">Vessel Description</label>
              <textarea
                id="vDesc"
                className="form-input form-textarea"
                placeholder="Details about area Category, historical routes..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ height: '110px' }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Quotation Details */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">3. Quotation Details</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                id="isQuoted"
                checked={isQuoted}
                onChange={e => setIsQuoted(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  accentColor: 'var(--primary)',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              />
              <label htmlFor="isQuoted" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--label)', cursor: 'pointer' }}>
                Is this request quoted?
              </label>
            </div>
          </div>

          <div style={{ maxWidth: '520px' }} className="animate-in">
            {isQuoted ? (
              <div>
                <label className="form-label" htmlFor="qNum">Quotation Number *</label>
                <input
                  id="qNum"
                  type="text"
                  className="form-input"
                  placeholder="e.g. QTE-2026-904"
                  value={quotationNumber}
                  onChange={e => setQuotationNumber(e.target.value)}
                  style={{ animation: 'fadeUp .2s ease' }}
                />
              </div>
            ) : (
              <div>
                <label className="form-label" htmlFor="qComm">Quotation Comment *</label>
                <textarea
                  id="qComm"
                  className="form-input form-textarea"
                  placeholder="Enter comments on why this request is not quoted..."
                  value={quotationComments}
                  onChange={e => setQuotationComments(e.target.value)}
                  style={{ animation: 'fadeUp .2s ease' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: Schedule II Documents */}
        <div className="card" style={{ marginBottom: '32px' }}>
          <div className="card-header">4. Schedule II Attachments</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div>
              <label className="form-label">Upload Schedule II Document</label>
              <div
                className="upload-area"
                onClick={() => document.getElementById('schedII-file')?.click()}
                style={{ pointerEvents: uploadingFile ? 'none' : 'auto', opacity: uploadingFile ? 0.6 : 1 }}
              >
                <div className="upload-icon">📁</div>
                <div className="upload-text">
                  {uploadingFile ? (
                    <span>Uploading document...</span>
                  ) : (
                    <>Drag & Drop or <span>Browse Files</span></>
                  )}
                </div>
                <input
                  type="file"
                  id="schedII-file"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  accept="application/pdf,image/*"
                />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '-8px' }}>
                Only PDFs and images (PNG, JPG, WebP) are allowed. Max 10MB.
              </p>
            </div>

            <div>
              <label className="form-label">Attached Documents ({attachedDocuments.length})</label>
              {attachedDocuments.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: '13px' }}>
                  No Schedule II documents attached yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {attachedDocuments.map((doc, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {doc.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          {(doc.size ? doc.size / 1024 / 1024 : 0).toFixed(2)} MB
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              textDecoration: 'none',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--primary)',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'var(--primary-glow)'
                            }}
                          >
                            View
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => removeDocument(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--red)',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Buttons Row */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '40px' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ minWidth: '180px', marginBottom: 0 }}
          >
            {loading ? 'Saving...' : 'Save First Entry'}
          </button>
          <Link to="/reporting/marine" style={{ textDecoration: 'none' }}>
            <button type="button" className="btn-secondary" style={{ minWidth: '180px', marginBottom: 0 }}>
              Cancel
            </button>
          </Link>
        </div>
      </form>

      {/* WARNING MODAL POPUP FOR PARTIAL SAVE */}
      {showWarningModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card animate-in" style={{
            maxWidth: '500px',
            width: '100%',
            background: 'var(--card)',
            padding: '28px',
            border: '1px solid rgba(245, 158, 11, .2)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-lg)',
            textAlign: 'center'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--orange-subtle)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>
              ⚠️
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--label)', marginBottom: '10px' }}>
              Incomplete Information
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
              Quotation details are incomplete or Schedule II documents are not attached yet.
              <br />
              <br />
              <strong>Would you like to save this vessel anyway?</strong>
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginTop: '8px' }}>
                Note: The UQMS number will only be generated once Schedule II documents are attached and saved.
              </span>
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowWarningModal(false)}
                style={{ minWidth: '120px', padding: '10px 16px', fontSize: '13px', marginBottom: 0 }}
              >
                Go Back
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={performSave}
                style={{ minWidth: '120px', padding: '10px 16px', fontSize: '13px', background: 'var(--orange)', marginBottom: 0 }}
              >
                Save Anyway
              </button>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          `}} />
        </div>
      )}
    </div>
  );
}
