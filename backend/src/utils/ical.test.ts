import { describe, it, expect, afterEach } from "vitest";
import { eventsToIcs, parseIcs } from "./ical.js";
import { zonedToInstant } from "./timezone.js";
import type { CalendarEvent } from "../types.js";

const base = {
  createdAt: "2026-08-01T08:00:00.000Z",
  updatedAt: "2026-08-01T08:00:00.000Z",
  category: "travail" as const,
};

const timed: CalendarEvent = {
  ...base,
  id: "11111111-1111-4111-8111-111111111111",
  title: "Réunion",
  description: "Point hebdo",
  location: "Salle B",
  start: "2026-08-28T08:00:00.000Z",
  end: "2026-08-28T09:00:00.000Z",
  allDay: false,
};

// Journée entière du 28 au 29 août, Paris : 28/08 00:00 -> 29/08 23:59:59 (heure de Paris).
const allDay: CalendarEvent = {
  ...base,
  id: "22222222-2222-4222-8222-222222222222",
  title: "Congés",
  start: "2026-08-27T22:00:00.000Z",
  end: "2026-08-29T21:59:59.000Z",
  allDay: true,
};

const TZ = "Europe/Paris";
const originalTz = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTz;
});

describe("zonedToInstant", () => {
  it("applique l'heure d'hiver et d'été du fuseau donné", () => {
    expect(zonedToInstant(2026, 1, 15, 10, 0, 0, TZ).toISOString()).toBe("2026-01-15T09:00:00.000Z");
    expect(zonedToInstant(2026, 7, 15, 10, 0, 0, TZ).toISOString()).toBe("2026-07-15T08:00:00.000Z");
  });
});

describe("eventsToIcs", () => {
  it("exporte un événement horaire en UTC", () => {
    const ics = eventsToIcs([timed], TZ);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART:20260828T080000Z");
    expect(ics).toContain("DTEND:20260828T090000Z");
    expect(ics).toContain("SUMMARY:Réunion");
  });

  it("exporte une journée entière en dates, DTEND exclusif", () => {
    const ics = eventsToIcs([allDay], TZ);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260828");
    expect(ics).toContain("DTEND;VALUE=DATE:20260830");
  });
});

describe("parseIcs", () => {
  it("relit ce que eventsToIcs produit (aller-retour)", () => {
    const result = parseIcs(eventsToIcs([timed, allDay], TZ), TZ);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([
      {
        title: "Réunion",
        description: "Point hebdo",
        location: "Salle B",
        start: "2026-08-28T08:00:00.000Z",
        end: "2026-08-28T09:00:00.000Z",
        allDay: false,
      },
      {
        title: "Congés",
        start: "2026-08-27T22:00:00.000Z",
        end: "2026-08-29T21:59:59.000Z",
        allDay: true,
      },
    ]);
  });

  it("donne le même résultat quel que soit le fuseau du serveur", () => {
    const ics = eventsToIcs([allDay], TZ);
    const expected = parseIcs(ics, TZ);
    for (const serverTz of ["America/New_York", "Pacific/Kiritimati", "UTC"]) {
      process.env.TZ = serverTz;
      expect(parseIcs(ics, TZ)).toEqual(expected);
    }
  });

  it("renvoie les erreurs de validation sans rien importer", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "UID:ok",
      "DTSTAMP:20260101T000000Z",
      "DTSTART:20260828T080000Z",
      "DTEND:20260828T090000Z",
      "SUMMARY:Valide",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:sans-titre",
      "DTSTAMP:20260101T000000Z",
      "DTSTART:20260828T080000Z",
      "DTEND:20260828T090000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const result = parseIcs(ics, TZ);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(['Événement 2 : Le champ "title" est requis.']);
  });

  it("refuse un fichier sans VEVENT", () => {
    const result = parseIcs("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR", TZ);
    expect(result).toEqual({ ok: false, errors: ["Aucun événement (VEVENT) trouvé dans le fichier .ics."] });
  });
});

