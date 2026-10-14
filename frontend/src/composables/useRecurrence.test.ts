import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";
import { format } from "date-fns";
import { MAX_OCCURRENCES, expandSeries, occurrenceId } from "./useRecurrence.js";
import { asEventId } from "../test-support/fixtures.js";
import type { CalendarEvent, RecurrenceRule } from "../api/types.js";

// Le fuseau de l'agenda (APP_TIMEZONE côté backend) est Europe/Paris. Les cas de
// changement d'heure n'ont de sens que dans un fuseau qui en a un, alors que la
// CI tourne en UTC. On l'épingle donc ici, et le test de changement d'heure
// vérifie lui-même que l'épinglage a pris effet (voir « preuve »).
beforeAll(() => {
  vi.stubEnv("TZ", "Europe/Paris");
});
afterAll(() => {
  vi.unstubAllEnvs();
});

const ANCHOR_ID = asEventId("serie-1");

// Construit un événement complet : ces tests exercent du calcul de dates réel,
// pas la mécanique d'un store, donc les fixtures partielles ne suffisent pas.
const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: ANCHOR_ID,
  title: "Réunion équipe",
  start: new Date(2026, 9, 19, 9, 0, 0).toISOString(),
  end: new Date(2026, 9, 19, 10, 0, 0).toISOString(),
  allDay: false,
  category: "travail",
  createdAt: "2026-10-14T09:00:00.000Z",
  updatedAt: "2026-10-14T09:00:00.000Z",
  ...overrides,
});

const rule = (overrides: Partial<RecurrenceRule> = {}): RecurrenceRule => ({
  freq: "weekly",
  interval: 1,
  until: new Date(2026, 10, 30, 23, 59, 59).toISOString(),
  ...overrides,
});

// Fenêtre large : isole le calcul de la récurrence du filtrage par fenêtre.
const WIDE = { from: new Date(2000, 0, 1), to: new Date(2100, 0, 1) };

const startsOf = (event: CalendarEvent, window = WIDE) =>
  expandSeries(event, window).map((o) => format(new Date(o.start), "yyyy-MM-dd HH:mm"));

