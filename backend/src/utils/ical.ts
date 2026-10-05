import ical from "ical-generator";
import { parseICS, type VEvent } from "node-ical";
import type { CalendarEvent, EventBody } from "../types.js";
import { parseEventBody, type ParseResult } from "./validators.js";
import { addDays, APP_TIMEZONE, localDateOf, zonedToInstant } from "./timezone.js";

const CALENDAR_NAME = "Agenda";

// Date calendaire -> Date à minuit UTC. ical-generator lit les parties UTC d'un
// Date pour les événements journée entière : le résultat ne dépend pas du
// fuseau du serveur.
const utcMidnight = (date: { year: number; month: number; day: number }): Date =>
  new Date(Date.UTC(date.year, date.month - 1, date.day));

// Export RFC 5545. Journée entière : DTEND est exclusif (lendemain du dernier jour),
// alors que notre `end` est le dernier instant du jour.
export const eventsToIcs = (events: CalendarEvent[], timeZone: string = APP_TIMEZONE): string => {
  const calendar = ical({ name: CALENDAR_NAME });

  for (const event of events) {
    if (event.allDay) {
      const first = localDateOf(new Date(event.start), timeZone);
      const last = localDateOf(new Date(event.end), timeZone);
      calendar.createEvent({
        id: event.id,
        summary: event.title,
        description: event.description,
        location: event.location,
        allDay: true,
        start: utcMidnight(first),
        end: utcMidnight(addDays(last, 1)),
        stamp: new Date(event.updatedAt),
      });
    } else {
      calendar.createEvent({
        id: event.id,
        summary: event.title,
        description: event.description,
        location: event.location,
        start: new Date(event.start),
        end: new Date(event.end),
        stamp: new Date(event.updatedAt),
      });
    }
  }

  return calendar.toString();
};

// node-ical renvoie une valeur texte soit brute, soit avec ses paramètres.
const textOf = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "val" in value && typeof value.val === "string") {
    return value.val;
  }
  return undefined;
};

// Champs bruts d'un VEVENT, avant validation (passés à parseEventBody).
const rawFieldsOf = (event: VEvent, timeZone: string): Record<string, unknown> => {
  const raw: Record<string, unknown> = {
    title: textOf(event.summary),
    description: textOf(event.description),
    location: textOf(event.location),
  };

  if (event.datetype === "date") {
    // node-ical construit une date journée entière à minuit en heure locale du
    // serveur : on relit les parties locales pour retrouver la date calendaire.
    if (event.start) {
      const first = { year: event.start.getFullYear(), month: event.start.getMonth() + 1, day: event.start.getDate() };
      raw.start = zonedToInstant(first.year, first.month, first.day, 0, 0, 0, timeZone).toISOString();
      raw.allDay = true;
      if (event.end) {
        // DTEND exclusif : le dernier jour est la veille.
        const exclusiveEnd = { year: event.end.getFullYear(), month: event.end.getMonth() + 1, day: event.end.getDate() };
        const last = addDays(exclusiveEnd, -1);
        raw.end = zonedToInstant(last.year, last.month, last.day, 23, 59, 59, timeZone).toISOString();
      } else {
        raw.end = zonedToInstant(first.year, first.month, first.day, 23, 59, 59, timeZone).toISOString();
      }
    }
  } else {
    raw.start = event.start?.toISOString();
    raw.end = (event.end ?? event.start)?.toISOString();
    raw.allDay = false;
  }

  return raw;
};

// Import RFC 5545 en tout-ou-rien : un seul événement invalide renvoie les erreurs
// sans rien créer. Les récurrences (RRULE) ne sont pas développées : seule
// l'occurrence de DTSTART est importée.
export const parseIcs = (text: string, timeZone: string = APP_TIMEZONE): ParseResult<EventBody[]> => {
  let components: ReturnType<typeof parseICS>;
  try {
    components = parseICS(text);
  } catch {
    return { ok: false, errors: ["Fichier .ics invalide : lecture impossible."] };
  }

  const events = Object.values(components).filter((c): c is VEvent => c?.type === "VEVENT");
  if (events.length === 0) {
    return { ok: false, errors: ["Aucun événement (VEVENT) trouvé dans le fichier .ics."] };
  }

  const bodies: EventBody[] = [];
  const errors: string[] = [];
  events.forEach((event, index) => {
    const raw = rawFieldsOf(event, timeZone);
    const result = parseEventBody(raw);
    if (result.ok) {
      bodies.push(result.value);
    } else {
      const label = typeof raw.title === "string" ? ` (« ${raw.title} »)` : "";
      errors.push(`Événement ${index + 1}${label} : ${result.errors.join(" ")}`);
    }
  });

  return errors.length ? { ok: false, errors } : { ok: true, value: bodies };
};

// Corps de la requête d'import : le parser texte d'Express ne fournit une chaîne
// que pour `text/calendar`.
export const parseIcsBody = (body: unknown): ParseResult<EventBody[]> => {
  if (typeof body !== "string") {
    return { ok: false, errors: ["Content-Type attendu : text/calendar."] };
  }
  return parseIcs(body);
};
