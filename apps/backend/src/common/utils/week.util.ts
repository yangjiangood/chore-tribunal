function getPartsInTimezone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  };
}

function getIsoWeekParts(date: Date) {
  const normalized = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = normalized.getUTCDay() || 7;

  normalized.setUTCDate(normalized.getUTCDate() + 4 - day);

  const isoYear = normalized.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(
    ((normalized.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  return {
    isoYear,
    week,
  };
}

export function getWeekIdForTimezone(date: Date, timeZone: string) {
  const parts = getPartsInTimezone(date, timeZone);
  const timezoneDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  );
  const { isoYear, week } = getIsoWeekParts(timezoneDate);

  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}
