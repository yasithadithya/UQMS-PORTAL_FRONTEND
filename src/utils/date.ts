/**
 * Project Date Formatting Standard: yyyy/mm/dd (24-hour clock)
 * All displayed dates in the application must be formatted using the utilities in this file
 * to guarantee they are rendered consistently in yyyy/mm/dd format.
 * Do not call toLocaleDateString() directly in components.
 */

const IST_TIME_ZONE = 'Asia/Kolkata';

// Intl has no locale that reliably yields yyyy/mm/dd, so the parts are assembled by hand.
const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: IST_TIME_ZONE,
});

type DateParts = { year: string; month: string; day: string; hour: string; minute: string };

const toParts = (value?: string | Date | null): DateParts | null => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const byType = new Map(partsFormatter.formatToParts(date).map((part) => [part.type, part.value]));

  return {
    year: byType.get('year') || '1970',
    month: byType.get('month') || '01',
    day: byType.get('day') || '01',
    // Some runtimes emit hour "24" for midnight when hour12 is false.
    hour: (byType.get('hour') || '00') === '24' ? '00' : byType.get('hour') || '00',
    minute: byType.get('minute') || '00',
  };
};

export const formatDate = (value?: string | Date | null) => {
  const parts = toParts(value);

  return parts ? `${parts.year}/${parts.month}/${parts.day}` : '-';
};

export const formatDateTime = (value?: string | Date | null) => {
  const parts = toParts(value);

  return parts ? `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}` : '-';
};

export const formatTime = (value?: string | Date | null) => {
  const parts = toParts(value);

  return parts ? `${parts.hour}:${parts.minute}` : '-';
};

/**
 * Build Date is a free-text field; older records were entered as DD/MM/YYYY or MM/YYYY.
 * Reorders them to YYYY/MM/DD only when the 4-digit year is clearly in the last segment.
 */
export const normalizeBuildDateText = (value?: string | null): string => {
  if (!value) return '';

  const segments = value.split('/');
  if (segments.length < 2) return value;

  const isYear = (segment: string) => /^\d{4}$/.test(segment);

  // Already in the new order, or no identifiable year to reorder around.
  if (isYear(segments[0]) || !isYear(segments[segments.length - 1])) return value;

  return [...segments].reverse().join('/');
};