describe("parseIcs — cas limites", () => {
  const wrap = (...lines: string[]) => ["BEGIN:VCALENDAR", "VERSION:2.0", ...lines, "END:VCALENDAR"].join("\r\n");
  const vevent = (...lines: string[]) =>
    ["BEGIN:VEVENT", "UID:u", "DTSTAMP:20260101T000000Z", ...lines, "END:VEVENT"];

  it("utilise DTSTART comme fin quand DTEND est absent (horaire)", () => {
    const result = parseIcs(wrap(...vevent("DTSTART:20260828T080000Z", "SUMMARY:Sans fin")), TZ);
    expect(result).toEqual({
      ok: true,
      value: [
        { title: "Sans fin", start: "2026-08-28T08:00:00.000Z", end: "2026-08-28T08:00:00.000Z", allDay: false },
      ],
    });
  });

  it("une journée entière sans DTEND dure le jour de DTSTART", () => {
    const result = parseIcs(wrap(...vevent("DTSTART;VALUE=DATE:20260828", "SUMMARY:Un jour")), TZ);
    expect(result).toEqual({
      ok: true,
      value: [
        { title: "Un jour", start: "2026-08-27T22:00:00.000Z", end: "2026-08-28T21:59:59.000Z", allDay: true },
      ],
    });
  });

  it("rejette un événement sans DTSTART", () => {
    const result = parseIcs(wrap(...vevent("SUMMARY:Sans début")), TZ);
    expect(result).toEqual({
      ok: false,
      errors: ['Événement 1 (« Sans début ») : Le champ "start" est requis. Le champ "end" est requis.'],
    });
  });

  it("ignore les événements annulés", () => {
    const result = parseIcs(
      wrap(
        ...vevent("DTSTART:20260828T080000Z", "DTEND:20260828T090000Z", "SUMMARY:Annulé", "STATUS:CANCELLED"),
        ...vevent("DTSTART:20260829T080000Z", "DTEND:20260829T090000Z", "SUMMARY:Gardé")
      ),
      TZ
    );
    expect(result.ok && result.value.map((e) => e.title)).toEqual(["Gardé"]);
  });

  it("refuse un texte qui n'est pas du iCalendar", () => {
    expect(parseIcs("ceci n'est pas un calendrier", TZ)).toEqual({
      ok: false,
      errors: ["Aucun événement (VEVENT) trouvé dans le fichier .ics."],
    });
  });

  it("aller-retour avec caractères à échapper (virgule, point-virgule, retour ligne)", () => {
    const tricky: CalendarEvent = {
      ...timed,
      title: "Café, thé; infusion",
      description: "Ligne 1\nLigne 2, avec virgule; et point-virgule",
    };
    const result = parseIcs(eventsToIcs([tricky], TZ), TZ);
    expect(result.ok && result.value[0]).toMatchObject({
      title: "Café, thé; infusion",
      description: "Ligne 1\nLigne 2, avec virgule; et point-virgule",
    });
  });

  it("aller-retour d'une journée entière qui traverse un changement d'heure (Paris, 29/03/2026)", () => {
    const dst: CalendarEvent = {
      ...allDay,
      start: "2026-03-27T23:00:00.000Z", // 28/03 00:00 CET
      end: "2026-03-29T21:59:59.000Z", // 29/03 23:59:59 CEST
    };
    const result = parseIcs(eventsToIcs([dst], TZ), TZ);
    expect(result.ok && result.value[0]).toMatchObject({
      start: "2026-03-27T23:00:00.000Z",
      end: "2026-03-29T21:59:59.000Z",
      allDay: true,
    });
  });
});

describe("eventsToIcs — cas limites", () => {
  it("produit un calendrier valide sans événement", () => {
    const ics = eventsToIcs([], TZ);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("une journée entière d'un seul jour a DTEND = lendemain", () => {
    const oneDay: CalendarEvent = {
      ...allDay,
      start: "2026-08-27T22:00:00.000Z", // 28/08 00:00 Paris
      end: "2026-08-28T21:59:59.000Z", // 28/08 23:59:59 Paris
    };
    const ics = eventsToIcs([oneDay], TZ);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260828");
    expect(ics).toContain("DTEND;VALUE=DATE:20260829");
  });
});
