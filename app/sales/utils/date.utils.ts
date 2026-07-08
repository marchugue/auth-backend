/** Parse YYYY-MM-DD into a UTC date (midnight). */
export const parseIsoDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

export const formatIsoDate = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
};

export const getMonthYearFromDate = (date: Date): { month: number; year: number } => {
  return {
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
};

export const dateRangeForIsoDay = (isoDate: string): { start: Date; end: Date } => {
  const start = parseIsoDate(isoDate);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};
