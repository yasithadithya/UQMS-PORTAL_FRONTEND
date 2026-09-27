/**
 * One place that decides which color a status gets, so the same word looks the same on every screen.
 *   success = finished / good, info = in progress / scheduled, warning = needs attention / waiting,
 *   danger = rejected / failed, neutral = inert (draft, N/A, not started).
 */
export type Tone = 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'accent';

const TONES: Record<string, Tone> = {
  // success
  active: 'success', approved: 'success', paid: 'success', completed: 'success', done: 'success',
  present: 'success', acknowledged: 'success', enrolled: 'success', success: 'success', signed: 'success',
  satisfactory: 'success', provided: 'success', 'cos generated': 'success', quoted: 'success', issued: 'success',
  accepted: 'success',

  // info
  submitted: 'info', scheduled: 'info', inprogress: 'info', 'in progress': 'info', onleave: 'info',
  halfday: 'info', new: 'info', open: 'info', print: 'info', modified: 'info', web: 'info',
  sent: 'info',

  // warning
  pending: 'warning', onprobation: 'warning', late: 'warning', important: 'warning', noshow: 'warning',
  'pending signature': 'warning', 'awaiting signature': 'warning', 'not quoted': 'warning', expiring: 'warning',

  // danger
  rejected: 'danger', reject: 'danger', terminated: 'danger', cancelled: 'danger', failed: 'danger',
  absent: 'danger', urgent: 'danger', 'not satisfactory': 'danger', 'not provided': 'danger', deleted: 'danger',
  expired: 'danger', overdue: 'danger',

  // neutral
  draft: 'neutral', closed: 'neutral', 'n/a': 'neutral', 'not applicable': 'neutral', notstarted: 'neutral',
  'not started': 'neutral', skipped: 'neutral', retained: 'neutral', attached: 'neutral',
  superseded: 'neutral',
};

export const toneForStatus = (status: string | null | undefined): Tone =>
  (status && TONES[status.trim().toLowerCase()]) || 'neutral';

/**
 * Turns code-style values into labels: "OnProbation" -> "On probation", "in_progress" -> "In progress", "print" -> "Print".
 * Values that are already written for people ("COS Generated", "N/A", "Not Satisfactory") are left as they are.
 */
export const humanizeStatus = (status: string | null | undefined): string => {
  if (!status) return '—';
  if (/\s|\//.test(status.trim()) || /[A-Z]{2}/.test(status)) return status.trim();
  const spaced = status
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
