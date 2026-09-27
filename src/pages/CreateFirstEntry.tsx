import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import { toSlug } from '@/utils/modules';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ExternalLink, FileText, Plus, Send, Trash2, X } from 'lucide-react';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { toast } from 'react-toastify';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import DragDropFileUpload from '@/components/DragDropFileUpload';
import {
  Badge, Button, ButtonLink, Checkbox, ConfirmDialog, Field, FormGrid, FormSection, FormWithNav, IconButton, Input, LoadingBlock,
  PageHeader, SectionNav, Select, StickyActionBar, Textarea, buttonClassName,
} from '@/ui';
import s from './CreateFirstEntry.module.css';
import SearchableSelect from '@/components/SearchableSelect';
import { normalizeBuildDateText } from '@/utils/date';
import {
  requestsService,
  vesselsService,
  operationsService,
  firstEntryService,
  vesselCodesService,
  quotationsService
} from '@/api';
import type {
  ApiRequest,
  ApiVessel,
  ApiVesselType,
  ApiAreaOfOperation,
  ApiScheduleIIDocument,
  ApiVesselCode,
  ApiQuotation
} from '@/api';

export default function CreateFirstEntry() {
  const navigate = useNavigate();
  const unsaved = useUnsavedChanges();
  const { id, module } = useParams<{ id?: string; module?: string }>(); // FirstEntry ID if editing
  const activeModule = module || 'reporting';
  const isEdit = !!id;
  const { can, modules } = useAuth();
  const canSave = can(MODULE_KEYS.marineEntries, isEdit ? 'update' : 'create');

  // Metadata Dropdowns
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [vesselTypes, setVesselTypes] = useState<ApiVesselType[]>([]);
  const [areaOperations, setAreaOperations] = useState<ApiAreaOfOperation[]>([]);
  const [allVessels, setAllVessels] = useState<ApiVessel[]>([]);
  const [vesselCodes, setVesselCodes] = useState<ApiVesselCode[]>([]);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  // Form Fields
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [uqmsNumber, setUqmsNumber] = useState('');
  const [vesselName, setVesselName] = useState('');
  const [imoNumber, setImoNumber] = useState('');
  const [mmsiNumber, setMmsiNumber] = useState('');
  const [vesselCode, setVesselCode] = useState('');
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
  const [engines, setEngines] = useState<{ model: string; quantity: number | ''; totalPower: number | ''; speed: number | ''; rpm: number | ''; }[]>([{ model: '', quantity: '', totalPower: '', speed: '', rpm: '' }]);
  const [stroke, setStroke] = useState('');
  const [engineBuilder, setEngineBuilder] = useState('');
  const [engineBuilt, setEngineBuilt] = useState('');
  const [propeller, setPropeller] = useState('');
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
  // Quotations raised for the selected request in the Finance module; an accepted one fills in the quotation fields.
  const [requestQuotations, setRequestQuotations] = useState<ApiQuotation[]>([]);

  // Schedule II Uploads
  const [attachedDocuments, setAttachedDocuments] = useState<ApiScheduleIIDocument[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Warning Modal State
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [existingVesselId, setExistingVesselId] = useState<string | null>(null);
  const [existingScheduleIIId, setExistingScheduleIIId] = useState<string | null>(null);
  // Records created by a save that failed part-way; a retry updates them instead of creating duplicates.
  const [createdVesselId, setCreatedVesselId] = useState<string | null>(null);
  const [createdFirstEntryId, setCreatedFirstEntryId] = useState<string | null>(null);
  const savingRef = useRef(false);
  const [scheduleEmailSent, setScheduleEmailSent] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);

  // Fetch Lookups and Edit Details
  useEffect(() => {
    const loadData = async () => {
      try {
        const [reqsRes, vTypesRes, areasRes, vesselsRes, vCodesRes] = await Promise.all([
          // limit: 'all' bypasses server pagination so the dropdown lists every request, not just page 1
          requestsService.getRequests({ limit: 'all' }),
          operationsService.getVesselTypes(),
          operationsService.getAreaOperations(),
          vesselsService.getVessels(),
          vesselCodesService.getVesselCodes(),
        ]);

        if (reqsRes.success) setRequests(reqsRes.data);
        if (vTypesRes.success) setVesselTypes(vTypesRes.data);
        if (areasRes.success) setAreaOperations(areasRes.data);
        if (vesselsRes.success) setAllVessels(vesselsRes.data);
        if (vCodesRes.success) setVesselCodes(vCodesRes.data);

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
              setScheduleEmailSent(entry.scheduleII.emailSent || false);
            } else if (typeof entry.scheduleII === 'string') {
              setExistingScheduleIIId(entry.scheduleII);
              // Fetch schedule directly
              try {
                const sched = await firstEntryService.getScheduleIIById(entry.scheduleII);
                if (sched.success) {
                  setAttachedDocuments(sched.data.documents || []);
                  setScheduleEmailSent(sched.data.emailSent || false);
                }
              } catch (err) { }
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
        toast.error('Error loading page lookup options: ' + err.message);
      } finally {
        setInitialLoading(false);
      }
    };

    loadData();
  }, [isEdit, id]);

  useEffect(() => {
    if (!selectedRequestId) {
      setRequestQuotations([]);
      return;
    }
    let cancelled = false;
    quotationsService.getByRequest(selectedRequestId)
      .then(res => {
        if (cancelled) return;
        setRequestQuotations(res.data);
        const accepted = res.data.find(q => q.status === 'accepted');
        if (accepted) {
          setIsQuoted(true);
          setQuotationNumber(accepted.quotationNumber);
        }
      })
      // Quotations are optional here: without access or on failure the manual fields still work.
      .catch(() => { if (!cancelled) setRequestQuotations([]); });
    return () => { cancelled = true; };
  }, [selectedRequestId]);

  const acceptedQuotation = requestQuotations.find(q => q.status === 'accepted');
  const latestQuotation = requestQuotations[requestQuotations.length - 1];
  const financeModule = modules.find(m => m.key === MODULE_KEYS.finance);
  const quotationHref = (q: ApiQuotation) =>
    financeModule && can(MODULE_KEYS.financeQuotations) ? `/${toSlug(financeModule.name)}/quotations/${q._id}` : undefined;

  // Only approved requests that have not been converted yet (plus the one already linked)
  const selectableRequests = useMemo(
    () => requests.filter(r => (r.status === 'print' && !r.uqmsNumber) || r._id === selectedRequestId),
    [requests, selectedRequestId]
  );

  const requestOptions = useMemo(
    () => selectableRequests.map(r => ({
      id: r._id,
      label: `${r.requestNumber} - ${r.vesselName} (${r.companyName})`,
    })),
    [selectableRequests]
  );

  const handleRequestChange = (val: string) => {
    setSelectedRequestId(val);
    setUqmsNumber('');

    // Auto-populate vessel fields from selected Request
    if (!val) return;
    const reqObj = requests.find(r => r._id === val);
    if (!reqObj) return;

    if (reqObj.vesselName) setVesselName(reqObj.vesselName);
    if (reqObj.imoNumber) setImoNumber(reqObj.imoNumber);
    if (reqObj.mmsiNumber) setMmsiNumber(reqObj.mmsiNumber);
    if (reqObj.vesselCode) setVesselCode(reqObj.vesselCode);

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
  };

  const populateVesselForm = (vessel: ApiVessel) => {
    setExistingVesselId(vessel._id);
    setUqmsNumber(vessel.uqmsNumber || '');
    setVesselName(vessel.vesselName);
    setImoNumber(vessel.imoNumber || '');
    setMmsiNumber(vessel.mmsiNumber || '');
    setVesselCode(vessel.vesselCode || '');
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
    let db = vessel.dateOfBuild || '';
    if (db.includes('T')) {
      db = db.split('T')[0].split('-').join('/');
    }
    setDateOfBuild(normalizeBuildDateText(db));
    setKeelDate(vessel.keelDate ? vessel.keelDate.split('T')[0] : '');
    setBuildingContractDate(vessel.buildingContractDate ? vessel.buildingContractDate.split('T')[0] : '');
    setMajorConversionDate(vessel.majorConversionDate ? vessel.majorConversionDate.split('T')[0] : '');
    if (vessel.engines && vessel.engines.length > 0) {
      setEngines(vessel.engines.map(e => ({
        model: e.model || '',
        quantity: e.quantity || '',
        totalPower: e.totalPower || '',
        speed: e.speed || '',
        rpm: e.rpm || ''
      })));
    } else {
      setEngines([{
        model: vessel.mainEngineModel || '',
        quantity: vessel.noOfEngines || '',
        totalPower: vessel.totalPower || '',
        speed: vessel.speed || '',
        rpm: vessel.rpm || ''
      }]);
    }
    setStroke(vessel.stroke || '');
    setEngineBuilder(vessel.engineBuilder || '');
    setEngineBuilt(vessel.engineBuilt || '');
    setPropeller(vessel.propeller || '');
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

  const removeDocument = (index: number) => {
    setAttachedDocuments(prev => prev.filter((_, i) => i !== index));
  };

  // Submit / Save Logic
  type FieldKey = 'request' | 'vesselName' | 'vesselCode' | 'flag' | 'portOfRegistry' | 'grossTonnage' | 'overallLength';
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const clearError = (key: FieldKey) => setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const validate = (): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!selectedRequestId) next.request = 'Choose the request this first entry belongs to.';
    if (!vesselName.trim()) next.vesselName = 'Enter the vessel name.';
    if (!vesselCode.trim()) next.vesselCode = 'Choose a vessel code.';
    if (!flag.trim()) next.flag = 'Enter the flag.';
    if (!portOfRegistry.trim()) next.portOfRegistry = 'Enter the port of registry.';
    if (grossTonnage === '' || grossTonnage === undefined || grossTonnage === null) next.grossTonnage = 'Enter the gross tonnage.';
    if (overallLength === '' || overallLength === undefined || overallLength === null) next.overallLength = 'Enter the overall length.';
    return next;
  };

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      toast.error('Some required fields are missing. They are highlighted below.');
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-field-error]');
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (first instanceof HTMLInputElement || first instanceof HTMLSelectElement) first.focus({ preventScroll: true });
      });
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
    // Guard against double-submits (e.g. double-clicking "Save Anyway") creating duplicate records.
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      setLoading(true);
      setShowWarningModal(false);

      const vesselPayload: Partial<ApiVessel> = {
        vesselName,
        imoNumber: imoNumber.trim() || undefined,
        mmsiNumber: mmsiNumber.trim() || undefined,
        vesselCode: vesselCode.trim() || undefined,
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
        engines: engines.map(e => ({
          model: e.model.trim() || undefined,
          quantity: e.quantity !== '' ? Number(e.quantity) : undefined,
          totalPower: e.totalPower !== '' ? Number(e.totalPower) : undefined,
          speed: e.speed !== '' ? Number(e.speed) : undefined,
          rpm: e.rpm !== '' ? Number(e.rpm) : undefined
        })),
        stroke: stroke.trim() || undefined,
        engineBuilder: engineBuilder.trim() || undefined,
        engineBuilt: engineBuilt.trim() || undefined,
        propeller: propeller.trim() || undefined,
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
      } else if (createdVesselId) {
        await vesselsService.updateVessel(createdVesselId, vesselPayload);
        finalVesselId = createdVesselId;
      } else {
        const vRes = await vesselsService.createVessel(vesselPayload);
        if (!vRes.success) throw new Error(vRes.message);
        finalVesselId = vRes.data._id;
        setCreatedVesselId(finalVesselId);
      }

      if (!finalVesselId) throw new Error('Vessel could not be verified.');

      // Save/Update FirstEntry
      let finalFirstEntryId = id || createdFirstEntryId || undefined;
      const firstEntryPayload = {
        request: selectedRequestId,
        vessel: finalVesselId,
        isQuoted,
        quotationNumber: isQuoted ? quotationNumber.trim() : undefined,
        quotationComments: !isQuoted ? quotationComments.trim() : undefined,
      };

      if (finalFirstEntryId) {
        await firstEntryService.updateFirstEntry(finalFirstEntryId, firstEntryPayload);
      } else {
        const feRes = await firstEntryService.createFirstEntry(firstEntryPayload);
        if (!feRes.success) throw new Error(feRes.message);
        finalFirstEntryId = feRes.data._id;
        setCreatedFirstEntryId(finalFirstEntryId);
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
          const schedRes = await firstEntryService.createScheduleII({
            firstEntryId: finalFirstEntryId,
            status: 'attached',
            documents: attachedDocuments,
          });
          if (schedRes.success && schedRes.data?._id) setExistingScheduleIIId(schedRes.data._id);
        }
      } else {
        // If Schedule II is cleared
        if (existingScheduleIIId) {
          await firstEntryService.deleteScheduleII(existingScheduleIIId);
        }
      }

      toast.success(isEdit ? 'First Entry updated successfully!' : 'First Entry created successfully!');
      unsaved.allowNavigation();
      navigate(`/${activeModule}/marine/first-entry?tab=first-entry`);
    } catch (err: any) {
      toast.error('Failed to save entries: ' + err.message);
    } finally {
      savingRef.current = false;
      setLoading(false);
    }
  };

  const handleSendEmailClick = () => {
    if (!existingScheduleIIId) return;
    if (attachedDocuments.length === 0) {
      toast.error('No Schedule II documents to send.');
      return;
    }
    setShowEmailConfirm(true);
  };

  const performSendEmail = async () => {
    setShowEmailConfirm(false);
    setIsSendingEmail(true);
    try {
      const res = await firstEntryService.sendScheduleIIEmail(existingScheduleIIId!);
      if (res.success) {
        toast.success('Email sent successfully!');
        setScheduleEmailSent(true);
      } else {
        toast.error(res.message || 'Failed to send email.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error sending email.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Schedule II: upload each chosen file in turn and add it to the attached list.
  const handleScheduleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingFile(true);
    try {
      for (const file of Array.from(files)) {
        try {
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
            unsaved.markDirty();
          }
        } catch (err: any) {
          toast.error(`Upload failed for ${file.name}: ${err.message}`);
        }
      }
    } finally {
      setUploadingFile(false);
    }
  };

  const listPath = `/${activeModule}/marine/first-entry?tab=first-entry`;
  const locked = !!uqmsNumber;
  const numberValue = (v: string): number | '' => (v !== '' ? Number(v) : '');

  const sisterShipOptions = allVessels
    .filter(v => v._id !== existingVesselId)
    .map(v => ({ id: v._id, label: `${v.vesselName} ${v.uqmsNumber ? `(${v.uqmsNumber})` : '(pending)'}` }));

  const SECTIONS = [
    { id: 'fe-request', label: 'Request', invalid: !!errors.request },
    { id: 'fe-vessel', label: 'Vessel', invalid: !!(errors.vesselName || errors.vesselCode || errors.flag || errors.portOfRegistry) },
    { id: 'fe-dimensions', label: 'Tonnage & dimensions', invalid: !!(errors.grossTonnage || errors.overallLength) },
    { id: 'fe-machinery', label: 'Machinery' },
    { id: 'fe-build', label: 'Build & owners' },
    { id: 'fe-quotation', label: 'Quotation' },
    { id: 'fe-schedule', label: 'Schedule II' },
  ];

  if (initialLoading) {
    return <LoadingBlock label="Loading first entry…" />;
  }

  return (
    <div className="animate-in">
      <PageHeader
        back={{ href: listPath, label: 'First entries' }}
        title={isEdit ? 'Edit first entry' : 'Create first entry'}
        description="Vessel particulars, quotation status and Schedule II documents. Fields marked * are required."
        meta={uqmsNumber ? <Badge tone="success" dot>{uqmsNumber}</Badge> : isEdit ? <Badge tone="warning" dot>No UQMS number yet</Badge> : undefined}
      />

      <FormWithNav nav={<SectionNav sections={SECTIONS} />}>
        <form onSubmit={handleSaveClick} onChangeCapture={unsaved.markDirty} noValidate>
          <FormSection id="fe-request" title="Request" description="Only printed requests that haven't been converted yet are listed.">
            <div className={s.narrow}>
              <SearchableSelect
                label="Request"
                required
                value={selectedRequestId}
                options={requestOptions}
                placeholder="Choose a request"
                searchPlaceholder="Search request no., vessel or company…"
                disabled={locked}
                onChange={(val) => { handleRequestChange(val); clearError('request'); unsaved.markDirty(); }}
              />
              {errors.request && <p className={s.selectError} role="alert" data-field-error>{errors.request}</p>}
              {!errors.request && locked && <p className={s.hint}>Locked: the UQMS number has been generated for this vessel.</p>}
            </div>
          </FormSection>

          <FormSection id="fe-vessel" title="Vessel" description={locked ? 'Registry fields are locked once the UQMS number is generated.' : undefined}>
            <FormGrid columns={3}>
              <Field label="Vessel name" required error={errors.vesselName}>
                <Input placeholder="e.g. Queen Elizabeth" value={vesselName} disabled={locked}
                  onChange={e => { setVesselName(e.target.value); clearError('vesselName'); }} />
              </Field>
              <Field label="IMO number">
                <Input inputMode="numeric" placeholder="e.g. 9134543" value={imoNumber} onChange={e => setImoNumber(e.target.value)} />
              </Field>
              <Field label="MMSI number">
                <Input inputMode="numeric" placeholder="e.g. 235085327" value={mmsiNumber} onChange={e => setMmsiNumber(e.target.value)} />
              </Field>
              <Field label="Vessel code" required error={errors.vesselCode}>
                <Select placeholder="Select vessel code" value={vesselCode} onChange={e => { setVesselCode(e.target.value); clearError('vesselCode'); }}>
                  {vesselCodes.map(vc => <option key={vc._id} value={vc.code}>{vc.code} - {vc.description}</option>)}
                </Select>
              </Field>
              <Field label="Vessel type">
                <Select value={vesselType} onChange={e => setVesselType(e.target.value)}>
                  <option value="">Not set</option>
                  {vesselTypes.map(vt => <option key={vt._id} value={vt._id}>{vt.name} ({vt.group})</option>)}
                </Select>
              </Field>
              <Field label="Area of operation">
                <Select value={areaOfOperation} onChange={e => setAreaOfOperation(e.target.value)}>
                  <option value="">Not set</option>
                  {areaOperations.map(ao => <option key={ao._id} value={ao._id}>{ao.description} ({ao.AreaCategory})</option>)}
                </Select>
              </Field>
              <Field label="Call sign">
                <Input value={callSign} onChange={e => setCallSign(e.target.value)} />
              </Field>
              <Field label="Flag" required error={errors.flag}>
                <Input value={flag} disabled={locked} onChange={e => { setFlag(e.target.value); clearError('flag'); }} />
              </Field>
              <Field label="Port of registry" required error={errors.portOfRegistry}>
                <Input value={portOfRegistry} disabled={locked} onChange={e => { setPortOfRegistry(e.target.value); clearError('portOfRegistry'); }} />
              </Field>
              <Field label="Date of registry">
                <Input type="date" value={dateOfRegistry} onChange={e => setDateOfRegistry(e.target.value)} />
              </Field>
              <div className={s.span2}>
                <SearchableMultiSelect
                  label="Sister ships"
                  value={selectedSisterShipIds}
                  options={sisterShipOptions}
                  placeholder="Select sister ships"
                  searchPlaceholder="Search vessels…"
                  onChange={(ids) => { setSelectedSisterShipIds(ids); unsaved.markDirty(); }}
                />
              </div>
              <Field label="Vessel description" full>
                <Textarea rows={3} placeholder="Area category, historical routes…" value={description} onChange={e => setDescription(e.target.value)} />
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection id="fe-dimensions" title="Tonnage & dimensions">
            <FormGrid columns={3}>
              <Field label="Gross tonnage" required error={errors.grossTonnage}>
                <Input type="number" inputMode="decimal" suffix="GT" value={grossTonnage} disabled={locked}
                  onChange={e => { setGrossTonnage(numberValue(e.target.value)); clearError('grossTonnage'); }} />
              </Field>
              <Field label="Net tonnage">
                <Input type="number" inputMode="decimal" suffix="NT" value={netTonnage} disabled={locked} onChange={e => setNetTonnage(numberValue(e.target.value))} />
              </Field>
              <Field label="Deadweight">
                <Input type="number" inputMode="decimal" suffix="t" value={deadweight} disabled={locked} onChange={e => setDeadweight(numberValue(e.target.value))} />
              </Field>
              <Field label="Lightship">
                <Input type="number" inputMode="decimal" suffix="t" value={lightship} disabled={locked} onChange={e => setLightship(numberValue(e.target.value))} />
              </Field>
              <Field label="Overall length" required error={errors.overallLength}>
                <Input type="number" inputMode="decimal" suffix="m" value={overallLength} disabled={locked}
                  onChange={e => { setOverallLength(numberValue(e.target.value)); clearError('overallLength'); }} />
              </Field>
              <Field label="LBP">
                <Input type="number" inputMode="decimal" suffix="m" value={lbp} disabled={locked} onChange={e => setLbp(numberValue(e.target.value))} />
              </Field>
              <Field label="Length">
                <Input type="number" inputMode="decimal" suffix="m" value={length} disabled={locked} onChange={e => setLength(numberValue(e.target.value))} />
              </Field>
              <Field label="Breadth">
                <Input type="number" inputMode="decimal" suffix="m" value={breadth} disabled={locked} onChange={e => setBreadth(numberValue(e.target.value))} />
              </Field>
              <Field label="Depth">
                <Input type="number" inputMode="decimal" suffix="m" value={depth} disabled={locked} onChange={e => setDepth(numberValue(e.target.value))} />
              </Field>
              <Field label="Draught">
                <Input type="number" inputMode="decimal" suffix="m" value={draught} disabled={locked} onChange={e => setDraught(numberValue(e.target.value))} />
              </Field>
              <Field label="Freeboard">
                <Input type="number" inputMode="decimal" suffix="m" value={freeboard} disabled={locked} onChange={e => setFreeboard(numberValue(e.target.value))} />
              </Field>
              <Field label="Ballast water capacity">
                <Input type="number" inputMode="decimal" value={ballastWtrCapacity} disabled={locked} onChange={e => setBallastWtrCapacity(numberValue(e.target.value))} />
              </Field>
              <Field label="Hull material">
                <Input value={material} disabled={locked} onChange={e => setMaterial(e.target.value)} />
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection
            id="fe-machinery"
            title="Machinery"
            actions={
              <Button size="sm" icon={<Plus />} onClick={() => setEngines([...engines, { model: '', quantity: '', totalPower: '', speed: '', rpm: '' }])}>
                Add engine
              </Button>
            }
          >
            <div className={s.engines}>
              {engines.map((eng, index) => {
                const setEngine = (patch: Partial<typeof eng>) =>
                  setEngines(engines.map((e2, i) => (i === index ? { ...e2, ...patch } : e2)));
                return (
                  <fieldset key={index} className={s.engine}>
                    <legend className={s.engineTitle}>Engine {index + 1}</legend>
                    {engines.length > 1 && (
                      <IconButton
                        className={s.engineRemove}
                        label={`Remove engine ${index + 1}`}
                        icon={<Trash2 />}
                        size="sm"
                        variant="dangerGhost"
                        onClick={() => setEngines(engines.filter((_, i) => i !== index))}
                      />
                    )}
                    <FormGrid columns={3}>
                      <Field label="Model">
                        <Input value={eng.model} onChange={e => setEngine({ model: e.target.value })} />
                      </Field>
                      <Field label="Quantity">
                        <Input type="number" inputMode="numeric" value={eng.quantity} onChange={e => setEngine({ quantity: numberValue(e.target.value) })} />
                      </Field>
                      <Field label="Total power">
                        <Input type="number" inputMode="decimal" suffix="kW" value={eng.totalPower} onChange={e => setEngine({ totalPower: numberValue(e.target.value) })} />
                      </Field>
                      <Field label="Speed">
                        <Input type="number" inputMode="decimal" suffix="kn" value={eng.speed} onChange={e => setEngine({ speed: numberValue(e.target.value) })} />
                      </Field>
                      <Field label="RPM">
                        <Input type="number" inputMode="numeric" value={eng.rpm} onChange={e => setEngine({ rpm: numberValue(e.target.value) })} />
                      </Field>
                    </FormGrid>
                  </fieldset>
                );
              })}
            </div>

            <FormGrid columns={3}>
              <Field label="Stroke">
                <Input value={stroke} onChange={e => setStroke(e.target.value)} />
              </Field>
              <Field label="Engine builder">
                <Input value={engineBuilder} onChange={e => setEngineBuilder(e.target.value)} />
              </Field>
              <Field label="Engine built">
                <Input value={engineBuilt} onChange={e => setEngineBuilt(e.target.value)} />
              </Field>
              <Field label="Propeller">
                <Input value={propeller} onChange={e => setPropeller(e.target.value)} />
              </Field>
              <Field label="Boilers">
                <Input value={boilers} onChange={e => setBoilers(e.target.value)} />
              </Field>
              <Field label="Electrical installation">
                <Input value={electricalInstallation} onChange={e => setElectricalInstallation(e.target.value)} />
              </Field>
              <Field label="Class notation (hull)">
                <Input value={classNotationHull} onChange={e => setClassNotationHull(e.target.value)} />
              </Field>
              <Field label="Class notation (machinery)">
                <Input value={classNotationMachinery} onChange={e => setClassNotationMachinery(e.target.value)} />
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection id="fe-build" title="Build & owners">
            <FormGrid columns={2}>
              <Field label="Builder">
                <Input value={builder} onChange={e => setBuilder(e.target.value)} />
              </Field>
              <Field label="Place built">
                <Input value={placeOfBuilt} onChange={e => setPlaceOfBuilt(e.target.value)} />
              </Field>
              <Field label="Yard no.">
                <Input value={yardNo} onChange={e => setYardNo(e.target.value)} />
              </Field>
              <Field label="Build date" hint="YYYY/MM/DD or YYYY/MM">
                <Input inputMode="numeric" placeholder="YYYY/MM/DD" value={dateOfBuild} onChange={e => setDateOfBuild(e.target.value.replace(/[^\d/]/g, ''))} />
              </Field>
              <Field label="Registered owner">
                <Input value={registeredOwnerName} onChange={e => setRegisteredOwnerName(e.target.value)} />
              </Field>
              <Field label="Owner address">
                <Input value={registeredOwnerAddress} onChange={e => setRegisteredOwnerAddress(e.target.value)} />
              </Field>
              <Field label="Invoicing name">
                <Input value={invoicingName} onChange={e => setInvoicingName(e.target.value)} />
              </Field>
              <Field label="Invoicing address">
                <Input value={invoicingAddress} onChange={e => setInvoicingAddress(e.target.value)} />
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection
            id="fe-quotation"
            title="Quotation"
            description={acceptedQuotation
              ? 'Taken from the quotation the client accepted in the Finance module.'
              : "Record the quotation number, or why the request isn't quoted."}
          >
            <div className={s.narrow}>
              {acceptedQuotation ? (
                <div className={s.quoteAccepted}>
                  <Badge tone="success" icon={<Check />}>Accepted</Badge>
                  <span className={s.quoteNumber}>{acceptedQuotation.quotationNumber}</span>
                  {quotationHref(acceptedQuotation) && (
                    <a className={buttonClassName({ variant: 'ghost', size: 'sm' })} href={quotationHref(acceptedQuotation)} target="_blank" rel="noreferrer">
                      <ExternalLink aria-hidden="true" /><span>Open quotation</span>
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <Checkbox label="This request is quoted" checked={isQuoted} onChange={e => setIsQuoted(e.target.checked)} />
                  <div className={s.quoteField}>
                    {isQuoted ? (
                      <Field label="Quotation number" hint="Needed for the UQMS number">
                        <Input placeholder="e.g. QT/26/0028" value={quotationNumber} onChange={e => setQuotationNumber(e.target.value)} />
                      </Field>
                    ) : (
                      <Field label="Why it isn't quoted" hint="Needed for the UQMS number">
                        <Textarea placeholder="e.g. Awaiting owner confirmation of scope" value={quotationComments} onChange={e => setQuotationComments(e.target.value)} />
                      </Field>
                    )}
                  </div>
                  {latestQuotation && (
                    <p className={s.hint}>
                      Latest quotation in Finance: {latestQuotation.quotationNumber} ({latestQuotation.status}). It fills in here once the client accepts it.
                    </p>
                  )}
                </>
              )}
            </div>
          </FormSection>

          <FormSection
            id="fe-schedule"
            title="Schedule II documents"
            description="The UQMS number is generated once Schedule II documents are attached and saved."
            actions={existingScheduleIIId && attachedDocuments.length > 0 && (
              scheduleEmailSent
                ? <Badge tone="success" icon={<Check />}>Emailed to DSSC</Badge>
                : <Button size="sm" icon={<Send />} onClick={handleSendEmailClick} loading={isSendingEmail}>Email to DSSC</Button>
            )}
          >
            <DragDropFileUpload
              onFilesSelected={handleScheduleFiles}
              multiple
              accept="application/pdf,image/*"
              disabled={uploadingFile}
              text={<span>{uploadingFile ? 'Uploading…' : 'Add Schedule II documents'}</span>}
              subText="PDF or images · max 10 MB each"
            />
            {attachedDocuments.length === 0 ? (
              <p className={s.hint}>No Schedule II documents attached yet.</p>
            ) : (
              <ul className={s.docList}>
                {attachedDocuments.map((doc, idx) => (
                  <li key={`${doc.key || doc.name}-${idx}`} className={s.docRow}>
                    <span className={s.docIcon} aria-hidden="true"><FileText /></span>
                    <span className={s.docText}>
                      <span className={s.docName}>{doc.name}</span>
                      <span className={s.docMeta}>{(doc.size ? doc.size / 1024 / 1024 : 0).toFixed(2)} MB</span>
                    </span>
                    {doc.url && (
                      <a className={buttonClassName({ variant: 'ghost', size: 'sm' })} href={doc.url} target="_blank" rel="noreferrer">
                        <ExternalLink aria-hidden="true" /><span>Open</span>
                      </a>
                    )}
                    <IconButton label={`Remove ${doc.name}`} icon={<X />} size="sm" variant="dangerGhost"
                      onClick={() => { removeDocument(idx); unsaved.markDirty(); }} />
                  </li>
                ))}
              </ul>
            )}
          </FormSection>

          <StickyActionBar dirty={unsaved.dirty}>
            <ButtonLink to={listPath}>Cancel</ButtonLink>
            <Button type="submit" variant="primary" loading={loading} disabled={!canSave}
              title={canSave ? undefined : 'You do not have permission to save this record.'}>
              {isEdit ? 'Save changes' : 'Create first entry'}
            </Button>
          </StickyActionBar>
        </form>
      </FormWithNav>

      <ConfirmDialog
        open={showWarningModal}
        title="Save with missing details?"
        message={
          <>
            <p>{[
              !(isQuoted ? quotationNumber.trim() : quotationComments.trim()) && 'Quotation details are incomplete.',
              attachedDocuments.length === 0 && 'No Schedule II documents are attached.',
            ].filter(Boolean).join(' ')}</p>
            <p className={s.dialogNote}>You can save now and finish later. The UQMS number is only generated once Schedule II documents are attached.</p>
          </>
        }
        confirmText="Save anyway"
        cancelText="Go back"
        loading={loading}
        onConfirm={performSave}
        onCancel={() => setShowWarningModal(false)}
      />

      <ConfirmDialog
        open={showEmailConfirm}
        title="Email Schedule II documents?"
        message="The attached Schedule II documents will be emailed to the DSSC."
        confirmText="Send email"
        onConfirm={performSendEmail}
        onCancel={() => setShowEmailConfirm(false)}
      />
      {unsaved.dialog}
    </div>
  );
}
