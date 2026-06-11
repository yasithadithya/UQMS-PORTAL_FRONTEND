/**
 * Project Date Formatting Standard: dd/mm/yyyy
 * All displayed dates in the application must be formatted using the utilities in this file
 * to guarantee they are rendered consistently in dd/mm/yyyy format.
 * Do not call toLocaleDateString() directly in components.
 */

const IST_TIME_ZONE = 'Asia/Kolkata';

const ddMmYyyyFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: IST_TIME_ZONE,
});

const ddMmYyyyHhMmFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: IST_TIME_ZONE,
});

export const formatDate = (value?: string | Date | null) => {
  if (!value) return '-';

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? '-' : ddMmYyyyFormatter.format(date);
};

export const formatDateTime = (value?: string | Date | null) => {
  if (!value) return '-';

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? '-' : ddMmYyyyHhMmFormatter.format(date);
};


