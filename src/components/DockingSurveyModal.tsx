import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { firstEntryService } from '@/api';
import type { ApiFirstEntrySurveyBooking } from '@/api';

interface DockingSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: ApiFirstEntrySurveyBooking | null;
  surveyReportId: string;
  onSuccess?: () => void;
}

export default function DockingSurveyModal({
  isOpen,
  onClose,
  booking,
  surveyReportId,
  onSuccess
}: DockingSurveyModalProps) {
  if (!isOpen || !booking) return null;

  // Derive default values from booking/vessel if available
  const vesselName = typeof booking.vesselId === 'object' && booking.vesselId ? (booking.vesselId as any).vesselName : booking.shipName;
  const vesselMaterial = typeof booking.vesselId === 'object' && booking.vesselId ? (booking.vesselId as any).material || 'Light Alloy' : 'Light Alloy';

  const [client, setClient] = useState('DOLPHINE MARINE COLOMBO (PVT) LTD (MANAGERS)');
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

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const payload = getPayload();

      // 1. Create certificate in DB
      const res = await firstEntryService.createDockingSurveyCert(payload);

      if (res.success && res.data) {
        toast.success('Docking Survey Certificate created successfully! Downloading PDF...');

        // 2. Fetch the final PDF blob
        const pdfBlob = await firstEntryService.getDockingSurveyFinalBlob(res.data._id);
        const url = URL.createObjectURL(pdfBlob);

        // 3. Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `docking_survey_${res.data.certificateNumber.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

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

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '24px',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div className="card animate-in" style={{
        maxWidth: '1300px',
        width: '100%',
        height: '95vh',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: 0
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)'
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--label)', margin: 0, letterSpacing: '-0.02em' }}>
              DOCKING STATEMENT
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '4px 0 0 0', fontWeight: 500 }}>
              Specify survey findings and generate the docking survey certificate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'var(--muted)',
              cursor: 'pointer',
              lineHeight: '1',
              padding: '4px'
            }}
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '550px 1fr',
          overflow: 'hidden'
        }}>
          {/* Left Panel: Form Inputs */}
          <div style={{
            padding: '24px',
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            background: 'var(--surface)'
          }}>
            {/* Meta Details */}
            <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', marginBottom: '16px' }}>
              General Information
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Client</label>
                <input type="text" className="form-input" value={client} onChange={(e) => setClient(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Survey Location</label>
                <input type="text" className="form-input" value={surveyLocation} onChange={(e) => setSurveyLocation(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Docking Start Date</label>
                <input type="date" className="form-input" value={dockingPeriodStart} onChange={(e) => setDockingPeriodStart(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Docking End Date</label>
                <input type="date" className="form-input" value={dockingPeriodEnd} onChange={(e) => setDockingPeriodEnd(e.target.value)} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--separator)', margin: '20px 0' }} />

            {/* Findings Details */}
            <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', marginBottom: '16px' }}>
              Observations
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Construction Material</label>
                <input type="text" className="form-input" value={constructionMaterial} onChange={(e) => setConstructionMaterial(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Propeller Details</label>
                <input type="text" className="form-input" value={propellerDetails} onChange={(e) => setPropellerDetails(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Tail Shaft Bearings</label>
                <input type="text" className="form-input" value={tailShaftBearings} onChange={(e) => setTailShaftBearings(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Bracket Bearing</label>
                <input type="text" className="form-input" value={bracketBearing} onChange={(e) => setBracketBearing(e.target.value)} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--separator)', margin: '20px 0' }} />

            <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', marginBottom: '16px' }}>
              Measurements & Paint
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Thickness Measurements By</label>
                <input type="text" className="form-input" value={thicknessMeasurementsBy} onChange={(e) => setThicknessMeasurementsBy(e.target.value)} />
              </div>
              <div>
                <label className="form-label">TM Report No.</label>
                <input type="text" className="form-input" value={tmReportNo} onChange={(e) => setTmReportNo(e.target.value)} />
              </div>
              <div>
                <label className="form-label">TM Report Date</label>
                <input type="date" className="form-input" value={tmReportDate} onChange={(e) => setTmReportDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Antifouling Paint By</label>
                <input type="text" className="form-input" value={antifoulingPaintBy} onChange={(e) => setAntifoulingPaintBy(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Coating Condition</label>
                <input type="text" className="form-input" value={coatingCondition} onChange={(e) => setCoatingCondition(e.target.value)} />
              </div>
            </div>

            <label className="form-label">Paint Details of Under Water (5 Layers)</label>
            <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '4px', border: '1px solid var(--border)', width: '30px' }}>Coat</th>
                    <th style={{ padding: '4px', border: '1px solid var(--border)' }}>Product Name</th>
                    <th style={{ padding: '4px', border: '1px solid var(--border)' }}>Product Number</th>
                    <th style={{ padding: '4px', border: '1px solid var(--border)', width: '50px' }}>DFT (µm)</th>
                    <th style={{ padding: '4px', border: '1px solid var(--border)' }}>Coat Type</th>
                  </tr>
                </thead>
                <tbody>
                  {paintDetails.map((pd, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '2px', border: '1px solid var(--border)', textAlign: 'center' }}>{pd.coatNumber}</td>
                      <td style={{ padding: '2px', border: '1px solid var(--border)' }}><input type="text" style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none' }} value={pd.productName} onChange={(e) => updatePaintDetail(idx, 'productName', e.target.value)} /></td>
                      <td style={{ padding: '2px', border: '1px solid var(--border)' }}><input type="text" style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none' }} value={pd.productNumber} onChange={(e) => updatePaintDetail(idx, 'productNumber', e.target.value)} /></td>
                      <td style={{ padding: '2px', border: '1px solid var(--border)' }}><input type="text" style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none' }} value={pd.dft} onChange={(e) => updatePaintDetail(idx, 'dft', e.target.value)} /></td>
                      <td style={{ padding: '2px', border: '1px solid var(--border)' }}><input type="text" style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none' }} value={pd.coatType} onChange={(e) => updatePaintDetail(idx, 'coatType', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px solid var(--separator)', margin: '20px 0' }} />

            <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', marginBottom: '16px' }}>
              Clearances & Additional
            </h4>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Under Water Plate Renewals</label>
              <textarea className="form-input" style={{ height: '60px', resize: 'vertical' }} value={plateRenewals} onChange={(e) => setPlateRenewals(e.target.value)} />
            </div>

            <label className="form-label">a) Stern Tube Bearing Bush Clearance</label>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px' }}>Port</span>
              <input type="text" className="form-input" placeholder="P-S" value={sternTubeClearancePortPS} onChange={(e) => setSternTubeClearancePortPS(e.target.value)} />
              <input type="text" className="form-input" placeholder="T-B" value={sternTubeClearancePortTB} onChange={(e) => setSternTubeClearancePortTB(e.target.value)} />
              <span style={{ fontSize: '12px' }}>Stbd</span>
              <input type="text" className="form-input" placeholder="P-S" value={sternTubeClearanceStbdPS} onChange={(e) => setSternTubeClearanceStbdPS(e.target.value)} />
              <input type="text" className="form-input" placeholder="T-B" value={sternTubeClearanceStbdTB} onChange={(e) => setSternTubeClearanceStbdTB(e.target.value)} />
            </div>

            <label className="form-label">b) 'A' Bracket Clearance</label>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px' }}>Port</span>
              <input type="text" className="form-input" placeholder="P-S" value={aBracketClearancePortPS} onChange={(e) => setABracketClearancePortPS(e.target.value)} />
              <input type="text" className="form-input" placeholder="T-B" value={aBracketClearancePortTB} onChange={(e) => setABracketClearancePortTB(e.target.value)} />
              <span style={{ fontSize: '12px' }}>Stbd</span>
              <input type="text" className="form-input" placeholder="P-S" value={aBracketClearanceStbdPS} onChange={(e) => setABracketClearanceStbdPS(e.target.value)} />
              <input type="text" className="form-input" placeholder="T-B" value={aBracketClearanceStbdTB} onChange={(e) => setABracketClearanceStbdTB(e.target.value)} />
            </div>

            <label className="form-label">c) Rudder Bearing Bush Clearance</label>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px' }}>Port</span>
              <input type="text" className="form-input" placeholder="P-S" value={rudderBearingPortPS} onChange={(e) => setRudderBearingPortPS(e.target.value)} />
              <input type="text" className="form-input" placeholder="F-A" value={rudderBearingPortFA} onChange={(e) => setRudderBearingPortFA(e.target.value)} />
              <span style={{ fontSize: '12px' }}>Stbd</span>
              <input type="text" className="form-input" placeholder="P-S" value={rudderBearingStbdPS} onChange={(e) => setRudderBearingStbdPS(e.target.value)} />
              <input type="text" className="form-input" placeholder="F-A" value={rudderBearingStbdFA} onChange={(e) => setRudderBearingStbdFA(e.target.value)} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Overboard Valves</label>
              <textarea className="form-input" style={{ height: '50px', resize: 'vertical' }} value={overboardValves} onChange={(e) => setOverboardValves(e.target.value)} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Anodes</label>
              <textarea className="form-input" style={{ height: '50px', resize: 'vertical' }} value={anodes} onChange={(e) => setAnodes(e.target.value)} />
            </div>
            
          </div>

          {/* Right Panel: PDF Preview */}
          <div style={{
            background: 'var(--bg-subtle)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {previewUrl ? (
              <iframe
                src={previewUrl}
                title="Docking Survey PDF Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
              />
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted)',
                padding: '40px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📄</div>
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                  No Preview Generated
                </h4>
                <p style={{ fontSize: '13px', maxWidth: '320px', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                  Click "Generate Preview" to review the PDF layout before finalizing the certificate.
                </p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePreview}
                  disabled={previewLoading}
                  style={{ minWidth: '150px' }}
                >
                  {previewLoading ? 'Loading...' : 'Generate Preview'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)'
        }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={generating}
            style={{ marginBottom: 0, padding: '10px 20px', borderRadius: '10px' }}
          >
            Close
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handlePreview}
            disabled={previewLoading || generating}
            style={{ marginBottom: 0, padding: '10px 20px', borderRadius: '10px', color: 'var(--primary)', borderColor: 'rgba(59, 130, 246, 0.3)' }}
          >
            {previewLoading ? 'Loading Preview...' : 'Update Preview'}
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleGenerate}
            disabled={generating}
            style={{
              marginBottom: 0,
              padding: '10px 20px',
              borderRadius: '10px',
            }}
          >
            {generating ? 'Generating PDF...' : 'Save & Generate PDF'}
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}} />
    </div>
  );
}
