import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { surveyReportService, vesselEquipmentRecordService } from '@/api';

interface IFireRow {
  location: string;
  nos: string;
  type: string;
  capacity: string;
  date: string;
  servicedBy: string;
}

interface ILifeRaftDetails {
  quantity: string;
  capacity: string;
  manufacturer: string;
  packType: string;
  serialNumber: string;
  lastInspectionDate: string;
  serviceProvider: string;
}

const defaultFireRows: IFireRow[] = [
  { location: 'Operating station', nos: '1', type: 'DCP', capacity: '3.5 kg', date: '17/07/2025', servicedBy: 'SHM Shipcare Pvt Ltd' },
  { location: 'Steering room', nos: '1', type: 'DCP', capacity: '3.5 kg', date: '17/07/2025', servicedBy: 'SHM Shipcare Pvt Ltd' },
  { location: 'Accommodation', nos: '1', type: 'DCP', capacity: '3.5 kg', date: '17/07/2025', servicedBy: 'SHM Shipcare Pvt Ltd' },
  { location: 'Engine room', nos: '2', type: 'DCP', capacity: '3.5 kg', date: '17/07/2025', servicedBy: 'SHM Shipcare Pvt Ltd' },
  { location: 'Engine room', nos: '2', type: 'CO2', capacity: '6.8 kg', date: '17/07/2025', servicedBy: 'SHM Shipcare Pvt Ltd' },
];

const defaultLifeRaft: ILifeRaftDetails = {
  quantity: '1',
  capacity: '20',
  manufacturer: 'Shanghai Youlong Rubber Protlucts Co. Ltd.',
  packType: 'A-Pack',
  serialNumber: 'l 5693',
  lastInspectionDate: '17/07/25',
  serviceProvider: 'SHM Shipcare Pvt Ltd',
};

const serializeFireRows = (rows: IFireRow[]): string => {
  return 'ROWS:' + rows.map(r => `${r.location},${r.nos},${r.type},${r.capacity},${r.date},${r.servicedBy}`).join(';');
};

const deserializeFireRows = (remarks: string): IFireRow[] => {
  if (!remarks || !remarks.startsWith('ROWS:')) {
    return defaultFireRows;
  }
  try {
    const raw = remarks.substring(5);
    return raw.split(';').map(rowStr => {
      const parts = rowStr.split(',');
      return {
        location: parts[0] || '',
        nos: parts[1] || '',
        type: parts[2] || '',
        capacity: parts[3] || '',
        date: parts[4] || '',
        servicedBy: parts[5] || '',
      };
    });
  } catch (err) {
    return defaultFireRows;
  }
};

const serializeLifeRaft = (details: ILifeRaftDetails): string => {
  return `RAFTS:${details.quantity},${details.capacity},${details.manufacturer},${details.packType},${details.serialNumber},${details.lastInspectionDate},${details.serviceProvider}`;
};

const deserializeLifeRaft = (remarks: string): ILifeRaftDetails => {
  if (!remarks || !remarks.startsWith('RAFTS:')) {
    return defaultLifeRaft;
  }
  try {
    const parts = remarks.substring(6).split(',');
    return {
      quantity: parts[0] || '',
      capacity: parts[1] || '',
      manufacturer: parts[2] || '',
      packType: parts[3] || '',
      serialNumber: parts[4] || '',
      lastInspectionDate: parts[5] || '',
      serviceProvider: parts[6] || '',
    };
  } catch (err) {
    return defaultLifeRaft;
  }
};

const wordToNumber = (word: string): string => {
  if (!word) return '0';
  const clean = word.toLowerCase().trim();
  const map: Record<string, string> = {
    one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10'
  };
  return map[clean] || clean;
};

const numberToWord = (num: string | number): string => {
  const clean = String(num).trim();
  const map: Record<string, string> = {
    '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine', '10': 'Ten'
  };
  return map[clean] || clean;
};

const defaultInspections = [
  'Weather decks, hatchways, and other deck openings for watertight integrity.',
  'Ship side plating above the waterline, casings, skylights, and deckhouses.',
  'Superstructures, including end bulkheads, windows, scuttles, and deadlights.',
  'Openings such as garbage chutes, inlets, scuppers, and sanitary discharges.',
  'Guard rails, bulwarks, freeing ports (including those with shutters), walkways.',
  'Watertight and weather-tight doors were operationally tested and found satisfactory.',
  'Watertight bulkhead penetrations and the condition of collision and other watertight bulkheads were found satisfactory to the extent visible.',
  'Ventilators and air pipes, including their coamings, closing appliances, and deck welds, were inspected and found to be in satisfactory condition.',
  'Anchoring and mooring equipment, including the mooring and grounding tackle, were examined, function- tested, and found satisfactory.',
  'Sea inlets and discharge arrangements were verified as far as practicable and found to be in satisfactory condition.'
];

