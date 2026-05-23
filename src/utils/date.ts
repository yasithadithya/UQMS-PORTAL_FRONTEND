const IST_TIME_ZONE = 'Asia/Kolkata';

const ddMmYyyyFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: IST_TIME_ZONE,
});

export const formatDate = (value?: string | Date | null) => {
  if (!value) return '-';

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? '-' : ddMmYyyyFormatter.format(date);
};