describe("expandSeries", () => {
  describe("événement sans récurrence", () => {
    // NFR-002 : un événement simple traverse l'expanseur pour que les vues
    // n'aient jamais à tester « est-ce une série ».
    it("ressort en une occurrence identique", () => {
      const event = makeEvent();
      const result = expandSeries(event, WIDE);

      expect(result).toHaveLength(1);
      expect(result[0].start).toBe(event.start);
      expect(result[0].end).toBe(event.end);
      expect(result[0].title).toBe(event.title);
      expect(result[0].seriesId).toBe(event.id);
      expect(result[0].occurrenceStart).toBe(event.start);
    });

    it("ne ressort pas si la fenêtre ne l'intersecte pas", () => {
      const event = makeEvent();
      expect(expandSeries(event, { from: new Date(2027, 0, 1), to: new Date(2027, 0, 31) })).toEqual([]);
    });
  });

  describe("fenêtre", () => {
    it("ne renvoie que les occurrences qui intersectent la fenêtre", () => {
      const event = makeEvent({
        recurrence: rule({ until: new Date(2027, 0, 31, 23, 59, 59).toISOString() }),
      });

      const november = startsOf(event, { from: new Date(2026, 10, 1), to: new Date(2026, 10, 30, 23, 59, 59) });

      expect(november).toEqual([
        "2026-11-02 09:00",
        "2026-11-09 09:00",
        "2026-11-16 09:00",
        "2026-11-23 09:00",
        "2026-11-30 09:00",
      ]);
    });

    it("renvoie les occurrences triées par date croissante", () => {
      const event = makeEvent({ recurrence: rule() });
      const starts = expandSeries(event, WIDE).map((o) => new Date(o.start).getTime());
      expect(starts).toEqual([...starts].sort((a, b) => a - b));
    });
  });

  describe("écrêtage mensuel", () => {
    // ⚠️ Ce test porte sur QUATRE occurrences, pas deux. L'écrêtage est absorbant
    // si l'on calcule en cascade depuis l'occurrence précédente : on obtiendrait
    // 31 | 28 | 28 | 28 au lieu de 31 | 28 | 31 | 30. Le défaut n'apparaît qu'à
    // partir de la TROISIÈME occurrence — un test à deux occurrences passerait
    // avec les deux implémentations (specs/002-recurring-events/research.md, R-002).
    it("repart de l'ancre et ne perd pas le 31 après un mois court", () => {
      const event = makeEvent({
        start: new Date(2027, 0, 31, 9, 0, 0).toISOString(),
        end: new Date(2027, 0, 31, 10, 0, 0).toISOString(),
        recurrence: rule({ freq: "monthly", until: new Date(2027, 4, 1, 0, 0, 0).toISOString() }),
      });

      expect(startsOf(event)).toEqual([
        "2027-01-31 09:00",
        "2027-02-28 09:00",
        "2027-03-31 09:00",
        "2027-04-30 09:00",
      ]);
    });

    it("tombe au 29 février en année bissextile", () => {
      const event = makeEvent({
        start: new Date(2028, 0, 31, 9, 0, 0).toISOString(),
        end: new Date(2028, 0, 31, 10, 0, 0).toISOString(),
        recurrence: rule({ freq: "monthly", until: new Date(2028, 2, 1, 0, 0, 0).toISOString() }),
      });

      expect(startsOf(event)).toEqual(["2028-01-31 09:00", "2028-02-29 09:00"]);
    });
  });

  describe("changement d'heure", () => {
    // R-003 : date-fns travaille en heure locale murale. Une arithmétique en
    // millisecondes donnerait 8h00 après le passage à l'heure d'hiver.
    it("conserve l'heure murale de part et d'autre du passage à l'heure d'hiver", () => {
      const event = makeEvent({
        recurrence: rule({ until: new Date(2026, 10, 9, 23, 59, 59).toISOString() }),
      });

      const occurrences = expandSeries(event, WIDE);

      // Preuve que l'épinglage du fuseau a pris effet : sans DST traversé, ce
      // test passerait à vide et ne vérifierait rien.
      const offsets = occurrences.map((o) => new Date(o.start).getTimezoneOffset());
      expect(new Set(offsets).size).toBeGreaterThan(1);

      for (const occurrence of occurrences) {
        expect(new Date(occurrence.start).getHours()).toBe(9);
        expect(new Date(occurrence.end).getHours()).toBe(10);
      }
    });
  });

  describe("bornes de la règle", () => {
    it("produit exactement une occurrence quand until égale start", () => {
      const event = makeEvent({ recurrence: rule({ until: makeEvent().start }) });
      expect(startsOf(event)).toEqual(["2026-10-19 09:00"]);
    });

    it("n'émet aucune occurrence au-delà de until", () => {
      const event = makeEvent({ recurrence: rule() });
      const last = expandSeries(event, WIDE).at(-1);
      expect(new Date(last?.start ?? 0).getTime()).toBeLessThanOrEqual(
        new Date(rule().until).getTime(),
      );
    });

    it.each([
      [2, ["2026-10-19 09:00", "2026-11-02 09:00", "2026-11-16 09:00", "2026-11-30 09:00"]],
      [3, ["2026-10-19 09:00", "2026-11-09 09:00", "2026-11-30 09:00"]],
    ])("respecte un interval de %i sans dérive de rang", (interval, expected) => {
      const event = makeEvent({ recurrence: rule({ interval }) });
      expect(startsOf(event)).toEqual(expected);
    });

    it("produit une seule occurrence avec un interval de 99", () => {
      const event = makeEvent({ recurrence: rule({ interval: 99 }) });
      expect(startsOf(event)).toEqual(["2026-10-19 09:00"]);
    });

    it("conserve la durée de l'ancre sur chaque occurrence", () => {
      const event = makeEvent({
        end: new Date(2026, 9, 19, 10, 30, 0).toISOString(),
        recurrence: rule(),
      });

      for (const occurrence of expandSeries(event, WIDE)) {
        const minutes = (new Date(occurrence.end).getTime() - new Date(occurrence.start).getTime()) / 60000;
        expect(minutes).toBe(90);
      }
    });
  });

  describe("exclusions", () => {
    it("retire une occurrence du milieu en conservant l'ordre des autres", () => {
      const event = makeEvent({
        recurrence: rule(),
        exdates: [new Date(2026, 10, 2, 9, 0, 0).toISOString()],
      });

      expect(startsOf(event)).toEqual([
        "2026-10-19 09:00",
        "2026-10-26 09:00",
        "2026-11-09 09:00",
        "2026-11-16 09:00",
        "2026-11-23 09:00",
        "2026-11-30 09:00",
      ]);
    });

    // R-006 : le backend ne vérifie pas la correspondance d'une exdate, parce que
    // la vérifier exigerait d'y dupliquer ce calcul. Une exclusion orpheline doit
    // donc être inoffensive.
    it("ignore une exclusion qui ne correspond à aucune occurrence", () => {
      const withOrphan = makeEvent({
        recurrence: rule(),
        exdates: ["2030-01-01T00:00:00.000Z"],
      });

      expect(startsOf(withOrphan)).toEqual(startsOf(makeEvent({ recurrence: rule() })));
    });

    it("compare les exclusions par instant, pas par chaîne", () => {
      const isoWithMillis = new Date(2026, 10, 2, 9, 0, 0).toISOString();
      const isoWithoutMillis = isoWithMillis.replace(".000", "");
      const event = makeEvent({ recurrence: rule(), exdates: [isoWithoutMillis] });

      expect(startsOf(event)).not.toContain("2026-11-02 09:00");
    });

    it("renvoie une liste vide quand toutes les occurrences sont exclues", () => {
      const all = expandSeries(makeEvent({ recurrence: rule() }), WIDE).map((o) => o.occurrenceStart);
      const event = makeEvent({ recurrence: rule(), exdates: all });

      expect(expandSeries(event, WIDE)).toEqual([]);
    });
  });

  describe("plafond d'affichage", () => {
    // R-005 : le plafond est une borne de rendu, pas une validation de donnée.
    // Un events.json édité à la main ne doit rien faire planter.
    it("s'arrête à MAX_OCCURRENCES sans lever d'exception", () => {
      const event = makeEvent({
        recurrence: rule({ freq: "daily", until: new Date(2525, 0, 1).toISOString() }),
      });

      expect(() => expandSeries(event, WIDE)).not.toThrow();
      expect(expandSeries(event, WIDE)).toHaveLength(MAX_OCCURRENCES);
    });

    it("expose un plafond de 500", () => {
      expect(MAX_OCCURRENCES).toBe(500);
    });
  });

  describe("pureté", () => {
    it("renvoie le même résultat pour deux appels identiques", () => {
      const event = makeEvent({ recurrence: rule() });
      expect(expandSeries(event, WIDE)).toEqual(expandSeries(event, WIDE));
    });

    it("ne modifie pas l'événement reçu", () => {
      const event = makeEvent({ recurrence: rule(), exdates: ["2026-11-02T08:00:00.000Z"] });
      const snapshot = structuredClone(event);

      expandSeries(event, WIDE);

      expect(event).toEqual(snapshot);
    });
  });
});

describe("occurrenceId", () => {
  it("combine l'identifiant de la série et la date de l'occurrence", () => {
    expect(occurrenceId(ANCHOR_ID, "2026-10-19T07:00:00.000Z")).toBe("serie-1:2026-10-19T07:00:00.000Z");
  });

  it("est déterministe", () => {
    expect(occurrenceId(ANCHOR_ID, "2026-10-19T07:00:00.000Z")).toBe(
      occurrenceId(ANCHOR_ID, "2026-10-19T07:00:00.000Z"),
    );
  });

  it("distingue deux occurrences d'une même série", () => {
    expect(occurrenceId(ANCHOR_ID, "2026-10-19T07:00:00.000Z")).not.toBe(
      occurrenceId(ANCHOR_ID, "2026-10-26T08:00:00.000Z"),
    );
  });

  it("donne à chaque occurrence développée un identifiant unique", () => {
    const occurrences = expandSeries(makeEvent({ recurrence: rule() }), WIDE);
    expect(new Set(occurrences.map((o) => o.id)).size).toBe(occurrences.length);
  });
});
