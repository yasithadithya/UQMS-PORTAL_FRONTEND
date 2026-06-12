import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { firstEntryService } from '@/api';
import type { ApiFirstEntrySurveyBooking } from '@/api';

interface ScccosModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: ApiFirstEntrySurveyBooking | null;
  surveyReportId: string;
  onSuccess?: () => void;
}

export default function ScccosModal({
  isOpen,
  onClose,
  booking,
  surveyReportId,
  onSuccess
}: ScccosModalProps) {
  if (!isOpen || !booking) return null;

  const [typeOfSurvey, setTypeOfSurvey] = useState('SSC Initial Survey');
  const [nominatedDeparturePoint, setNominatedDeparturePoint] = useState(
    'Following respective Ports: Colombo, Galle, Hambantota, Trincomalee'
  );

  // Findings statuses initialized to Satisfactory
  const [hull, setHull] = useState<'Satisfactory' | 'Not Satisfactory' | 'N/A'>('Satisfactory');
  const [machinery, setMachinery] = useState<'Satisfactory' | 'Not Satisfactory' | 'N/A'>('Satisfactory');
  const [lsa, setLsa] = useState<'Satisfactory' | 'Not Satisfactory' | 'N/A'>('Satisfactory');
  const [ffa, setFfa] = useState<'Satisfactory' | 'Not Satisfactory' | 'N/A'>('Satisfactory');
  const [navigation, setNavigation] = useState<'Satisfactory' | 'Not Satisfactory' | 'N/A'>('Satisfactory');
  const [radio, setRadio] = useState<'Satisfactory' | 'Not Satisfactory' | 'N/A'>('Satisfactory');

  // Preview & Action states
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const allStatusFixed = [hull, machinery, lsa, ffa, navigation, radio].every(
    status => status === 'Satisfactory' || status === 'N/A'
  );

  // Clean up Object URL on unmount/re-open
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const getPayload = () => {
    const vesselId = typeof booking.vesselId === 'object' && booking.vesselId ? booking.vesselId._id : String(booking.vesselId);

    const surveyFindings = [
      { category: 'Hull', status: hull },
      { category: 'Machinery', status: machinery },
      { category: 'Life Saving Appliances (LSA)', status: lsa },
      { category: 'Firefighting Appliances (FFA)', status: ffa },
      { category: 'Navigational Equipment', status: navigation },
      { category: 'Radio Installations', status: radio }
    ];

    return {
      vesselId,
      surveyReportId,
      surveyBookingId: booking._id,
      surveyFindings,
      typeOfSurvey,
      nominatedDeparturePoint,
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
      const blob = await firstEntryService.getScccosPreviewBlob(payload);
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
    if (!allStatusFixed) {
      toast.error('Cannot generate PDF: All statuses must be fixed (Satisfactory or N/A).');
      return;
    }
    try {
      setGenerating(true);
      const payload = getPayload();

      // 1. Create certificate in DB
      const res = await firstEntryService.createScccosCertificate(payload);

      if (res.success && res.data) {
        toast.success('Certificate created successfully! Downloading PDF...');

        // 2. Fetch the final PDF blob
        const pdfBlob = await firstEntryService.getScccosFinalBlob(res.data._id);
        const url = URL.createObjectURL(pdfBlob);

        // 3. Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `scc_certificate_${res.data.certificateNumber.replace(/\s+/g, '_')}.pdf`;
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
        maxWidth: '1200px',
        width: '100%',
        height: '90vh',
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
              SMALL CRAFT CODE CERTIFICATE OF SURVEY (SSC COS)
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '4px 0 0 0', fontWeight: 500 }}>
              Specify survey findings and generate the statutory survey certificate.
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
          gridTemplateColumns: '450px 1fr',
          overflow: 'hidden'
        }}>
          {/* Left Panel: Form Inputs */}
          <div style={{
            padding: '24px',
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            background: 'var(--surface)'
          }}>
            {/* Survey Details */}
            <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', marginBottom: '16px' }}>
              Certificate Details
            </h4>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Type of Survey</label>
              <input
                type="text"
                className="form-input"
                value={typeOfSurvey}
                onChange={(e) => setTypeOfSurvey(e.target.value)}
                placeholder="e.g. SSC Initial Survey"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Nominated Departure Point</label>
              <textarea
                className="form-input"
                style={{ height: '70px', resize: 'none' }}
                value={nominatedDeparturePoint}
                onChange={(e) => setNominatedDeparturePoint(e.target.value)}
                placeholder="Departure Point details"
              />
            </div>

            <div style={{ borderTop: '1px solid var(--separator)', margin: '20px 0' }} />

            {/* Findings Status Section */}
            <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', marginBottom: '16px' }}>
              Survey Findings Status
            </h4>

            {/* Hull */}
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>Hull</span>
              <select className="form-input" style={{ width: '170px', padding: '6px 8px', height: 'auto', marginBottom: 0 }} value={hull} onChange={(e: any) => setHull(e.target.value)}>
                <option value="Satisfactory">Satisfactory</option>
                <option value="Not Satisfactory">Not Satisfactory</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            {/* Machinery */}
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>Machinery</span>
              <select className="form-input" style={{ width: '170px', padding: '6px 8px', height: 'auto', marginBottom: 0 }} value={machinery} onChange={(e: any) => setMachinery(e.target.value)}>
                <option value="Satisfactory">Satisfactory</option>
                <option value="Not Satisfactory">Not Satisfactory</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            {/* LSA */}
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>Life Saving Appliances (LSA)</span>
              <select className="form-input" style={{ width: '170px', padding: '6px 8px', height: 'auto', marginBottom: 0 }} value={lsa} onChange={(e: any) => setLsa(e.target.value)}>
                <option value="Satisfactory">Satisfactory</option>
                <option value="Not Satisfactory">Not Satisfactory</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            {/* FFA */}
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>Firefighting Appliances (FFA)</span>
              <select className="form-input" style={{ width: '170px', padding: '6px 8px', height: 'auto', marginBottom: 0 }} value={ffa} onChange={(e: any) => setFfa(e.target.value)}>
                <option value="Satisfactory">Satisfactory</option>
                <option value="Not Satisfactory">Not Satisfactory</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            {/* Navigation */}
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>Navigational Equipment</span>
              <select className="form-input" style={{ width: '170px', padding: '6px 8px', height: 'auto', marginBottom: 0 }} value={navigation} onChange={(e: any) => setNavigation(e.target.value)}>
                <option value="Satisfactory">Satisfactory</option>
                <option value="Not Satisfactory">Not Satisfactory</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            {/* Radio */}
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>Radio Installations</span>
              <select className="form-input" style={{ width: '170px', padding: '6px 8px', height: 'auto', marginBottom: 0 }} value={radio} onChange={(e: any) => setRadio(e.target.value)}>
                <option value="Satisfactory">Satisfactory</option>
                <option value="Not Satisfactory">Not Satisfactory</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            {/* Warning when findings are not fixed */}
            {!allStatusFixed && (
              <div style={{
                marginTop: '20px',
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                color: 'var(--red)',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.5'
              }}>
                <strong>⚠️ Verification Required:</strong>
                <div style={{ marginTop: '4px' }}>
                  All survey findings must be fixed/resolved (Satisfactory or N/A) before you can save and generate the certificate PDF.
                </div>
              </div>
            )}
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
                title="SCCCOS PDF Preview"
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
            disabled={generating || !allStatusFixed}
            style={{
              marginBottom: 0,
              padding: '10px 20px',
              borderRadius: '10px',
              opacity: allStatusFixed ? 1 : 0.5,
              cursor: allStatusFixed ? 'pointer' : 'not-allowed'
            }}
            title={!allStatusFixed ? 'Please resolve all findings status to generate the PDF' : ''}
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
