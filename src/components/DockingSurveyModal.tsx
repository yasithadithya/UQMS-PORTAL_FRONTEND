import React, { Fragment, useState, useEffect } from 'react';
import { Eye, FileDown, FileText, RefreshCw } from 'lucide-react';
import { Button, EmptyState, Field, FormGrid, Input, Modal, Textarea } from '@/ui';
import d from './DocumentFormModal.module.css';
import { toast } from 'react-toastify';
import { firstEntryService } from '@/api';
import type { ApiFirstEntrySurveyBooking } from '@/api';
import AdditionalRemarksModal from './AdditionalRemarksModal';

interface DockingSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: ApiFirstEntrySurveyBooking | null;
  surveyReportId: string;
  /** Pre-fills Client: the vessel's manager, as shown under Manager Details in the survey report. */
  defaultClient?: string;
  onSuccess?: () => void;
}

export default function DockingSurveyModal(props: DockingSurveyModalProps) {
  // Mount the dialog only while open, so its form state starts fresh each time and hooks never run conditionally.
  if (!props.isOpen || !props.booking) return null;
  return <DockingSurveyDialog {...props} booking={props.booking} />;
}

function DockingSurveyDialog({
  onClose,
  booking,
  surveyReportId,
  defaultClient = '',
  onSuccess
}: DockingSurveyModalProps & { booking: NonNullable<DockingSurveyModalProps['booking']> }) {

  // Derive default values from booking/vessel if available
  const vesselName = typeof booking.vesselId === 'object' && booking.vesselId ? (booking.vesselId as any).vesselName : booking.shipName;
  const vesselMaterial = typeof booking.vesselId === 'object' && booking.vesselId ? (booking.vesselId as any).material || 'Light Alloy' : 'Light Alloy';

  const [client, setClient] = useState(defaultClient);
  const [surveyLocation, setSurveyLocation] = useState(booking.portOfSurvey || 'DIKKOWITA FISHERIES HARBOUR');
  const [dockingPeriodStart, setDockingPeriodStart] = useState('');
  const [dockingPeriodEnd, setDockingPeriodEnd] = useState('');
  
  const [constructionMaterial, setConstructionMaterial] = useState(vesselMaterial);
  const [propellerDetails, setPropellerDetails] = useState('2 fixed pitch propellers');
  const [tailShaftBearings, setTailShaftBearings] = useState('water lubricated outer bearings');
  const [bracketBearing, setBracketBearing] = useState('A bracket bearing');
  
  const [thicknessMeasurementsBy, setThicknessMeasurementsBy] = useState('LANKA HIGH TECH MARINE (PVT) LTD');
  const [tmReportNo, setTmReportNo] = useState('');
  const [tmReportDate, setTmReportDate] = useState('');
  const [antifoulingPaintBy, setAntifoulingPaintBy] = useState('HEMPLE');
  const [coatingCondition, setCoatingCondition] = useState('Good');
  
  const [paintDetails, setPaintDetails] = useState([
    { coatNumber: '1', productName: 'Hempadur 15570', productNumber: '15570-12430', dft: '75', coatType: 'Full Coat' },
    { coatNumber: '2', productName: 'Hempadur Easy 47700', productNumber: '47700-11480', dft: '150', coatType: 'Full Coat' },
    { coatNumber: '3', productName: 'Hempadur Tiecoat 49183', productNumber: '49183-25150', dft: '100', coatType: 'Full Coat' },
    { coatNumber: '4', productName: 'Hempel’s Antifouling Olympic Flext +', productNumber: '7290W-60600', dft: '120', coatType: 'Full Coat' },
    { coatNumber: '5', productName: 'Hempel’s Antifouling Olympic Flext +', productNumber: '7290W-51110', dft: '120', coatType: 'Full Coat' },
  ]);
  
  const [plateRenewals, setPlateRenewals] = useState('- Centre, Frames 3–11, Four plates were cropped and renewed.\n- DP test and Vacuum test carried out and verified.');
  
  const [sternTubeClearancePortPS, setSternTubeClearancePortPS] = useState('1.50 mm');
  const [sternTubeClearancePortTB, setSternTubeClearancePortTB] = useState('1.19 mm');
  const [sternTubeClearanceStbdPS, setSternTubeClearanceStbdPS] = useState('1.40 mm');
  const [sternTubeClearanceStbdTB, setSternTubeClearanceStbdTB] = useState('0.70 mm');

  const [aBracketClearancePortPS, setABracketClearancePortPS] = useState('1.02 mm');
  const [aBracketClearancePortTB, setABracketClearancePortTB] = useState('1.31 mm');
  const [aBracketClearanceStbdPS, setABracketClearanceStbdPS] = useState('1.05 mm');
  const [aBracketClearanceStbdTB, setABracketClearanceStbdTB] = useState('0.95 mm');

  const [rudderBearingPortPS, setRudderBearingPortPS] = useState('0.70 mm');
  const [rudderBearingPortFA, setRudderBearingPortFA] = useState('0.59 mm');
  const [rudderBearingStbdPS, setRudderBearingStbdPS] = useState('0.80 mm');
  const [rudderBearingStbdFA, setRudderBearingStbdFA] = useState('0.80 mm');

  const [overboardValves, setOverboardValves] = useState('Overboard valves have been cleaned, overhauled and examined.');
  const [anodes, setAnodes] = useState('Fourteen (14) nos. of 1.8 kg block-type zinc alloy anodes were renewed at various hull positions and on the rudder.');

  const [additionalRemarks, setAdditionalRemarks] = useState('');
  const [remarksOpen, setRemarksOpen] = useState(false);

  // Preview & Action states
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Clean up Object URL on unmount/re-open
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const getPayload = () => {
    const vesselId = typeof booking.vesselId === 'object' && booking.vesselId ? (booking.vesselId as any)._id : String(booking.vesselId);

    return {
      vesselId,
      surveyReportId,
      surveyBookingId: booking._id,
      client,
      surveyLocation,
      dockingPeriodStart: dockingPeriodStart || null,
      dockingPeriodEnd: dockingPeriodEnd || null,
      constructionMaterial,
      propellerDetails,
      tailShaftBearings,
      bracketBearing,
      thicknessMeasurementsBy,
      tmReportNo,
      tmReportDate: tmReportDate || null,
      antifoulingPaintBy,
      coatingCondition,
      paintDetails,
      plateRenewals,
      sternTubeClearancePortPS, sternTubeClearancePortTB, sternTubeClearanceStbdPS, sternTubeClearanceStbdTB,
      aBracketClearancePortPS, aBracketClearancePortTB, aBracketClearanceStbdPS, aBracketClearanceStbdTB,
      rudderBearingPortPS, rudderBearingPortFA, rudderBearingStbdPS, rudderBearingStbdFA,
      overboardValves,
      anodes,
      additionalRemarks,
      dateOfIssue: new Date().toISOString()
    };
  };

  const handlePreview = async () => {
    try {
      setPreviewLoading(true);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      const payload = getPayload();
      const blob = await firstEntryService.getDockingSurveyPreviewBlob(payload);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      toast.success('Preview generated successfully.');
    } catch (err: any) {
      toast.error('Failed to generate preview: ' + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerate = async (remarks: string) => {
    try {
      setGenerating(true);
      const payload = { ...getPayload(), additionalRemarks: remarks };

      // 1. Create certificate in DB
      const res = await firstEntryService.createDockingSurveyCert(payload);

      if (res.success && res.data) {
        // Unsigned certificates are preview only, so nothing is downloaded here.
        toast.success(`Docking Survey Certificate ${res.data.certificateNumber} created. Open it to preview and sign; download is enabled after signing.`);

        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Failed to create Certificate.');
      }
    } catch (err: any) {
      toast.error('Error creating Certificate: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const updatePaintDetail = (index: number, field: string, value: string) => {
    const newDetails = [...paintDetails];
    (newDetails[index] as any)[field] = value;
    setPaintDetails(newDetails);
  };

  const pair = (
    label: string,
    rows: { side: string; a: [string, string, (v: string) => void]; b: [string, string, (v: string) => void] }[],
  ) => (
    <div>
      <p className={d.subLabel}>{label}</p>
      <div className={d.pairGrid}>
        {rows.map(r => (
          <Fragment key={r.side}>
            <span className={d.pairSide}>{r.side}</span>
            <Input aria-label={`${label} ${r.side} ${r.a[0]}`} placeholder={r.a[0]} value={r.a[1]} onChange={e => r.a[2](e.target.value)} />
            <Input aria-label={`${label} ${r.side} ${r.b[0]}`} placeholder={r.b[0]} value={r.b[1]} onChange={e => r.b[2](e.target.value)} />
          </Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Modal
        open
        onClose={onClose}
        dismissible={!generating}
        size="xl"
        flush
        className={d.dialog}
        title="Docking statement"
        description={`${vesselName || 'Vessel'} · record the survey findings and generate the docking survey certificate.`}
        footer={
          <>
            <Button onClick={onClose} disabled={generating}>Close</Button>
            <Button icon={<RefreshCw />} onClick={handlePreview} loading={previewLoading} disabled={generating}>
              {previewUrl ? 'Update preview' : 'Preview'}
            </Button>
            <Button variant="primary" icon={<FileDown />} onClick={() => setRemarksOpen(true)} loading={generating}>
              Save & generate PDF
            </Button>
          </>
        }
      >
        <div className={d.split}>
          <div className={d.formPane}>
            <section className={d.group}>
              <h3 className={d.groupTitle}>General</h3>
              <FormGrid columns={2}>
                <Field label="Client"><Input value={client} onChange={e => setClient(e.target.value)} /></Field>
                <Field label="Survey location"><Input value={surveyLocation} onChange={e => setSurveyLocation(e.target.value)} /></Field>
                <Field label="Docking start"><Input type="date" value={dockingPeriodStart} onChange={e => setDockingPeriodStart(e.target.value)} /></Field>
                <Field label="Docking end"><Input type="date" value={dockingPeriodEnd} onChange={e => setDockingPeriodEnd(e.target.value)} /></Field>
              </FormGrid>
            </section>

            <section className={d.group}>
              <h3 className={d.groupTitle}>Observations</h3>
              <div className={d.stack}>
                <Field label="Construction material"><Input value={constructionMaterial} onChange={e => setConstructionMaterial(e.target.value)} /></Field>
                <Field label="Propeller details"><Input value={propellerDetails} onChange={e => setPropellerDetails(e.target.value)} /></Field>
                <Field label="Tail shaft bearings"><Input value={tailShaftBearings} onChange={e => setTailShaftBearings(e.target.value)} /></Field>
                <Field label="Bracket bearing"><Input value={bracketBearing} onChange={e => setBracketBearing(e.target.value)} /></Field>
              </div>
            </section>

            <section className={d.group}>
              <h3 className={d.groupTitle}>Measurements & paint</h3>
              <FormGrid columns={2}>
                <Field label="Thickness measurements by" full><Input value={thicknessMeasurementsBy} onChange={e => setThicknessMeasurementsBy(e.target.value)} /></Field>
                <Field label="TM report no."><Input value={tmReportNo} onChange={e => setTmReportNo(e.target.value)} /></Field>
                <Field label="TM report date"><Input type="date" value={tmReportDate} onChange={e => setTmReportDate(e.target.value)} /></Field>
                <Field label="Antifouling paint by"><Input value={antifoulingPaintBy} onChange={e => setAntifoulingPaintBy(e.target.value)} /></Field>
                <Field label="Coating condition"><Input value={coatingCondition} onChange={e => setCoatingCondition(e.target.value)} /></Field>
              </FormGrid>

              <p className={`${d.subLabel} ${d.spaced}`}>Underwater paint details (5 coats)</p>
              <div className={d.gridTableWrap}>
                <table className={d.gridTable}>
                  <thead>
                    <tr>
                      <th className={d.num}>Coat</th>
                      <th>Product name</th>
                      <th>Product no.</th>
                      <th>DFT (µm)</th>
                      <th>Coat type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paintDetails.map((pd, idx) => (
                      <tr key={idx}>
                        <td className={d.num}>{pd.coatNumber}</td>
                        <td><input className={d.cellInput} aria-label={`Coat ${pd.coatNumber} product name`} value={pd.productName} onChange={e => updatePaintDetail(idx, 'productName', e.target.value)} /></td>
                        <td><input className={d.cellInput} aria-label={`Coat ${pd.coatNumber} product number`} value={pd.productNumber} onChange={e => updatePaintDetail(idx, 'productNumber', e.target.value)} /></td>
                        <td><input className={d.cellInput} aria-label={`Coat ${pd.coatNumber} DFT`} inputMode="decimal" value={pd.dft} onChange={e => updatePaintDetail(idx, 'dft', e.target.value)} /></td>
                        <td><input className={d.cellInput} aria-label={`Coat ${pd.coatNumber} coat type`} value={pd.coatType} onChange={e => updatePaintDetail(idx, 'coatType', e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={d.group}>
              <h3 className={d.groupTitle}>Clearances & additional</h3>
              <div className={d.stack}>
                <Field label="Underwater plate renewals"><Textarea rows={2} value={plateRenewals} onChange={e => setPlateRenewals(e.target.value)} /></Field>
                {pair('a) Stern tube bearing bush clearance', [
                  { side: 'Port', a: ['P-S', sternTubeClearancePortPS, setSternTubeClearancePortPS], b: ['T-B', sternTubeClearancePortTB, setSternTubeClearancePortTB] },
                  { side: 'Stbd', a: ['P-S', sternTubeClearanceStbdPS, setSternTubeClearanceStbdPS], b: ['T-B', sternTubeClearanceStbdTB, setSternTubeClearanceStbdTB] },
                ])}
                {pair("b) 'A' bracket clearance", [
                  { side: 'Port', a: ['P-S', aBracketClearancePortPS, setABracketClearancePortPS], b: ['T-B', aBracketClearancePortTB, setABracketClearancePortTB] },
                  { side: 'Stbd', a: ['P-S', aBracketClearanceStbdPS, setABracketClearanceStbdPS], b: ['T-B', aBracketClearanceStbdTB, setABracketClearanceStbdTB] },
                ])}
                {pair('c) Rudder bearing bush clearance', [
                  { side: 'Port', a: ['P-S', rudderBearingPortPS, setRudderBearingPortPS], b: ['F-A', rudderBearingPortFA, setRudderBearingPortFA] },
                  { side: 'Stbd', a: ['P-S', rudderBearingStbdPS, setRudderBearingStbdPS], b: ['F-A', rudderBearingStbdFA, setRudderBearingStbdFA] },
                ])}
                <Field label="Overboard valves"><Textarea rows={2} value={overboardValves} onChange={e => setOverboardValves(e.target.value)} /></Field>
                <Field label="Anodes"><Textarea rows={2} value={anodes} onChange={e => setAnodes(e.target.value)} /></Field>
              </div>
            </section>
          </div>

          <div className={d.previewPane}>
            {previewUrl ? (
              <iframe src={previewUrl} title="Docking survey certificate preview" className={d.preview} />
            ) : (
              <div className={d.previewEmpty}>
                <EmptyState
                  icon={<FileText />}
                  title="No preview yet"
                  description="Generate a preview to check the certificate layout before saving."
                  action={<Button icon={<Eye />} onClick={handlePreview} loading={previewLoading}>Generate preview</Button>}
                />
              </div>
            )}
          </div>
        </div>
      </Modal>
      <AdditionalRemarksModal
        isOpen={remarksOpen}
        initialValue={additionalRemarks}
        confirmText="Save & generate PDF"
        onCancel={() => setRemarksOpen(false)}
        onConfirm={(remarks) => {
          setAdditionalRemarks(remarks);
          setRemarksOpen(false);
          handleGenerate(remarks);
        }}
      />
    </>
  );
}
