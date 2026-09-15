const TIMEZONE_OFFSETS = { 'America/Bogota': -5 };

const pad = (value) => String(value).padStart(2, '0');

const format = (date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
  `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;

/**
 * Wall-clock "now" at the database timezone, expressed as a UTC-based Date so
 * every arithmetic operation below stays free of the host machine's offset.
 */
const wallClockNow = (timezone) => {
  const offsetHours = TIMEZONE_OFFSETS[timezone] ?? 0;

  return new Date(Date.now() + offsetHours * 3600000);
};

const startOfDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addDays = (date, days) => new Date(date.getTime() + days * 86400000);

const startOfWeek = (date) => {
  const day = date.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  return addDays(startOfDay(date), -daysSinceMonday);
};

const startOfMonth = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const PRESET_LABELS = {
  today: 'hoy',
  yesterday: 'ayer',
  day_before_yesterday: 'anteayer',
  this_week: 'esta semana',
  last_week: 'la semana pasada',
  this_month: 'este mes',
  last_month: 'el mes pasado',
  this_year: 'en lo corrido del año',
  last_30_days: 'en los últimos 30 días',
};

/**
 * Resolves a preset into a half-open [from, to) range so the predicate stays
 * sargable: no TRUNC() wrapped around the indexed column.
 */
const resolvePreset = ({ preset, from, to, timezone }) => {
  const now = wallClockNow(timezone);
  const today = startOfDay(now);

  const ranges = {
    today: () => [today, addDays(today, 1)],
    yesterday: () => [addDays(today, -1), today],
    day_before_yesterday: () => [addDays(today, -2), addDays(today, -1)],
    this_week: () => [startOfWeek(now), addDays(today, 1)],
    last_week: () => [addDays(startOfWeek(now), -7), startOfWeek(now)],
    this_month: () => [startOfMonth(now), addDays(today, 1)],
    last_month: () => {
      const firstOfThisMonth = startOfMonth(now);
      const firstOfLastMonth = new Date(
        Date.UTC(firstOfThisMonth.getUTCFullYear(), firstOfThisMonth.getUTCMonth() - 1, 1),
      );

      return [firstOfLastMonth, firstOfThisMonth];
    },
    this_year: () => [new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), addDays(today, 1)],
    last_30_days: () => [addDays(today, -30), addDays(today, 1)],
  };

  if (preset === 'custom') {
    if (!from || !to) {
      return null;
    }

    return { from: `${from} 00:00:00`, to: `${to} 00:00:00`, label: `entre ${from} y ${to}` };
  }

  const resolver = ranges[preset];

  if (!resolver) {
    return null;
  }

  const [rangeFrom, rangeTo] = resolver();

  return { from: format(rangeFrom), to: format(rangeTo), label: PRESET_LABELS[preset] };
};

module.exports = { resolvePreset, wallClockNow, format, PRESET_LABELS };
