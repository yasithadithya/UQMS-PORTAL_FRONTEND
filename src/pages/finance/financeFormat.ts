import type { FeeCategory, FeeCurrency, QuotationStatus } from '@/api';

/** 2-decimal amount with thousands separators, e.g. 378,442.20. */
export const formatMoney = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

/** Rates without trailing zeros, e.g. 450 or 328.13. */
export const formatRate = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—';

export const formatCurrency = (value: number | null | undefined, currency: FeeCurrency): string =>
  `${currency} ${formatMoney(value)}`;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** A line's amount in LKR, matching the backend: USD lines are converted with the exchange rate. */
export const lineAmountLkr = (rate: number, quantity: number, currency: FeeCurrency, exchangeRate: number): number => {
  if (!Number.isFinite(rate) || !Number.isFinite(quantity)) return 0;
  return round2(rate * quantity * (currency === 'USD' ? (Number.isFinite(exchangeRate) ? exchangeRate : 0) : 1));
};

export const FEE_CATEGORY_LABELS: Record<FeeCategory, string> = {
  survey: 'Survey fees',
  additional: 'Additional charges',
  transport: 'Transport',
};

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  superseded: 'Superseded',
};

export const revisionLabel = (revision: number) => (revision === 0 ? 'Original' : `Revision ${revision}`);

export const DEFAULT_QUOTATION_NOTES = [
  'As per the client’s request, transportation, port formalities, accommodation and meals shall be provided by the client during the survey period.',
  'Any additional visits (including deficiency/repair verification, re-visits arising due to inadequate completion, or surveys cancelled at site) will be charged at USD 150 per visit.',
  'Any other scope apart from the above will be quoted separately.',
];

export const DEFAULT_PAYMENT_TERMS = [
  '50% advance payment shall be made upon confirmation of the survey and prior to survey attendance.',
  'The remaining 50% of the total payment shall be made prior to the issuance of the final deliverables.',
];

/** Saves a PDF blob under the quotation number (slashes aren't allowed in file names). */
export const downloadPdf = (blob: Blob, quotationNumber: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${quotationNumber.replace(/[^\w-]+/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