export default function EditSurveyReport() {
  const navigate = useNavigate();
  const { id, module } = useParams<{ id: string; module?: string }>(); // FirstEntrySurveyReport ID
  const activeModule = module || 'reporting';

  // Loading and action states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  // Document state metadata
  const [exists, setExists] = useState(false);
  const [existingReportId, setExistingReportId] = useState<string | null>(null);
  const [vessel, setVessel] = useState<any | null>(null);
  const [vesselId, setVesselId] = useState('');
  const [vesselEquipmentRecordId, setVesselEquipmentRecordId] = useState('');

  // Form Fields (SurveyReport)
  const [stabilityBooklet, setStabilityBooklet] = useState({
    available: false,
    approvedBy: '',
    approvalDate: '',
  });
  
  const [dockingSurvey, setDockingSurvey] = useState({
    harbour: '',
    date: '',
  });

  const [thicknessMeasurement, setThicknessMeasurement] = useState({
    carriedBy: '',
    harbour: '',
    date: '',
    reportNo: '',
  });

  const [hullStructureCondition, setHullStructureCondition] = useState('satisfactory');
  const [hullInspections, setHullInspections] = useState<string[]>([]);

  const [mainDeck, setMainDeck] = useState({
    coatingCondition: 'Good',
    structureCondition: 'satisfactory',
  });

  const [accessOpeningsCondition, setAccessOpeningsCondition] = useState('satisfactory');

  const [tanks, setTanks] = useState({
    fuelOilPortName: 'P',
    fuelOilPortFrame: '',
    fuelOilPortCondition: 'satisfactory',
    fuelOilStarboardName: 'S',
    fuelOilStarboardFrame: '',
    fuelOilStarboardCondition: 'satisfactory',
    freshWaterCenterName: 'C',
    freshWaterCenterFrame: '',
    freshWaterCenterCondition: 'satisfactory',
  });

  const [spaces, setSpaces] = useState({
    machinerySpace: 'Satisfactory',
    steeringGear: 'Satisfactory',
    operatingStation: 'Satisfactory',
    accommodation: 'Satisfactory',
  });

  const [toiletCount, setToiletCount] = useState(0);
  const [wheelhouse, setWheelhouse] = useState({
    structureCondition: 'satisfactory',
    passengerSeatingCondition: 'good',
  });
  const [hasGalley, setHasGalley] = useState(false);
  const [galleyRemarks, setGalleyRemarks] = useState('');

  const [lifeJacketsCondition, setLifeJacketsCondition] = useState('satisfactory');

  const [pipingCondition, setPipingCondition] = useState('satisfactory');
  const [electricalExamCondition, setElectricalExamCondition] = useState('as far as practicable');

  const [machinery, setMachinery] = useState({
    mainEngineCount: 2,
    mainEngineModel: 'Caterpillar',
    mainEnginePower: '714kW (970 HP)',
    mainEngineFuelType: 'Diesel',
    mainEngineAlarms: 'satisfaction',
    
    auxEngineCount: 0,
    auxEngineModel: 'Caterpillar',
    auxEngineOutput: '17KW',
    auxEngineAlarms: 'satisfaction',
    powerGeneration: '',
  });

  const [signature, setSignature] = useState({
    dateOfIssue: '',
    surveyorName: '',
    surveyorTitle: 'Marine Surveyor',
    certifyingBody: 'Universal Quality Management Systems (Pvt) Ltd.',
  });

  const [status, setStatus] = useState<'Draft' | 'Approved'>('Draft');

  const [totalPersonsOnboard, setTotalPersonsOnboard] = useState(0);
  const [maxPassengers, setMaxPassengers] = useState(0);
  const [minManning, setMinManning] = useState(0);

  // Form Fields (VesselEquipmentRecord)
  const [equipmentRecords, setEquipmentRecords] = useState<any[]>([]);
  const [compassMfg, setCompassMfg] = useState('Plastimo');
  const [compassType, setCompassType] = useState('OFFSHORE 135');
  const [compassSerial, setCompassSerial] = useState('BV 0062');

  const [radarMfg, setRadarMfg] = useState('Furuno');
  const [radarType, setRadarType] = useState('MFD 12');
  const [radarSerial, setRadarSerial] = useState('4368-1294');

  const [vhfMfg, setVhfMfg] = useState('Furuno');
  const [vhfType, setVhfType] = useState('FM-8800S');
  const [vhfSerial, setVhfSerial] = useState('3519-Ala2');

  const [aisMfg, setAisMfg] = useState('Sunhung');
  const [aisType, setAisType] = useState('SH- 820');
  const [aisSerial, setAisSerial] = useState('5H 8201 10917');

  const [fireRows, setFireRows] = useState<IFireRow[]>(defaultFireRows);
  const [lifeRaftDetails, setLifeRaftDetails] = useState<ILifeRaftDetails>(defaultLifeRaft);

  const [flaresExpiry, setFlaresExpiry] = useState('08/2027');
  const [parachuteExpiry, setParachuteExpiry] = useState('08/2027');
  const [smokeExpiry, setSmokeExpiry] = useState('08/2027');

  const [flaresCount, setFlaresCount] = useState('4');
  const [parachuteCount, setParachuteCount] = useState('2');
  const [smokeCount, setSmokeCount] = useState('2');

  // Load data
  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        if (!id) return;

        // 1. Fetch SurveyReport details
        const res = await surveyReportService.getPrePopulatedSurveyReportData(id);
        if (res.success && res.data) {
          const { exists: reportExists, existingReportId: repId, report, vessel: vData, equipmentRecordId } = res.data;
          
          setExists(reportExists);
          setExistingReportId(repId);
          setVessel(vData);
          setVesselId(report.vesselId);
          setVesselEquipmentRecordId(equipmentRecordId);

          setStabilityBooklet({
            available: report.stabilityBooklet?.available ?? false,
            approvedBy: report.stabilityBooklet?.approvedBy || '',
            approvalDate: report.stabilityBooklet?.approvalDate ? report.stabilityBooklet.approvalDate.split('T')[0] : '',
          });

          setDockingSurvey({
            harbour: report.dockingSurvey?.harbour || '',
            date: report.dockingSurvey?.date ? report.dockingSurvey.date.split('T')[0] : '',
          });

          setThicknessMeasurement({
            carriedBy: report.thicknessMeasurement?.carriedBy || '',
            harbour: report.thicknessMeasurement?.harbour || '',
            date: report.thicknessMeasurement?.date ? report.thicknessMeasurement.date.split('T')[0] : '',
            reportNo: report.thicknessMeasurement?.reportNo || '',
          });

          setHullStructureCondition(report.hullStructureCondition || 'satisfactory');
          setHullInspections(report.hullInspections && report.hullInspections.length > 0 ? report.hullInspections : defaultInspections);

          setMainDeck({
            coatingCondition: report.mainDeck?.coatingCondition || 'Good',
            structureCondition: report.mainDeck?.structureCondition || 'satisfactory',
          });

          setAccessOpeningsCondition(report.accessOpeningsCondition || 'satisfactory');

          setTanks({
            fuelOilPortName: report.tanks?.fuelOilPortName || 'P',
            fuelOilPortFrame: report.tanks?.fuelOilPortFrame || '',
            fuelOilPortCondition: report.tanks?.fuelOilPortCondition || 'satisfactory',
            fuelOilStarboardName: report.tanks?.fuelOilStarboardName || 'S',
            fuelOilStarboardFrame: report.tanks?.fuelOilStarboardFrame || '',
            fuelOilStarboardCondition: report.tanks?.fuelOilStarboardCondition || 'satisfactory',
            freshWaterCenterName: report.tanks?.freshWaterCenterName || 'C',
            freshWaterCenterFrame: report.tanks?.freshWaterCenterFrame || '',
            freshWaterCenterCondition: report.tanks?.freshWaterCenterCondition || 'satisfactory',
          });

          setSpaces({
            machinerySpace: report.spaces?.machinerySpace || 'Satisfactory',
            steeringGear: report.spaces?.steeringGear || 'Satisfactory',
            operatingStation: report.spaces?.operatingStation || 'Satisfactory',
            accommodation: report.spaces?.accommodation || 'Satisfactory',
          });

          setToiletCount(report.toiletCount ?? 0);

          setWheelhouse({
            structureCondition: report.wheelhouse?.structureCondition || 'satisfactory',
            passengerSeatingCondition: report.wheelhouse?.passengerSeatingCondition || 'good',
          });

          setHasGalley(report.hasGalley ?? false);
          setGalleyRemarks(report.galleyRemarks || '');

          setLifeJacketsCondition(report.lifeJacketsCondition || 'satisfactory');
          setPipingCondition(report.pipingCondition || 'satisfactory');
          setElectricalExamCondition(report.electricalExamCondition || 'as far as practicable');

          setMachinery({
            mainEngineCount: report.machinery?.mainEngineCount ?? (vData?.noOfEngines || 2),
            mainEngineModel: report.machinery?.mainEngineModel || (vData?.mainEngineModel || 'Caterpillar'),
            mainEnginePower: report.machinery?.mainEnginePower || (vData?.totalPower ? `${vData.totalPower}kW (${Math.round(vData.totalPower * 1.341)} HP)` : '714kW (970 HP)'),
            mainEngineFuelType: report.machinery?.mainEngineFuelType || 'Diesel',
            mainEngineAlarms: report.machinery?.mainEngineAlarms || 'satisfaction',
            
            auxEngineCount: report.machinery?.auxEngineCount ?? 0,
            auxEngineModel: report.machinery?.auxEngineModel || 'Caterpillar',
            auxEngineOutput: report.machinery?.auxEngineOutput || '17KW',
            auxEngineAlarms: report.machinery?.auxEngineAlarms || 'satisfaction',
            powerGeneration: report.machinery?.powerGeneration || '',
          });

          setSignature({
            dateOfIssue: report.signature?.dateOfIssue ? report.signature.dateOfIssue.split('T')[0] : new Date().toISOString().split('T')[0],
            surveyorName: report.signature?.surveyorName || '',
            surveyorTitle: report.signature?.surveyorTitle || 'Marine Surveyor',
            certifyingBody: report.signature?.certifyingBody || 'Universal Quality Management Systems (Pvt) Ltd.',
          });

           setTotalPersonsOnboard(report.totalPersonsOnboard ?? 0);
          setMaxPassengers(report.maxPassengers ?? 0);
          setMinManning(report.minManning ?? 0);

          setStatus(report.status || 'Draft');
        }

        // 2. Fetch Equipment Checklist
        const equipRes = await vesselEquipmentRecordService.getEquipmentRecordBySurveyReportId(id);
        if (equipRes.success && equipRes.data) {
          const records = equipRes.data.equipmentRecords || [];
          setEquipmentRecords(records);

          // Find specific items
          const compass = records.find(r => r.questionId?.description.toLowerCase().includes('compass'));
          const radar = records.find(r => r.questionId?.description.toLowerCase().includes('radar'));
          const vhf = records.find(r => r.questionId?.description.toLowerCase().includes('vhf fixed'));
          const ais = records.find(r => r.questionId?.description.toLowerCase().includes('ais'));

          const parseParts = (val: string, defaultVal: string) => {
            const raw = val && val !== '-' ? val : defaultVal;
            const parts = raw.split(/\||,/).map(s => s.trim());
            return {
              mfg: parts[0] || '',
              type: parts[1] || '',
              serial: parts[2] || '',
            };
          };

          if (compass) {
            const p = parseParts(compass.remarks || '', 'Plastimo | OFFSHORE 135 | BV 0062');
            setCompassMfg(p.mfg);
            setCompassType(p.type);
            setCompassSerial(p.serial);
          }
          if (radar) {
            const p = parseParts(radar.remarks || '', 'Furuno | MFD 12 | 4368-1294');
            setRadarMfg(p.mfg);
            setRadarType(p.type);
            setRadarSerial(p.serial);
          }
          if (vhf) {
            const p = parseParts(vhf.remarks || '', 'Furuno | FM-8800S | 3519-Ala2');
            setVhfMfg(p.mfg);
            setVhfType(p.type);
            setVhfSerial(p.serial);
          }
          if (ais) {
            const p = parseParts(ais.remarks || '', 'Sunhung | SH- 820 | 5H 8201 10917');
            setAisMfg(p.mfg);
            setAisType(p.type);
            setAisSerial(p.serial);
          }

          // Fire Fighting Extinguishers
          const fire = records.find(r => r.questionId?.description.toLowerCase().includes('portable fire extinguishers'));
          if (fire && fire.remarks) {
            setFireRows(deserializeFireRows(fire.remarks));
          }

          // Life Raft
          const lifeRaft = records.find(r => r.questionId?.description.toLowerCase().includes('life rafts'));
          if (lifeRaft && lifeRaft.remarks) {
            setLifeRaftDetails(deserializeLifeRaft(lifeRaft.remarks));
          }

          // Pyrotechnics Expiries & Counts
          const flare = records.find(r => r.questionId?.description.toLowerCase().includes('parachute flares'));
          const redFlare = records.find(r => r.questionId?.description.toLowerCase().includes('red hand flares'));
          const smoke = records.find(r => r.questionId?.description.toLowerCase().includes('smoke signals'));

          const getExp = (rem?: string) => rem?.match(/Expiry:\s*([^\s]+)/i)?.[1] || '08/2027';
          if (flare) setParachuteExpiry(getExp(flare.remarks));
          if (redFlare) setFlaresExpiry(getExp(redFlare.remarks));
          if (smoke) setSmokeExpiry(getExp(smoke.remarks));

          const getQty = (rem?: string) => {
            if (!rem) return '';
            const match = rem.match(/^([^\.\s]+)/);
            return match ? wordToNumber(match[1]) : '';
          };
          if (flare) setParachuteCount(getQty(flare.remarks) || '2');
          if (redFlare) setFlaresCount(getQty(redFlare.remarks) || '4');
          if (smoke) setSmokeCount(getQty(smoke.remarks) || '2');
        }

      } catch (err: any) {
        toast.error('Error loading report data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [id]);

  // Handle saving of both collections
  const handleSave = async (customStatus?: 'Draft' | 'Approved') => {
    if (!id || !vesselId) {
      toast.error('Missing references to save.');
      return null;
    }

    const reportStatus = customStatus || status;
    const reportPayload = {
      vesselId,
      firstEntrySurveyReportId: id,
      vesselEquipmentRecordId,
      stabilityBooklet: {
        available: stabilityBooklet.available,
        approvedBy: stabilityBooklet.approvedBy,
        approvalDate: stabilityBooklet.approvalDate || null,
      },
      dockingSurvey: {
        harbour: dockingSurvey.harbour,
        date: dockingSurvey.date || null,
      },
      thicknessMeasurement: {
        carriedBy: thicknessMeasurement.carriedBy,
        harbour: thicknessMeasurement.harbour,
        date: thicknessMeasurement.date || null,
        reportNo: thicknessMeasurement.reportNo,
      },
      hullStructureCondition,
      hullInspections,
      mainDeck: {
        coatingCondition: mainDeck.coatingCondition,
        structureCondition: mainDeck.structureCondition,
      },
      accessOpeningsCondition,
      tanks: {
        fuelOilPortName: tanks.fuelOilPortName,
        fuelOilPortFrame: tanks.fuelOilPortFrame,
        fuelOilPortCondition: tanks.fuelOilPortCondition,
        fuelOilStarboardName: tanks.fuelOilStarboardName,
        fuelOilStarboardFrame: tanks.fuelOilStarboardFrame,
        fuelOilStarboardCondition: tanks.fuelOilStarboardCondition,
        freshWaterCenterName: tanks.freshWaterCenterName,
        freshWaterCenterFrame: tanks.freshWaterCenterFrame,
        freshWaterCenterCondition: tanks.freshWaterCenterCondition,
      },
      spaces: {
        machinerySpace: spaces.machinerySpace,
        steeringGear: spaces.steeringGear,
        operatingStation: spaces.operatingStation,
        accommodation: spaces.accommodation,
      },
      toiletCount,
      wheelhouse: {
        structureCondition: wheelhouse.structureCondition,
        passengerSeatingCondition: wheelhouse.passengerSeatingCondition,
      },
      hasGalley,
      galleyRemarks,
      lifeJacketsCondition,
      pipingCondition,
      electricalExamCondition,
      machinery: {
        mainEngineCount: machinery.mainEngineCount,
        mainEngineModel: machinery.mainEngineModel,
        mainEnginePower: machinery.mainEnginePower,
        mainEngineFuelType: machinery.mainEngineFuelType,
        mainEngineAlarms: machinery.mainEngineAlarms,
        
        auxEngineCount: machinery.auxEngineCount,
        auxEngineModel: machinery.auxEngineModel,
        auxEngineOutput: machinery.auxEngineOutput,
        auxEngineAlarms: machinery.auxEngineAlarms,
        powerGeneration: machinery.powerGeneration,
      },
      signature: {
        dateOfIssue: signature.dateOfIssue || null,
        surveyorName: signature.surveyorName,
        surveyorTitle: signature.surveyorTitle,
        certifyingBody: signature.certifyingBody,
      },
      totalPersonsOnboard,
      maxPassengers,
      minManning,
      status: reportStatus,
    };

    try {
      setSaving(true);
      let savedId = existingReportId;

      // 1. Save Survey Report
      if (exists && existingReportId) {
        const res = await surveyReportService.updateSurveyReport(existingReportId, reportPayload);
        if (!res.success) {
          toast.error(res.message || 'Failed to save Survey Report parameters.');
          return null;
        }
      } else {
        const res = await surveyReportService.createSurveyReport(reportPayload);
        if (res.success && res.data) {
          setExists(true);
          setExistingReportId(res.data._id);
          savedId = res.data._id;
        } else {
          toast.error(res.message || 'Failed to create Survey Report.');
          return null;
        }
      }

      // 2. Map and Save updated Equipment records back to Mongoose
      const updatedRecords = equipmentRecords.map(rec => {
        const desc = rec.questionId?.description?.toLowerCase() || '';
        let remarks = rec.remarks || '';
        let itemStatus = rec.status || 'Provided';

        if (desc.includes('compass')) {
          remarks = `${compassMfg} | ${compassType} | ${compassSerial}`;
        } else if (desc.includes('radar')) {
          remarks = `${radarMfg} | ${radarType} | ${radarSerial}`;
        } else if (desc.includes('vhf fixed')) {
          remarks = `${vhfMfg} | ${vhfType} | ${vhfSerial}`;
        } else if (desc.includes('ais')) {
          remarks = `${aisMfg} | ${aisType} | ${aisSerial}`;
        } else if (desc.includes('portable fire extinguishers')) {
          remarks = serializeFireRows(fireRows);
        } else if (desc.includes('life rafts')) {
          remarks = serializeLifeRaft(lifeRaftDetails);
          itemStatus = Number(lifeRaftDetails.quantity) > 0 ? 'Provided' : 'Not Provided';
        } else if (desc.includes('parachute flares')) {
          remarks = `${numberToWord(parachuteCount)}. Serial No: 1302095 Expiry: ${parachuteExpiry}`;
        } else if (desc.includes('red hand flares')) {
          remarks = `${numberToWord(flaresCount)}. Serial No: 1301816 Expiry: ${flaresExpiry}`;
        } else if (desc.includes('smoke signals')) {
          remarks = `${numberToWord(smokeCount)}. Serial No: 9-0001-1 Expiry: ${smokeExpiry}`;
        }

        return {
          questionId: rec.questionId._id,
          status: itemStatus,
          remarks,
        };
      });

      const recordRes = await vesselEquipmentRecordService.saveEquipmentRecord(id, {
        vesselId,
        equipmentRecords: updatedRecords,
      });

      if (recordRes.success) {
        toast.success(`Survey parameters and Record of Equipment saved successfully!`);
        setStatus(reportStatus);
      } else {
        toast.error('Failed to sync equipment record updates.');
      }

      return savedId;
    } catch (err: any) {
      toast.error('Error saving: ' + err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewPdf = async () => {
    toast.info('Saving changes before exporting PDF...');
    const savedId = await handleSave();
    if (!savedId) return;

    try {
      setDownloading(true);
      const blob = await surveyReportService.getSurveyReportPdfBlob(savedId);
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `Survey_Report_${vessel?.vesselName || 'Vessel'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('PDF generated and downloaded successfully!');
    } catch (err: any) {
      toast.error('Error downloading PDF: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleFinalize = async () => {
    const approved = await handleSave('Approved');
    if (approved) {
      toast.success('Report finalized and approved!');
    }
  };

  // Inline table updates helpers
  const updateFireRow = (idx: number, field: keyof IFireRow, val: string) => {
    const updated = [...fireRows];
    updated[idx] = { ...updated[idx], [field]: val };
    setFireRows(updated);
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <p>Loading Survey Report Editor...</p>
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ padding: '10px 4px', maxWidth: '940px', margin: '0 auto' }}>
      
      {/* Premium Styles Injection */}
      <style>{`
        .paper-sheet {
          background: #ffffff;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 60px;
          margin-bottom: 30px;
          color: #111827;
          font-family: 'Inter', system-ui, sans-serif;
          line-height: 1.8;
          font-size: 15px;
        }

        .paper-header {
          border-bottom: 2px solid var(--primary);
          padding-bottom: 20px;
          margin-bottom: 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .paper-title {
          font-size: 20px;
          font-weight: 850;
          color: var(--primary);
          letter-spacing: -0.02em;
          text-transform: uppercase;
        }

        .paper-subtitle {
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 4px;
        }

        .paper-section-title {
          font-size: 14px;
          font-weight: 750;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border);
          padding-bottom: 6px;
          margin-top: 36px;
          margin-bottom: 18px;
        }

        .paper-paragraph {
          margin-bottom: 18px;
          text-align: justify;
        }

        .paper-input {
          border: none;
          border-bottom: 1px dashed var(--primary);
          background: #f8fafc;
          padding: 2px 8px;
          margin: 0 4px;
          font-size: 14.5px;
          font-family: monospace;
          font-weight: 700;
          color: var(--primary);
          outline: none;
          border-radius: 4px;
          transition: all 0.2s ease;
          display: inline-block;
          height: auto;
          line-height: 1.4;
        }

        .paper-input:focus {
          background: var(--primary-glow);
          border-bottom: 2px solid var(--primary);
          box-shadow: 0 2px 6px rgba(0,0,0,0.03);
        }

        .paper-input[type="date"] {
          font-size: 13.5px;
          cursor: pointer;
        }

        .paper-table {
          width: 100%;
          border-collapse: collapse;
          margin: 18px 0;
          font-size: 13.5px;
        }

        .paper-table th, .paper-table td {
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          text-align: left;
        }

        .paper-table th {
          background: #f8fafc;
          font-weight: 700;
          color: var(--primary);
        }

        .meta-summary-box {
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          font-size: 13.5px;
        }
      `}</style>

      {/* Nav Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to={`/${activeModule}/marine/first-entry/survey-report/edit/${id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '12px', background: 'var(--surface)', color: 'var(--label)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} className="hover-lift">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </Link>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: '24px', fontWeight: 850, color: 'var(--label)' }}>
              Final Survey Report Editor (Part C)
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500, marginTop: '4px' }}>
              Fill in report variables inline. The final document matches this layout and wording.
            </p>
          </div>
        </div>
      </div>

      {/* Metadata summary */}
      <div className="meta-summary-box">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>Vessel Name: <strong style={{ color: 'var(--label)' }}>{vessel?.vesselName?.toUpperCase()}</strong></div>
          <div>Official Code: <strong style={{ color: 'var(--label)' }}>{vessel?.vesselCode || 'SSC'}</strong></div>
          <div>UQMS No: <strong style={{ color: 'var(--label)' }}>{vessel?.uqmsNumber || 'N/A'}</strong></div>
          <div>Owner: <strong style={{ color: 'var(--label)' }}>{vessel?.registeredOwnerName || 'N/A'}</strong></div>
        </div>
      </div>

      {/* WYSIWYG A4 Page Layout */}
      <div className="paper-sheet">
        
        {/* Header */}
        <div className="paper-header">
          <div>
            <div className="paper-title">Universal Quality Management Systems (Pvt) Ltd</div>
            <div className="paper-subtitle">No; 08, Chandralekha Mawatha, Colombo 08, Sri Lanka.</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, fontFamily: 'monospace' }}>
            PART C – SURVEY REPORT
          </div>
        </div>

        {/* HULL */}
        <div className="paper-section-title">HULL:</div>
        
        <p className="paper-paragraph">
          <strong>Stability booklet.</strong><br />
          Stability booklet {' '}
          <select
            className="paper-input"
            value={stabilityBooklet.available ? 'yes' : 'no'}
            onChange={e => setStabilityBooklet(p => ({ ...p, available: e.target.value === 'yes' }))}
          >
            <option value="no">not available onboard</option>
            <option value="yes">available onboard</option>
          </select>
          . Stability book has been approved by {' '}
          <input
            type="text"
            className="paper-input"
            value={stabilityBooklet.approvedBy}
            onChange={e => setStabilityBooklet(p => ({ ...p, approvedBy: e.target.value }))}
            placeholder="BUREAU VERITAS"
            style={{ width: '150px' }}
          />
          on {' '}
          <input
            type="date"
            className="paper-input"
            value={stabilityBooklet.approvalDate}
            onChange={e => setStabilityBooklet(p => ({ ...p, approvalDate: e.target.value }))}
          />
          .
        </p>

        <div className="paper-section-title">DOCKING SURVEY DETAILS:</div>
        <p className="paper-paragraph">
          The most recent bottom survey was carried out during the vessel’s dry docking at the {' '}
          <input
            type="text"
            className="paper-input"
            value={dockingSurvey.harbour}
            onChange={e => setDockingSurvey(p => ({ ...p, harbour: e.target.value }))}
            placeholder="Dikkowita Fisheries Harbour"
            style={{ width: '220px' }}
          />
          on {' '}
          <input
            type="date"
            className="paper-input"
            value={dockingSurvey.date}
            onChange={e => setDockingSurvey(p => ({ ...p, date: e.target.value }))}
          />
          , in the presence of and duly witnessed by a UQMS appointed Surveyor.
        </p>

        <div className="paper-section-title">THICKNESS MEASUREMENT DETAILS:</div>
        <p className="paper-paragraph">
          Thickness measurements were carried out by {' '}
          <input
            type="text"
            className="paper-input"
            value={thicknessMeasurement.carriedBy}
            onChange={e => setThicknessMeasurement(p => ({ ...p, carriedBy: e.target.value }))}
            placeholder="Lanka High Marine (Pvt) Ltd."
            style={{ width: '220px' }}
          />
          at the {' '}
          <input
            type="text"
            className="paper-input"
            value={thicknessMeasurement.harbour}
            onChange={e => setThicknessMeasurement(p => ({ ...p, harbour: e.target.value }))}
            placeholder="Dikkowita Fisheries Harbour"
            style={{ width: '200px' }}
          />
          on {' '}
          <input
            type="date"
            className="paper-input"
            value={thicknessMeasurement.date}
            onChange={e => setThicknessMeasurement(p => ({ ...p, date: e.target.value }))}
          />
          under the verification of a UQMS Surveyor. The relevant Thickness Measurement Report (Report No. {' '}
          <input
            type="text"
            className="paper-input"
            value={thicknessMeasurement.reportNo}
            onChange={e => setThicknessMeasurement(p => ({ ...p, reportNo: e.target.value }))}
            placeholder="LHT-SB-TM-25-03-1874"
            style={{ width: '180px' }}
          />
          ) was reviewed at the time of survey.
        </p>

        <p className="paper-paragraph">
          The hull structure and its closing appliances were examined and found to be in{' '}
          <select
            className="paper-input"
            value={hullStructureCondition}
            onChange={e => setHullStructureCondition(e.target.value)}
          >
            <option value="satisfactory">satisfactory</option>
            <option value="unsatisfactory">unsatisfactory</option>
          </select>{' '}
          condition.<br />
          This includes the inspection of (check items to include in report):
        </p>
        <div style={{ marginLeft: '20px', marginBottom: '20px' }}>
          {defaultInspections.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
              <input
                type="checkbox"
                id={`inspect-${idx}`}
                checked={hullInspections.includes(item)}
                onChange={() => {
                  setHullInspections(prev =>
                    prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
                  );
                }}
                style={{ marginTop: '5px', cursor: 'pointer' }}
              />
              <label htmlFor={`inspect-${idx}`} style={{ cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
                {item}
              </label>
            </div>
          ))}
        </div>

        <div className="paper-section-title">MAIN DECK/FORECASTLE:</div>
        <p className="paper-paragraph">
          Coating condition on Main deck, Monkey Island were found in ‘
          <input
            type="text"
            className="paper-input"
            value={mainDeck.coatingCondition}
            onChange={e => setMainDeck(p => ({ ...p, coatingCondition: e.target.value }))}
            style={{ width: '80px' }}
          />
          ’ condition & Structure found{' '}
          <input
            type="text"
            className="paper-input"
            value={mainDeck.structureCondition}
            onChange={e => setMainDeck(p => ({ ...p, structureCondition: e.target.value }))}
            style={{ width: '120px' }}
          />
          .
        </p>

        <div className="paper-section-title">ACCESS OPENINGS & VENTILATIONS:</div>
        <p className="paper-paragraph">
          General examination carried out. Engine room maintenance hatches, Engine room emergency escape hatch, Accommodation space escape hatch and other accommodation ventilation port hole condition found{' '}
          <select
            className="paper-input"
            value={accessOpeningsCondition}
            onChange={e => setAccessOpeningsCondition(e.target.value)}
          >
            <option value="satisfactory">satisfactory</option>
            <option value="unsatisfactory">unsatisfactory</option>
          </select>{' '}
          with efficient weather tightness.
        </p>

        <div className="paper-section-title">TANKS:</div>
        <p className="paper-paragraph">
          Fuel Oil Tank ({' '}
          <input
            type="text"
            className="paper-input"
            value={tanks.fuelOilPortName}
            onChange={e => setTanks(p => ({ ...p, fuelOilPortName: e.target.value }))}
            style={{ width: '40px', textAlign: 'center' }}
          />{' '}
          ) – Between{' '}
          <input
            type="text"
            className="paper-input"
            value={tanks.fuelOilPortFrame}
            onChange={e => setTanks(p => ({ ...p, fuelOilPortFrame: e.target.value }))}
            placeholder="Fr. 10 – 12"
            style={{ width: '100px' }}
          /> <br />
          Tank external examination carried out to{' '}
          <select
            className="paper-input"
            value={tanks.fuelOilPortCondition}
            onChange={e => setTanks(p => ({ ...p, fuelOilPortCondition: e.target.value }))}
          >
            <option value="satisfactory">satisfactory</option>
            <option value="unsatisfactory">unsatisfactory</option>
          </select>
          . Remote Quick closing valve tested.
        </p>
        <p className="paper-paragraph">
          Fuel Oil Tank ({' '}
          <input
            type="text"
            className="paper-input"
            value={tanks.fuelOilStarboardName}
            onChange={e => setTanks(p => ({ ...p, fuelOilStarboardName: e.target.value }))}
            style={{ width: '40px', textAlign: 'center' }}
          />{' '}
          ) – Between{' '}
          <input
            type="text"
            className="paper-input"
            value={tanks.fuelOilStarboardFrame}
            onChange={e => setTanks(p => ({ ...p, fuelOilStarboardFrame: e.target.value }))}
            placeholder="Fr. 10 – 12"
            style={{ width: '100px' }}
          /> <br />
          Tank external examination carried out to{' '}
          <select
            className="paper-input"
            value={tanks.fuelOilStarboardCondition}
            onChange={e => setTanks(p => ({ ...p, fuelOilStarboardCondition: e.target.value }))}
          >
            <option value="satisfactory">satisfactory</option>
            <option value="unsatisfactory">unsatisfactory</option>
          </select>
          . Remote Quick closing valve tested.
        </p>
        <p className="paper-paragraph">
          Fresh Water Tanks ({' '}
          <input
            type="text"
            className="paper-input"
            value={tanks.freshWaterCenterName}
            onChange={e => setTanks(p => ({ ...p, freshWaterCenterName: e.target.value }))}
            style={{ width: '40px', textAlign: 'center' }}
          />{' '}
          ) - Between{' '}
          <input
            type="text"
            className="paper-input"
            value={tanks.freshWaterCenterFrame}
            onChange={e => setTanks(p => ({ ...p, freshWaterCenterFrame: e.target.value }))}
            placeholder="Fr. 12 – 13"
            style={{ width: '100px' }}
          /> <br />
          External examination carried out to{' '}
          <select
            className="paper-input"
            value={tanks.freshWaterCenterCondition}
            onChange={e => setTanks(p => ({ ...p, freshWaterCenterCondition: e.target.value }))}
          >
            <option value="satisfactory">satisfactory</option>
            <option value="unsatisfactory">unsatisfactory</option>
          </select>
          .
        </p>

        <div className="paper-section-title">SPACES:</div>
        <p className="paper-paragraph">
          Machinery Space: Cleanliness found{' '}
          <select
            className="paper-input"
            value={spaces.machinerySpace}
            onChange={e => setSpaces(p => ({ ...p, machinerySpace: e.target.value }))}
          >
            <option value="Satisfactory">Satisfactory</option>
            <option value="Unsatisfactory">Unsatisfactory</option>
          </select>
          .<br />
          Steering Gear Spaces: Cleanliness found{' '}
          <select
            className="paper-input"
            value={spaces.steeringGear}
            onChange={e => setSpaces(p => ({ ...p, steeringGear: e.target.value }))}
          >
            <option value="Satisfactory">Satisfactory</option>
            <option value="Unsatisfactory">Unsatisfactory</option>
          </select>
          .<br />
          Operating Station: Found{' '}
          <select
            className="paper-input"
            value={spaces.operatingStation}
            onChange={e => setSpaces(p => ({ ...p, operatingStation: e.target.value }))}
          >
            <option value="Satisfactory">Satisfactory</option>
            <option value="Unsatisfactory">Unsatisfactory</option>
          </select>
          .<br />
          Accommodation Spaces: Cleanliness found{' '}
          <select
            className="paper-input"
            value={spaces.accommodation}
            onChange={e => setSpaces(p => ({ ...p, accommodation: e.target.value }))}
          >
            <option value="Satisfactory">Satisfactory</option>
            <option value="Unsatisfactory">Unsatisfactory</option>
          </select>
          .
        </p>

        <div className="paper-section-title">TOILET:</div>
        <p className="paper-paragraph">
          <input
            type="number"
            className="paper-input"
            value={toiletCount}
            onChange={e => setToiletCount(Number(e.target.value))}
            style={{ width: '60px' }}
          />
          Toilet available.
        </p>

        <div className="paper-section-title">WHEEL HOUSE/ OPERATING STATION & PASSENGER SEATING AREA:</div>
        <p className="paper-paragraph">
          The vessel’s structure was found to be{' '}
          <select
            className="paper-input"
            value={wheelhouse.structureCondition}
            onChange={e => setWheelhouse(p => ({ ...p, structureCondition: e.target.value }))}
          >
            <option value="satisfactory">satisfactory</option>
            <option value="unsatisfactory">unsatisfactory</option>
          </select>
          . The condition of passenger seating was found to be{' '}
          <select
            className="paper-input"
            value={wheelhouse.passengerSeatingCondition}
            onChange={e => setWheelhouse(p => ({ ...p, passengerSeatingCondition: e.target.value }))}
          >
            <option value="good">good</option>
            <option value="fair">fair</option>
            <option value="poor">poor</option>
          </select>
          .
        </p>

        <div className="paper-section-title">GALLEY:</div>
        <p className="paper-paragraph">
          <input
            type="text"
            className="paper-input"
            value={galleyRemarks}
            onChange={e => setGalleyRemarks(e.target.value)}
            placeholder="No galley was found onboard at the time of inspection."
            style={{ width: '100%' }}
          />
        </p>

        {/* BRIDGE OUTFIT TABLE */}
        <div className="paper-section-title">BRIDGE OUTFIT:</div>
        <p className="paper-paragraph">
          Available Bridge navigation & radio equipment generally inspected and Operation verified to satisfaction. Following Navigational & radio equipment found on the bridge;
        </p>
        
        <table className="paper-table">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Equipment</th>
              <th style={{ width: '25%' }}>Manufacture</th>
              <th style={{ width: '25%' }}>Type</th>
              <th style={{ width: '25%' }}>Serial Number</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Magnetic Compass</td>
              <td>
                <input type="text" className="paper-input" value={compassMfg} onChange={e => setCompassMfg(e.target.value)} style={{ width: '90%' }} />
              </td>
              <td>
                <input type="text" className="paper-input" value={compassType} onChange={e => setCompassType(e.target.value)} style={{ width: '90%' }} />
              </td>
              <td>
                <input type="text" className="paper-input" value={compassSerial} onChange={e => setCompassSerial(e.target.value)} style={{ width: '90%' }} />
              </td>
            </tr>
            <tr>
              <td>Radar</td>
              <td>
                <input type="text" className="paper-input" value={radarMfg} onChange={e => setRadarMfg(e.target.value)} style={{ width: '90%' }} />
              </td>
              <td>
                <input type="text" className="paper-input" value={radarType} onChange={e => setRadarType(e.target.value)} style={{ width: '90%' }} />
              </td>
              <td>
                <input type="text" className="paper-input" value={radarSerial} onChange={e => setRadarSerial(e.target.value)} style={{ width: '90%' }} />
              </td>
            </tr>
            <tr>
              <td>VHF</td>
              <td>
                <input type="text" className="paper-input" value={vhfMfg} onChange={e => setVhfMfg(e.target.value)} style={{ width: '90%' }} />
              </td>
              <td>
                <input type="text" className="paper-input" value={vhfType} onChange={e => setVhfType(e.target.value)} style={{ width: '90%' }} />
              </td>
              <td>
                <input type="text" className="paper-input" value={vhfSerial} onChange={e => setVhfSerial(e.target.value)} style={{ width: '90%' }} />
              </td>
            </tr>
            <tr>
              <td>AIS Transponder</td>
              <td>
                <input type="text" className="paper-input" value={aisMfg} onChange={e => setAisMfg(e.target.value)} style={{ width: '90%' }} />
              </td>
              <td>
                <input type="text" className="paper-input" value={aisType} onChange={e => setAisType(e.target.value)} style={{ width: '90%' }} />
              </td>
              <td>
                <input type="text" className="paper-input" value={aisSerial} onChange={e => setAisSerial(e.target.value)} style={{ width: '90%' }} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* SAFETY EQUIPMENT / FIRE EXTINGUISHERS */}
        <div className="paper-section-title">SAFETY EQUIPMENT:</div>
        <p className="paper-paragraph">
          Safety equipment and Fire Fighting Appliances available on board generally examined. Operation verified to satisfaction.
        </p>
        <p className="paper-paragraph">
          <strong>Fire Fighting Equipment:</strong><br />
          Portable fire extinguishing equipment.
        </p>

        <table className="paper-table">
          <thead>
            <tr>
              <th>Location</th>
              <th>Nos</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Last Serviced date</th>
              <th>Serviced by</th>
            </tr>
          </thead>
          <tbody>
            {fireRows.map((row, idx) => (
              <tr key={idx}>
                <td>
                  <input type="text" className="paper-input" value={row.location} onChange={e => updateFireRow(idx, 'location', e.target.value)} style={{ width: '100px' }} />
                </td>
                <td>
                  <input type="text" className="paper-input" value={row.nos} onChange={e => updateFireRow(idx, 'nos', e.target.value)} style={{ width: '40px' }} />
                </td>
                <td>
                  <input type="text" className="paper-input" value={row.type} onChange={e => updateFireRow(idx, 'type', e.target.value)} style={{ width: '50px' }} />
                </td>
                <td>
                  <input type="text" className="paper-input" value={row.capacity} onChange={e => updateFireRow(idx, 'capacity', e.target.value)} style={{ width: '60px' }} />
                </td>
                <td>
                  <input type="text" className="paper-input" value={row.date} onChange={e => updateFireRow(idx, 'date', e.target.value)} style={{ width: '90px' }} />
                </td>
                <td>
                  <input type="text" className="paper-input" value={row.servicedBy} onChange={e => updateFireRow(idx, 'servicedBy', e.target.value)} style={{ width: '130px' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* LIFE SAVING EQUIPMENT */}
        <div className="paper-section-title">Life Saving Equipment:</div>
        <p className="paper-paragraph">
          Following lifesaving equipment available onboard.
        </p>
        <p className="paper-paragraph">
          <strong>Life Raft</strong><br />
          Number of Quantity: {' '}
          <input type="text" className="paper-input" value={lifeRaftDetails.quantity} onChange={e => setLifeRaftDetails(p => ({ ...p, quantity: e.target.value }))} style={{ width: '50px' }} /> Nos <br />
          Capacity: {' '}
          <input type="text" className="paper-input" value={lifeRaftDetails.capacity} onChange={e => setLifeRaftDetails(p => ({ ...p, capacity: e.target.value }))} style={{ width: '60px' }} /> Passengers <br />
          Manufacture: {' '}
          <input type="text" className="paper-input" value={lifeRaftDetails.manufacturer} onChange={e => setLifeRaftDetails(p => ({ ...p, manufacturer: e.target.value }))} style={{ width: '280px' }} /> <br />
          Type: {' '}
          <input type="text" className="paper-input" value={lifeRaftDetails.packType} onChange={e => setLifeRaftDetails(p => ({ ...p, packType: e.target.value }))} style={{ width: '80px' }} /> <br />
          Serial No: {' '}
          <input type="text" className="paper-input" value={lifeRaftDetails.serialNumber} onChange={e => setLifeRaftDetails(p => ({ ...p, serialNumber: e.target.value }))} style={{ width: '100px' }} /> <br />
          Last Inspection Date: {' '}
          <input type="text" className="paper-input" value={lifeRaftDetails.lastInspectionDate} onChange={e => setLifeRaftDetails(p => ({ ...p, lastInspectionDate: e.target.value }))} style={{ width: '90px' }} /> <br />
          Service Provider: {' '}
          <input type="text" className="paper-input" value={lifeRaftDetails.serviceProvider} onChange={e => setLifeRaftDetails(p => ({ ...p, serviceProvider: e.target.value }))} style={{ width: '180px' }} />
        </p>

        <p className="paper-paragraph">
          <strong>Life Buoys</strong><br />
          Complete in number (as per SCC 2025) and good condition. <br />
          Marked all in block letters with name and port of registry of ship.<br />
          Fitted with retro reflective materials.
        </p>

        <p className="paper-paragraph">
          <strong>Life Jackets</strong><br />
          When checked for proper stowage, a random examination of the condition of the life jackets gave{' '}
          <select
            className="paper-input"
            value={lifeJacketsCondition}
            onChange={e => setLifeJacketsCondition(e.target.value)}
          >
            <option value="satisfactory">satisfactory</option>
            <option value="unsatisfactory">unsatisfactory</option>
          </select>{' '}
          results.<br />
          Each jacket of international or vivid orange or comparable highly visible colour and fitted with rectro-reflective materials.<br />
          Life jackets light batteries within valid expiry date.
        </p>

        {/* PYROTECHNICS */}
        <p className="paper-paragraph"><strong>Pyrotechnics</strong></p>
        <table className="paper-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Nos</th>
              <th>Expiry date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Hand Flares</td>
              <td>
                <input
                  type="text"
                  className="paper-input"
                  value={flaresCount}
                  onChange={e => setFlaresCount(e.target.value)}
                  style={{ width: '50px', textAlign: 'center' }}
                />
              </td>
              <td>
                <input type="text" className="paper-input" value={flaresExpiry} onChange={e => setFlaresExpiry(e.target.value)} style={{ width: '100px' }} />
              </td>
            </tr>
            <tr>
              <td>Rocket Parachute</td>
              <td>
                <input
                  type="text"
                  className="paper-input"
                  value={parachuteCount}
                  onChange={e => setParachuteCount(e.target.value)}
                  style={{ width: '50px', textAlign: 'center' }}
                />
              </td>
              <td>
                <input type="text" className="paper-input" value={parachuteExpiry} onChange={e => setParachuteExpiry(e.target.value)} style={{ width: '100px' }} />
              </td>
            </tr>
            <tr>
              <td>Smoke Signal</td>
              <td>
                <input
                  type="text"
                  className="paper-input"
                  value={smokeCount}
                  onChange={e => setSmokeCount(e.target.value)}
                  style={{ width: '50px', textAlign: 'center' }}
                />
              </td>
              <td>
                <input type="text" className="paper-input" value={smokeExpiry} onChange={e => setSmokeExpiry(e.target.value)} style={{ width: '100px' }} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* MOORING EQUIPMENT */}
        <div className="paper-section-title">MOORING EQUIPMENT:</div>
        <p className="paper-paragraph">
          The condition of the anchoring and mooring equipment is satisfactory.<br />
          Mooring & Grounding tackle examined operational tested and found satisfactory.<br />
          Sea inlets and discharged arrangement as far as practicable.
        </p>

        {/* MACHINERY */}
        <div className="paper-section-title">MACHINERY:</div>
        <p className="paper-paragraph">
          <strong>Main Engine (</strong>
          <input
            type="number"
            className="paper-input"
            value={machinery.mainEngineCount}
            onChange={e => setMachinery(p => ({ ...p, mainEngineCount: Number(e.target.value) }))}
            style={{ width: '50px' }}
          />
          <strong>Nos)</strong><br />
          Type/ Model:{' '}
          <input
            type="text"
            className="paper-input"
            value={machinery.mainEngineModel}
            onChange={e => setMachinery(p => ({ ...p, mainEngineModel: e.target.value }))}
            style={{ width: '180px' }}
          />
          <br />
          Output:{' '}
          <input
            type="text"
            className="paper-input"
            value={machinery.mainEnginePower}
            onChange={e => setMachinery(p => ({ ...p, mainEnginePower: e.target.value }))}
            style={{ width: '180px' }}
          />
          <br />
          Fuel Type: {' '}
          <select
            className="paper-input"
            value={machinery.mainEngineFuelType}
            onChange={e => setMachinery(p => ({ ...p, mainEngineFuelType: e.target.value }))}
          >
            <option value="Diesel">Diesel</option>
            <option value="Petrol">Petrol</option>
            <option value="Other">Other</option>
          </select><br />
          Main engines safety alarms/ shutdowns and operation tested to{' '}
          <select
            className="paper-input"
            value={machinery.mainEngineAlarms}
            onChange={e => setMachinery(p => ({ ...p, mainEngineAlarms: e.target.value }))}
          >
            <option value="satisfaction">satisfaction</option>
            <option value="satisfactory">satisfactory</option>
            <option value="unsatisfactory">unsatisfactory</option>
          </select>
          .
        </p>

        <p className="paper-paragraph">
          <strong>Aux. (Gen.) Engine (</strong>
          <input
            type="number"
            className="paper-input"
            value={machinery.auxEngineCount}
            onChange={e => setMachinery(p => ({ ...p, auxEngineCount: Number(e.target.value) }))}
            style={{ width: '50px' }}
          />
          <strong>Nos)</strong><br />
          Model: {' '}
          <input
            type="text"
            className="paper-input"
            value={machinery.auxEngineModel}
            onChange={e => setMachinery(p => ({ ...p, auxEngineModel: e.target.value }))}
            placeholder="Caterpillar"
            style={{ width: '150px' }}
          /><br />
          Output: {' '}
          <input
            type="text"
            className="paper-input"
            value={machinery.auxEngineOutput}
            onChange={e => setMachinery(p => ({ ...p, auxEngineOutput: e.target.value }))}
            placeholder="17KW"
            style={{ width: '100px' }}
          /><br />
          Auxiliary engines safety alarms/ shutdowns and operation tested to{' '}
          <select
            className="paper-input"
            value={machinery.auxEngineAlarms}
            onChange={e => setMachinery(p => ({ ...p, auxEngineAlarms: e.target.value }))}
          >
            <option value="satisfaction">satisfaction</option>
            <option value="satisfactory">satisfactory</option>
            <option value="unsatisfactory">unsatisfactory</option>
          </select>
          .
        </p>

        <p className="paper-paragraph">
          <strong>Piping</strong><br />
          General examination carried in working condition and found{' '}
          <select
            className="paper-input"
            value={pipingCondition}
            onChange={e => setPipingCondition(e.target.value)}
          >
            <option value="satisfactory">satisfactory</option>
            <option value="unsatisfactory">unsatisfactory</option>
          </select>
          .
        </p>

        <div className="paper-section-title">ELECTRICAL SYSTEMS</div>
        <p className="paper-paragraph">
          The electrical equipment and cabling forming the main and emergency electrical installations have been generally examined under operation condition{' '}
          <input
            type="text"
            className="paper-input"
            value={electricalExamCondition}
            onChange={e => setElectricalExamCondition(e.target.value)}
            style={{ width: '220px' }}
          />
          .<br /><br />
          Power Generation: {' '}
          <input type="text" className="paper-input" value={machinery.powerGeneration} onChange={e => setMachinery(p => ({ ...p, powerGeneration: e.target.value }))} placeholder="6x200Ah,12V" style={{ width: '200px' }} />
         </p>

        {/* VESSEL CAPACITY PARAMETERS */}
        <div className="paper-section-title">VESSEL CAPACITY PARAMETERS:</div>
        <p className="paper-paragraph">
          Total Number of Persons onboard: {' '}
          <input
            type="number"
            className="paper-input"
            value={totalPersonsOnboard}
            onChange={e => setTotalPersonsOnboard(Number(e.target.value))}
            style={{ width: '80px' }}
          />
          persons. <br />
          Maximum Number of Passengers: {' '}
          <input
            type="number"
            className="paper-input"
            value={maxPassengers}
            onChange={e => setMaxPassengers(Number(e.target.value))}
            style={{ width: '80px' }}
          />
          passengers. <br />
          Minimum Manning of the Vessel: {' '}
          <input
            type="number"
            className="paper-input"
            value={minManning}
            onChange={e => setMinManning(Number(e.target.value))}
            style={{ width: '80px' }}
          />
          crew members.
        </p>

        {/* SIGNATURE SECTION */}
        <div style={{ marginTop: '50px', borderTop: '1px dashed #e2e8f0', paddingTop: '30px' }}>
          <p className="paper-paragraph">
            SIGNED: Date of issue: {' '}
            <input type="date" className="paper-input" value={signature.dateOfIssue} onChange={e => setSignature(p => ({ ...p, dateOfIssue: e.target.value }))} />
          </p>
          <div style={{ marginTop: '40px' }}>
            <p className="paper-paragraph" style={{ margin: 0 }}>....................................................................</p>
            <p className="paper-paragraph" style={{ margin: 0, fontWeight: 700 }}>
              <input type="text" className="paper-input" value={signature.surveyorName} onChange={e => setSignature(p => ({ ...p, surveyorName: e.target.value }))} placeholder="SURVEYOR NAME INITIALS" style={{ width: '250px', fontWeight: 800 }} />
            </p>
            <p className="paper-paragraph" style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
              <input type="text" className="paper-input" value={signature.surveyorTitle} onChange={e => setSignature(p => ({ ...p, surveyorTitle: e.target.value }))} style={{ width: '150px' }} />
            </p>
            <p className="paper-paragraph" style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
              <input type="text" className="paper-input" value={signature.certifyingBody} onChange={e => setSignature(p => ({ ...p, certifyingBody: e.target.value }))} style={{ width: '300px' }} />
            </p>
          </div>
        </div>

      </div>

      {/* Button Controls */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '50px' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => handleSave('Draft')}
          disabled={saving || status === 'Approved'}
          style={{ minWidth: '160px', marginBottom: 0 }}
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={handleFinalize}
          disabled={saving || status === 'Approved'}
          style={{ minWidth: '160px', marginBottom: 0, background: 'var(--green)', borderColor: 'var(--green)' }}
        >
          Finalize & Approve
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={handlePreviewPdf}
          disabled={downloading}
          style={{ minWidth: '180px', marginBottom: 0 }}
        >
          {downloading ? 'Downloading PDF...' : 'Preview & Print PDF'}
        </button>

        <Link to={`/${activeModule}/marine/first-entry/survey-report/edit/${id}`} style={{ textDecoration: 'none' }}>
          <button type="button" className="btn-secondary" style={{ minWidth: '120px', marginBottom: 0 }}>
            Back
          </button>
        </Link>
      </div>

    </div>
  );
}
