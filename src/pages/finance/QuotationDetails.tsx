import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, CheckCircle2, Download, Eye, FilePlus2, Mail, Pencil, Send, Trash2, Undo2, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { quotationsService, type ApiQuotation } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { NotFound } from '@/components/StatusPage';
import { formatDate, formatDateTime } from '@/utils/date';
import { MODULE_KEYS } from '@/utils/permissions';
import {
  Badge, Button, ButtonLink, ConfirmDialog, ErrorState, Field, LoadingBlock, Menu, Modal, PageHeader, Section, StatusBadge, Textarea,
} from '@/ui';
import { QUOTATION_STATUS_LABELS, downloadPdf, formatMoney, formatRate, revisionLabel } from './financeFormat';
import { quotationsPath } from './financeTabs';
import s from './finance.module.css';

type PendingAction = 'sent' | 'accepted' | 'delete' | 'approve' | 'revoke' | null;

const userName = (ref: ApiQuotation['createdBy']) => (ref && typeof ref === 'object' ? ref.username || ref.email : undefined);

/** A quotation: its lines, status actions, PDF and every other revision for the same request. */
export default function QuotationDetails() {
  const navigate = useNavigate();
  const { id, module } = useParams<{ id: string; module?: string }>();
  const { can } = useAuth();
  const listPath = quotationsPath(`/${module || 'finance'}`);

  const [quotation, setQuotation] = useState<ApiQuotation | null>(null);
  const [revisions, setRevisions] = useState<ApiQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  const [pending, setPending] = useState<PendingAction>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [busy, setBusy] = useState(false);

  const [sending, setSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<'preview' | 'download' | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await quotationsService.getQuotation(id);
      setQuotation(res.data);
      const requestId = typeof res.data.request === 'string' ? res.data.request : res.data.request._id;
      const history = await quotationsService.getByRequest(requestId);
      setRevisions(history.data);
    } catch (err: any) {
      if (/not found/i.test(err.message || '')) setNotFound(true);
      else setError(err.message || 'Failed to load the quotation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  if (notFound) return <NotFound />;
  if (loading && !quotation) return <LoadingBlock label="Loading quotation…" />;
  if (error || !quotation) return <ErrorState title="Couldn't load the quotation" message={error} onRetry={load} />;

  const q = quotation;
  const isOpen = q.status === 'draft' || q.status === 'sent';
  const isLatest = revisions.length === 0 || revisions[revisions.length - 1]._id === q._id;
  const hasAccepted = revisions.some(r => r.status === 'accepted');

  const canUpdate = can(MODULE_KEYS.financeQuotations, 'update');
  const canApprove = can(MODULE_KEYS.financeQuotations, 'approve');
  const canCreate = can(MODULE_KEYS.financeQuotations, 'create');
  const canDelete = can(MODULE_KEYS.financeQuotations, 'delete');
  const canRevise = canCreate && isLatest && !hasAccepted && (q.status === 'sent' || q.status === 'rejected');

  const changeStatus = async (status: 'sent' | 'accepted' | 'rejected', reason?: string) => {
    setBusy(true);
    try {
      await quotationsService.updateStatus(q._id, status, reason);
      toast.success(
        status === 'accepted'
          ? `Quotation ${q.quotationNumber} accepted. First Entry for ${q.requestNumber} is now marked as quoted.`
          : `Quotation ${q.quotationNumber} marked ${QUOTATION_STATUS_LABELS[status].toLowerCase()}.`
      );
      setPending(null);
      setRejecting(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update the quotation.');
    } finally {
      setBusy(false);
    }
  };

  const submitReject = () => {
    if (!rejectReason.trim()) {
      setRejectError('Give the reason the client rejected it.');
      return;
    }
    changeStatus('rejected', rejectReason.trim());
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await quotationsService.deleteQuotation(q._id);
      toast.success(`Quotation ${q.quotationNumber} deleted.`);
      const previous = revisions.filter(r => r._id !== q._id).pop();
      navigate(previous ? `${listPath}/${previous._id}` : `/${module || 'finance'}?tab=quotations`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete the quotation.');
      setBusy(false);
    }
  };

  const openPdf = async (mode: 'preview' | 'download') => {
    setPdfLoading(mode);
    try {
      const blob = await quotationsService.getPdfBlob(q._id);
      if (mode === 'download') downloadPdf(blob, q.quotationNumber);
      else setPreviewUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load the quotation PDF.');
    } finally {
      setPdfLoading(null);
    }
  };

  const request = typeof q.request === 'object' ? q.request : null;
  const approval = q.approval;
  const extraColumns = q.extraColumns || [];
  // Shown as the table footer, and as a list under the table on phones where the footer scrolls out of view.
  const totals: { label: string; value: string; total?: boolean }[] = [
    ...(q.discountLkr && q.discount
      ? [
          { label: 'Subtotal', value: formatMoney(q.subtotalLkr ?? q.totalLkr + q.discountLkr) },
          {
            label: `Discount${q.discount.type === 'percent' ? ` (${formatRate(q.discount.value)}%)` : ''}${q.discount.description ? ` · ${q.discount.description}` : ''}`,
            value: `(${formatMoney(q.discountLkr)})`,
          },
        ]
      : []),
    { label: 'Total amount', value: `LKR ${formatMoney(q.totalLkr)}`, total: true },
  ];

  const approve = async () => {
    setBusy(true);
    try {
      const res = await quotationsService.approve(q._id);
      setQuotation({ ...q, ...res.data });
      toast.success(`Quotation ${q.quotationNumber} approved.`);
      setPending(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve the quotation.');
    } finally {
      setBusy(false);
    }
  };

  const revokeApproval = async () => {
    setBusy(true);
    try {
      const res = await quotationsService.revokeApproval(q._id);
      setQuotation({ ...q, ...res.data, approval: undefined });
      toast.success('Approval revoked.');
      setPending(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke the approval.');
    } finally {
      setBusy(false);
    }
  };

  const sendToClient = async () => {
    setBusy(true);
    try {
      const res = await quotationsService.sendToClient(q._id, emailMessage.trim() || undefined);
      toast.success(res.message || 'Quotation and RFS sent to the client.');
      setSending(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send the quotation.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-in">
      <PageHeader
        back={{ href: `/${module || 'finance'}?tab=quotations`, label: 'Quotations' }}
        title={q.quotationNumber}
        description={[q.vesselName, q.client.companyName].filter(Boolean).join(' · ')}
        meta={
          <span className={s.inline}>
            <StatusBadge status={q.status} label={QUOTATION_STATUS_LABELS[q.status]} />
            <Badge tone="neutral">{revisionLabel(q.revision)}</Badge>
          </span>
        }
        actions={
          <>
            <Button icon={<Eye />} onClick={() => openPdf('preview')} loading={pdfLoading === 'preview'}>Preview PDF</Button>
            {isOpen && canUpdate && (
              <Button icon={<Mail />} disabled={!approval} title={approval ? undefined : 'Approve the quotation before sending it'}
                onClick={() => { setEmailMessage(''); setSending(true); }}>Send to client</Button>
            )}
            {isOpen && canApprove && !approval && (
              <Button variant="primary" icon={<BadgeCheck />} onClick={() => setPending('approve')}>Approve</Button>
            )}
            {isOpen && canApprove && (
              <Button variant={approval ? 'primary' : undefined} icon={<CheckCircle2 />} onClick={() => setPending('accepted')}>Accept</Button>
            )}
            <Menu
              label="More quotation actions"
              items={[
                { label: 'Download PDF', icon: <Download />, onSelect: () => openPdf('download') },
                isOpen && canUpdate && { label: 'Edit', icon: <Pencil />, onSelect: () => navigate(`${listPath}/${q._id}/edit`) },
                isOpen && canApprove && !!approval && { label: 'Revoke approval', icon: <Undo2 />, onSelect: () => setPending('revoke') },
                q.status === 'draft' && canUpdate && { label: 'Mark as sent', icon: <Send />, onSelect: () => setPending('sent') },
                isOpen && canApprove && {
                  label: 'Client rejected…', icon: <XCircle />, onSelect: () => { setRejectReason(''); setRejectError(''); setRejecting(true); },
                },
                canRevise && { label: 'Create revision', icon: <FilePlus2 />, onSelect: () => navigate(`${listPath}/new?from=${q._id}`) },
                q.status === 'draft' && isLatest ? 'separator' : false,
                q.status === 'draft' && isLatest && {
                  label: 'Delete draft', icon: <Trash2 />, danger: true, disabled: !canDelete,
                  hint: canDelete ? undefined : 'Your role cannot delete quotations',
                  onSelect: () => setPending('delete'),
                },
              ]}
            />
          </>
        }
      />

      {q.status === 'rejected' && (
        <p className={s.notice} role="status">
          Rejected by the client{q.statusChangedAt ? ` on ${formatDate(q.statusChangedAt)}` : ''}: {q.statusReason || 'no reason recorded'}.
          {canRevise && <> <Link to={`${listPath}/new?from=${q._id}`}>Create a revision</Link> to send a new quotation.</>}
        </p>
      )}
      {q.status === 'superseded' && (
        <p className={s.notice} role="status">
          This quotation was replaced by a later revision.
        </p>
      )}

      <div className={s.detailLayout}>
        <div className={s.detailMain}>
          <Section title="Quotation">
            <dl className={s.detailGrid}>
              <div><dt>Request no.</dt><dd>{q.requestNumber}{request?.rfsDocNo ? ` (${request.rfsDocNo})` : ''}</dd></div>
              <div><dt>Job no.</dt><dd>{q.jobNumber || '—'}</dd></div>
              <div><dt>Date</dt><dd>{formatDate(q.quotationDate)}</dd></div>
              <div><dt>Conversion rate</dt><dd>LKR {formatRate(q.exchangeRate)} / USD</dd></div>
              <div><dt>Vessel code</dt><dd>{q.vesselCode || '—'}</dd></div>
              <div><dt>Emailed to client</dt><dd>{q.emailedAt ? `${formatDateTime(q.emailedAt)} · ${q.emailedTo}` : 'Not yet'}</dd></div>
              <div className={s.full}><dt>Title</dt><dd>{q.title}</dd></div>
              <div><dt>Client</dt><dd>{q.client.companyName}</dd></div>
              <div><dt>Contact</dt><dd>{[q.client.contactPerson, q.client.email].filter(Boolean).join(' · ') || '—'}</dd></div>
              <div className={s.full}><dt>Address</dt><dd>{q.client.address || '—'}</dd></div>
            </dl>
          </Section>

          <Section title="Line items" padding="none">
            <div className={s.tableScroll}>
              <table className={s.linesTable}>
                <thead>
                  <tr>
                    <th scope="col">SN</th>
                    <th scope="col">Description</th>
                    {extraColumns.map((c, ci) => <th scope="col" key={ci}>{c}</th>)}
                    <th scope="col" className={s.right}>Rate</th>
                    <th scope="col" className={s.right}>Qty</th>
                    <th scope="col" className={s.right}>Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {q.lineItems.map((li, i) => (
                    <tr key={i}>
                      <td>{String(i + 1).padStart(2, '0')}</td>
                      <td>{li.description}</td>
                      {extraColumns.map((_, ci) => <td key={ci}>{li.extra?.[ci] || '—'}</td>)}
                      <td className={s.right}>{li.currency} {formatRate(li.rate)}</td>
                      <td className={s.right}>{formatRate(li.quantity)}</td>
                      <td className={s.right}>{formatMoney(li.amountLkr)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {totals.map(t => (
                    <tr key={t.label}>
                      <th scope="row" colSpan={4 + extraColumns.length}>{t.label}</th>
                      <td className={s.right}>{t.total ? <strong>{t.value}</strong> : t.value}</td>
                    </tr>
                  ))}
                </tfoot>
              </table>
            </div>
            <dl className={s.linesTotals}>
              {totals.map(t => (
                <div key={t.label} className={t.total ? s.linesTotalsGrand : undefined}>
                  <dt>{t.label}</dt>
                  <dd>{t.value}</dd>
                </div>
              ))}
            </dl>
          </Section>

          {(q.notes.length > 0 || q.paymentTerms.length > 0) && (
            <Section title="Notes & payment terms">
              {q.notes.length > 0 && <ol className={s.readList}>{q.notes.map((n, i) => <li key={i}>{n}</li>)}</ol>}
              {q.paymentTerms.length > 0 && (
                <>
                  <h3 className={s.subheading}>Payment terms</h3>
                  <ul className={s.readList}>{q.paymentTerms.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </>
              )}
            </Section>
          )}
        </div>

        <aside className={s.detailSide}>
          <Section title="Revisions" description={`All quotations for ${q.requestNumber}${q.jobNumber ? ` / ${q.jobNumber}` : ''}.`}>
            <ol className={s.timeline}>
              {[...revisions].reverse().map(r => (
                <li key={r._id} className={r._id === q._id ? s.timelineCurrent : undefined}>
                  <div className={s.timelineHead}>
                    {r._id === q._id
                      ? <span className={s.mono}>{r.quotationNumber}</span>
                      : <Link to={`${listPath}/${r._id}`} className={s.mono}>{r.quotationNumber}</Link>}
                    <StatusBadge status={r.status} label={QUOTATION_STATUS_LABELS[r.status]} />
                  </div>
                  <span className={s.muted}>{formatDate(r.quotationDate)} · LKR {formatMoney(r.totalLkr)}</span>
                  {r.status === 'rejected' && r.statusReason && <span className={s.muted}>Reason: {r.statusReason}</span>}
                </li>
              ))}
            </ol>
            {canRevise && (
              <ButtonLink to={`${listPath}/new?from=${q._id}`} size="sm" icon={<FilePlus2 />}>Create revision</ButtonLink>
            )}
          </Section>

          <Section title="Approval" description="An approved quotation prints as system generated, so no signature is needed.">
            {approval ? (
              <p>
                <Badge tone="success">Approved</Badge>{' '}
                {approval.approvedByName} on {formatDateTime(approval.approvedAt)}
              </p>
            ) : (
              <p className={s.muted}>Not approved yet.</p>
            )}
            {q.preparedByName && (
              <p className={s.muted}>Prepared by {q.preparedByName}{q.preparedByDesignation ? `, ${q.preparedByDesignation}` : ''}.</p>
            )}
            {isOpen && canApprove && !approval && (
              <Button size="sm" icon={<BadgeCheck />} onClick={() => setPending('approve')}>Approve</Button>
            )}
          </Section>

          <Section title="Activity">
            <dl className={s.activity}>
              <div><dt>Created</dt><dd>{formatDateTime(q.createdAt)}{userName(q.createdBy) ? ` by ${userName(q.createdBy)}` : ''}</dd></div>
              <div><dt>Last updated</dt><dd>{formatDateTime(q.updatedAt)}{userName(q.updatedBy) ? ` by ${userName(q.updatedBy)}` : ''}</dd></div>
              {q.statusChangedAt && (
                <div><dt>Status changed</dt><dd>{formatDateTime(q.statusChangedAt)}{userName(q.statusChangedBy) ? ` by ${userName(q.statusChangedBy)}` : ''}</dd></div>
              )}
            </dl>
          </Section>
        </aside>
      </div>

      <Modal
        open={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        title={q.quotationNumber}
        size="xl"
        footer={
          <>
            <Button onClick={() => setPreviewUrl(null)}>Close</Button>
            <Button variant="primary" icon={<Download />} loading={pdfLoading === 'download'} onClick={() => openPdf('download')}>Download</Button>
          </>
        }
      >
        {previewUrl && <iframe className={s.preview} src={previewUrl} title={`Quotation ${q.quotationNumber}`} />}
      </Modal>

      <ConfirmDialog
        open={pending === 'approve'}
        title={`Approve ${q.quotationNumber}?`}
        message="The PDF will show it as approved and system generated, so it needs no signature. Editing the quotation later clears the approval."
        confirmText="Approve"
        loading={busy}
        onConfirm={approve}
        onCancel={() => setPending(null)}
      />

      <ConfirmDialog
        open={pending === 'revoke'}
        title="Revoke the approval?"
        message={`${q.quotationNumber} goes back to not approved, and the PDF no longer shows it as approved.`}
        confirmText="Revoke approval"
        destructive
        loading={busy}
        onConfirm={revokeApproval}
        onCancel={() => setPending(null)}
      />

      <Modal
        open={sending}
        onClose={() => !busy && setSending(false)}
        title="Send quotation and RFS to the client"
        description={`The Request for Survey and ${q.quotationNumber} are emailed as PDFs to the client email on the survey request.${q.status === 'draft' ? ' The quotation is then marked as sent.' : ''}`}
        size="md"
        footer={
          <>
            <Button onClick={() => setSending(false)} disabled={busy}>Cancel</Button>
            <Button variant="primary" icon={<Send />} loading={busy} onClick={sendToClient}>Send email</Button>
          </>
        }
      >
        <Field label="Message" hint="Optional · added to the email body">
          <Textarea rows={3} value={emailMessage} onChange={e => setEmailMessage(e.target.value)} />
        </Field>
      </Modal>

      <ConfirmDialog
        open={pending === 'accepted'}
        title={`Accept ${q.quotationNumber}?`}
        message={
          <>
            The client has accepted this quotation. Any other draft or sent quotation for {q.requestNumber} becomes superseded,
            and the request&apos;s First Entry is marked as quoted with this number. This can&apos;t be undone.
          </>
        }
        confirmText="Accept quotation"
        loading={busy}
        onConfirm={() => changeStatus('accepted')}
        onCancel={() => setPending(null)}
      />

      <ConfirmDialog
        open={pending === 'sent'}
        title="Mark as sent to the client?"
        message="The quotation stays editable until the client accepts or rejects it."
        confirmText="Mark as sent"
        loading={busy}
        onConfirm={() => changeStatus('sent')}
        onCancel={() => setPending(null)}
      />

      <ConfirmDialog
        open={pending === 'delete'}
        title="Delete this draft?"
        message={`${q.quotationNumber} will be deleted. This can't be undone.`}
        confirmText="Delete"
        destructive
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setPending(null)}
      />

      <Modal
        open={rejecting}
        onClose={() => !busy && setRejecting(false)}
        title="Client rejected the quotation"
        description="The quotation is kept on record with the reason. You can then create a revision."
        size="sm"
        footer={
          <>
            <Button onClick={() => setRejecting(false)} disabled={busy}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={submitReject}>Mark rejected</Button>
          </>
        }
      >
        <Field label="Reason" required error={rejectError}>
          <Textarea rows={3} value={rejectReason} placeholder="e.g. Client asked for a lower docking survey fee"
            onChange={e => { setRejectReason(e.target.value); setRejectError(''); }} />
        </Field>
      </Modal>
    </div>
  );
}
