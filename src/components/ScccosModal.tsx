import React, { useState, useEffect } from 'react';
import { AlertTriangle, Eye, FileDown, FileText, RefreshCw } from 'lucide-react';
import { Button, EmptyState, Field, Input, Modal, Textarea } from '@/ui';
import d from './DocumentFormModal.module.css';
import { toast } from 'react-toastify';
import { firstEntryService } from '@/api';
import { usersService } from '@/api/services/users.service';
import type { ApiFirstEntrySurveyBooking } from '@/api';
import { useAuth } from '@/context/AuthContext';
import AdditionalRemarksModal from './AdditionalRemarksModal';

interface ScccosModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: ApiFirstEntrySurveyBooking | null;
  surveyReportId: string;
  onSuccess?: () => void;
}

export default function ScccosModal(props: ScccosModalProps) {
  // Mount the dialog only while open, so its form state starts fresh each time and hooks never run conditionally.
  if (!props.isOpen || !props.booking) return null;
  return <ScccosDialog {...props} booking={props.booking} />;
}

function ScccosDialog({
  onClose,
  booking,
  surveyReportId,
  onSuccess
}: ScccosModalProps & { booking: NonNullable<ScccosModalProps['booking']> }) {

  const [typeOfSurvey, setTypeOfSurvey] = useState('SSC Initial Survey');
  const [nominatedDeparturePoint, setNominatedDeparturePoint] = useState(
    'Following respective Ports: Colombo, Galle, Hambantota, Trincomalee'
  );

  // The surveyor is always the logged-in user; the server sets it on the certificate, this is only for display.
  const { user } = useAuth();
  const [surveyorName, setSurveyorName] = useState(user?.username ?? '');
  useEffect(() => {
    if (!user?.id) return;
    usersService.getUserById(user.id)
      .then(res => {
        if (res.success && res.data) {
          setSurveyorName(res.data.nameWithInitials || res.data.fullName || res.data.username || '');
        }
      })
      .catch(() => { /* keep the username fallback */ });
  }, [user?.id]);

  // Findings statuses initialized to Satisfactory
  const [hull, setHull] = useState<'Satisfactory' | 'Not Satisfactory' | 'N/A'>('Satisfactory');
  const [machinery, setMachinery] = useState<'Satisfactory' | 'Not Satisfactory' | 'N/A'>('Satisfactory');
  const [lsa, setLsa] = useState<'Satisfactory' | 'Not Satisfactory' | 'N/A'>('Satisfactory');
  const [ffa, setFfa] = useState<'Satisfactory' | 'Not Satisfactory' | 'N/A'>('Satisfactory');
  const [navigation, setNavigation] = useState<'Satisfactory' | 'Not Satisfactory' | 'N/A'>('Satisfactory');
  const [radio, setRadio] = useState<'Satisfactory' | 'Not Satisfactory' | 'N/A'>('Satisfactory');

  const [additionalRemarks, setAdditionalRemarks] = useState('');
  const [remarksOpen, setRemarksOpen] = useState(false);

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

  const handleRequestGenerate = () => {
    if (!allStatusFixed) {
      toast.error('Cannot generate PDF: All statuses must be fixed (Satisfactory or N/A).');
      return;
    }
    setRemarksOpen(true);
  };

  const handleGenerate = async (remarks: string) => {
    try {
      setGenerating(true);
      const payload = { ...getPayload(), additionalRemarks: remarks };

      // 1. Create certificate in DB
      const res = await firstEntryService.createScccosCertificate(payload);

      if (res.success && res.data) {
        // Unsigned certificates are preview only, so nothing is downloaded here.
        toast.success(`Certificate ${res.data.certificateNumber} created. Open it from the Certificates tab to preview and sign; download is enabled after signing.`);

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

  type Finding = 'Satisfactory' | 'Not Satisfactory' | 'N/A';
  const FINDINGS: { label: string; value: Finding; set: (v: Finding) => void }[] = [
    { label: 'Hull', value: hull, set: setHull },
    { label: 'Machinery', value: machinery, set: setMachinery },
    { label: 'Life saving appliances (LSA)', value: lsa, set: setLsa },
    { label: 'Firefighting appliances (FFA)', value: ffa, set: setFfa },
    { label: 'Navigational equipment', value: navigation, set: setNavigation },
    { label: 'Radio installations', value: radio, set: setRadio },
  ];
  const OPTIONS: { value: Finding; label: string; tone: string }[] = [
    { value: 'Satisfactory', label: 'Satisfactory', tone: d.optGood },
    { value: 'Not Satisfactory', label: 'Not satisfactory', tone: d.optBad },
    { value: 'N/A', label: 'N/A', tone: d.optNa },
  ];

  const vesselName = typeof booking.vesselId === 'object' && booking.vesselId ? (booking.vesselId as any).vesselName : booking.shipName;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        dismissible={!generating}
        size="xl"
        flush
        className={d.dialog}
        title="Small Craft Code Certificate of Survey"
        description={`${vesselName || 'Vessel'} · record the survey findings and generate the SSC COS.`}
        footer={
          <>
            <Button onClick={onClose} disabled={generating}>Close</Button>
            <Button icon={<RefreshCw />} onClick={handlePreview} loading={previewLoading} disabled={generating}>
              {previewUrl ? 'Update preview' : 'Preview'}
            </Button>
            <Button
              variant="primary"
              icon={<FileDown />}
              onClick={handleRequestGenerate}
              loading={generating}
              disabled={!allStatusFixed}
              title={allStatusFixed ? undefined : 'Every finding must be Satisfactory or N/A first'}
            >
              Save & generate PDF
            </Button>
          </>
        }
      >
        <div className={d.split}>
          <div className={d.formPane}>
            <section className={d.group}>
              <h3 className={d.groupTitle}>Certificate details</h3>
              <div className={d.stack}>
                <Field label="Type of survey"><Input placeholder="e.g. SSC Initial Survey" value={typeOfSurvey} onChange={e => setTypeOfSurvey(e.target.value)} /></Field>
                <Field label="Surveyor" hint="The logged-in user is recorded as the surveyor.">
                  <Input value={surveyorName} readOnly />
                </Field>
                <Field label="Nominated departure point">
                  <Textarea rows={3} value={nominatedDeparturePoint} onChange={e => setNominatedDeparturePoint(e.target.value)} />
                </Field>
              </div>
            </section>

            <section className={d.group}>
              <h3 className={d.groupTitle}>Survey findings</h3>
              <ul className={d.findings}>
                {FINDINGS.map(f => (
                  <li key={f.label} className={d.finding}>
                    <span className={d.findingLabel}>{f.label}</span>
                    <div className={d.segmented} role="radiogroup" aria-label={f.label}>
                      {OPTIONS.map(o => {
                        const on = f.value === o.value;
                        return (
                          <button key={o.value} type="button" role="radio" aria-checked={on}
                            className={`${d.opt} ${on ? `${d.optOn} ${o.tone}` : ''}`} onClick={() => f.set(o.value)}>
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
              {!allStatusFixed && (
                <p className={d.warning} role="status">
                  <AlertTriangle aria-hidden="true" />
                  Every finding must be Satisfactory or N/A before the certificate can be generated.
                </p>
              )}
            </section>
          </div>

          <div className={d.previewPane}>
            {previewUrl ? (
              <iframe src={previewUrl} title="SSC certificate preview" className={d.preview} />
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
