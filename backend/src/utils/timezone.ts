// Conversions entre instants (UTC) et dates calendaires dans un fuseau donné.
// Les événements « toute la journée » sont des dates, pas des instants : leur
// début et leur fin dépendent du fuseau de l'agenda, pas de celui du serveur.

// Fuseau de l'agenda, indépendant du fuseau du serveur (Render est en UTC).
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Europe/Paris";

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const formatters = new Map<string, Intl.DateTimeFormat>();

const zonedParts = (date: Date, timeZone: string): ZonedParts => {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, formatter);
  }
  const values: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
};

// Décalage (ms) du fuseau par rapport à UTC à l'instant donné, à la seconde près.
const offsetMs = (date: Date, timeZone: string): number => {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
};

// Instant UTC correspondant à une date/heure locale du fuseau donné.
export const zonedToInstant = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date => {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstOffset = offsetMs(new Date(guess), timeZone);
  const candidate = guess - firstOffset;
  // Un second passage corrige les bascules d'heure (heure d'été / hiver).
  const secondOffset = offsetMs(new Date(candidate), timeZone);
  return new Date(secondOffset === firstOffset ? candidate : guess - secondOffset);
};

// Date calendaire (année, mois 1-12, jour) d'un instant, vue dans le fuseau donné.
export const localDateOf = (date: Date, timeZone: string): { year: number; month: number; day: number } => {
  const { year, month, day } = zonedParts(date, timeZone);
  return { year, month, day };
};

// Ajoute des jours à une date calendaire (arithmétique sur calendrier grégorien, sans fuseau).
export const addDays = (
  date: { year: number; month: number; day: number },
  days: number
): { year: number; month: number; day: number } => {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
};
