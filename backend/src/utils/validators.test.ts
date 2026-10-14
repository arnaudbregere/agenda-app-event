import { describe, it, expect } from "vitest";
import { parseCategoryQuery, parseEventBody, parseEventPatch } from "./validators.js";

// Erreurs de validation d'un corps de création (ou de mise à jour si partial).
const errorsOf = (body: unknown, { partial = false }: { partial?: boolean } = {}): string[] => {
  const result = partial ? parseEventPatch(body) : parseEventBody(body);
  return result.ok ? [] : result.errors;
};

const validPayload = {
  title: "Réunion équipe",
  start: "2026-08-28T10:00:00.000Z",
  end: "2026-08-28T11:00:00.000Z",
};

describe("validateEvent", () => {
  it("accepte un payload minimal valide", () => {
    expect(errorsOf(validPayload)).toEqual([]);
  });

  it("accepte un payload complet valide", () => {
    expect(
      errorsOf({
        ...validPayload,
        allDay: false,
        category: "travail",
        description: "Point hebdo",
        location: "Salle B",
      })
    ).toEqual([]);
  });

  describe("champs requis (création, partial=false)", () => {
    it.each(["title", "start", "end"] as const)("rejette un payload sans %s", (field) => {
      const payload = { ...validPayload };
      delete payload[field];
      const errors = errorsOf(payload);
      expect(errors).toContainEqual(expect.stringContaining(field));
    });

    it("rejette une chaîne vide pour title", () => {
      const errors = errorsOf({ ...validPayload, title: "" });
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("mode partiel (partial=true, utilisé pour PUT)", () => {
    it("n'exige aucun champ", () => {
      expect(errorsOf({}, { partial: true })).toEqual([]);
    });

    it("valide quand même les champs fournis", () => {
      const errors = errorsOf({ title: "" }, { partial: true });
      expect(errors).not.toEqual([]);
    });
  });

  describe("title", () => {
    it("rejette un title non-string", () => {
      const errors = errorsOf({ ...validPayload, title: 42 });
      expect(errors.some((error) => error.includes("title"))).toBe(true);
    });

    it("rejette un title composé uniquement d'espaces", () => {
      const errors = errorsOf({ ...validPayload, title: "   " });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("rejette un title de plus de 200 caractères", () => {
      const errors = errorsOf({ ...validPayload, title: "a".repeat(201) });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("accepte un title de exactement 200 caractères", () => {
      const errors = errorsOf({ ...validPayload, title: "a".repeat(200) });
      expect(errors).toEqual([]);
    });
  });

  describe("dates", () => {
    it("rejette une date start invalide", () => {
      const errors = errorsOf({ ...validPayload, start: "pas-une-date" });
      expect(errors.some((error) => error.includes("start"))).toBe(true);
    });

    it("rejette une date end invalide", () => {
      const errors = errorsOf({ ...validPayload, end: "pas-une-date" });
      expect(errors.some((error) => error.includes("end"))).toBe(true);
    });

    it("rejette une date non-string (ex. nombre)", () => {
      expect(errorsOf({ ...validPayload, start: 0 })).toEqual(['Le champ "start" doit être une date ISO valide.']);
      expect(errorsOf({ ...validPayload, end: 1700000000000 })).toEqual(['Le champ "end" doit être une date ISO valide.']);
    });

    it("rejette end antérieur à start", () => {
      const errors = errorsOf({
        ...validPayload,
        start: "2026-08-28T11:00:00.000Z",
        end: "2026-08-28T10:00:00.000Z",
      });
      expect(errors.some((error) => error.includes("postérieur"))).toBe(true);
    });

    it("accepte end égal à start (événement instantané)", () => {
      const errors = errorsOf({
        ...validPayload,
        start: "2026-08-28T10:00:00.000Z",
        end: "2026-08-28T10:00:00.000Z",
      });
      expect(errors).toEqual([]);
    });
  });

  describe("allDay", () => {
    it("rejette une valeur non booléenne", () => {
      const errors = errorsOf({ ...validPayload, allDay: "oui" });
      expect(errors.some((error) => error.includes("allDay"))).toBe(true);
    });
  });

  describe("category", () => {
    it("rejette une catégorie inconnue", () => {
      const errors = errorsOf({ ...validPayload, category: "inexistante" });
      expect(errors.some((error) => error.includes("category"))).toBe(true);
    });

    it("accepte chacune des catégories valides", () => {
      for (const category of ["personnel", "travail", "important", "famille", "loisirs", "autre"]) {
        expect(errorsOf({ ...validPayload, category })).toEqual([]);
      }
    });
  });

  describe("description / location", () => {
    it("rejette une description non-string", () => {
      const errors = errorsOf({ ...validPayload, description: 123 });
      expect(errors.some((error) => error.includes("description"))).toBe(true);
    });

    it("rejette une location non-string", () => {
      const errors = errorsOf({ ...validPayload, location: 123 });
      expect(errors.some((error) => error.includes("location"))).toBe(true);
    });
  });

  it("accumule plusieurs erreurs à la fois", () => {
    const errors = errorsOf({ title: "", start: "invalide", category: "?" });
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  describe("corps non objet (req.body est unknown)", () => {
    it.each([null, "texte", 42, [], [validPayload]])("rejette %j avec une seule erreur explicite", (body) => {
      expect(errorsOf(body)).toEqual(["Le corps de la requête doit être un objet JSON."]);
    });
  });

  describe("parseEventBody / parseEventPatch : valeur typée renvoyée", () => {
    it("renvoie le corps typé quand il est valide", () => {
      const result = parseEventBody({ ...validPayload, allDay: true, category: "famille", location: "Salle B" });
      expect(result).toEqual({
        ok: true,
        value: { ...validPayload, allDay: true, category: "famille", location: "Salle B" },
      });
    });

    it("renvoie seulement les erreurs quand un champ est invalide", () => {
      const result = parseEventBody({ ...validPayload, allDay: "oui", category: "?" });
      expect(result.ok).toBe(false);
      expect(result.ok ? [] : result.errors).toHaveLength(2);
    });

    it("exige title, start et end pour une création", () => {
      expect(parseEventBody({ title: "x" }).ok).toBe(false);
      expect(parseEventBody(validPayload).ok).toBe(true);
    });

    it("renvoie seulement les champs présents pour une mise à jour", () => {
      expect(parseEventPatch({ title: "Nouveau" })).toEqual({ ok: true, value: { title: "Nouveau" } });
    });
  });
});

describe("récurrence (recurrence, exdates, surcharges)", () => {
  const weekly = { freq: "weekly", interval: 1, until: "2026-11-30T22:59:59.000Z" };

  describe("recurrence", () => {
    it("accepte un payload sans recurrence : événement simple", () => {
      expect(errorsOf(validPayload)).toEqual([]);
      expect(parseEventBody(validPayload)).toEqual({ ok: true, value: validPayload });
    });

    it("accepte une règle valide et la renvoie typée", () => {
      const result = parseEventBody({ ...validPayload, recurrence: weekly });
      expect(result.ok).toBe(true);
      expect(result.ok ? result.value.recurrence : null).toEqual(weekly);
    });

    it.each([
      ["une chaîne", "weekly"],
      ["un tableau", [weekly]],
      ["un nombre", 1],
    ])("refuse une recurrence qui est %s", (_label, value) => {
      expect(errorsOf({ ...validPayload, recurrence: value })).toContainEqual(
        'Le champ "recurrence" doit être un objet.'
      );
    });

    it.each(["daily", "weekly", "monthly"] as const)("accepte la fréquence %s", (freq) => {
      expect(errorsOf({ ...validPayload, recurrence: { ...weekly, freq } })).toEqual([]);
    });

    it.each([
      ["une valeur inconnue", "yearly"],
      ["une casse différente", "Weekly"],
      ["une chaîne vide", ""],
      ["une valeur absente", undefined],
    ])("refuse une fréquence qui est %s, avec un message listant les valeurs admises", (_label, freq) => {
      const errors = errorsOf({ ...validPayload, recurrence: { ...weekly, freq } });
      expect(errors).toContainEqual(expect.stringContaining("daily, weekly, monthly"));
    });

    it.each([1, 2, 7, 99])("accepte un interval de %i", (interval) => {
      expect(errorsOf({ ...validPayload, recurrence: { ...weekly, interval } })).toEqual([]);
    });

    it.each([
      ["0", 0],
      ["négatif", -1],
      ["au-delà du maximum", 100],
    ])("refuse un interval %s", (_label, interval) => {
      expect(errorsOf({ ...validPayload, recurrence: { ...weekly, interval } })).toContainEqual(
        'Le champ "recurrence.interval" doit être compris entre 1 et 99.'
      );
    });

    it.each([
      ["non entier", 1.5],
      ["une chaîne", "1"],
      ["absent", undefined],
    ])("refuse un interval %s", (_label, interval) => {
      expect(errorsOf({ ...validPayload, recurrence: { ...weekly, interval } })).toContainEqual(
        'Le champ "recurrence.interval" doit être un entier.'
      );
    });

    it.each([
      ["absent", undefined],
      ["null", null],
      ["une chaîne vide", ""],
    ])("refuse un until %s : pas de série sans fin", (_label, until) => {
      expect(errorsOf({ ...validPayload, recurrence: { ...weekly, until } })).toContainEqual(
        'Le champ "recurrence.until" est requis.'
      );
    });

    it("refuse un until qui n'est pas une date ISO", () => {
      expect(errorsOf({ ...validPayload, recurrence: { ...weekly, until: "pas-une-date" } })).toContainEqual(
        'Le champ "recurrence.until" doit être une date ISO valide.'
      );
    });

    it("refuse un until antérieur à start", () => {
      expect(
        errorsOf({ ...validPayload, recurrence: { ...weekly, until: "2026-08-01T00:00:00.000Z" } })
      ).toContainEqual('Le champ "recurrence.until" doit être postérieur ou égal à "start".');
    });

    it("accepte un until égal à start : série d'une seule occurrence", () => {
      expect(errorsOf({ ...validPayload, recurrence: { ...weekly, until: validPayload.start } })).toEqual([]);
    });

    // requireEvent ne met pas l'événement chargé à disposition de la validation :
    // sans start dans le même corps, until >= start serait invérifiable.
    it("refuse une mise à jour portant recurrence sans start", () => {
      expect(errorsOf({ recurrence: weekly }, { partial: true })).toContainEqual(
        'Le champ "start" est requis lorsque "recurrence" est fourni.'
      );
    });

    it("accepte une mise à jour portant recurrence avec start", () => {
      expect(errorsOf({ start: validPayload.start, recurrence: weekly }, { partial: true })).toEqual([]);
    });

    it("traite recurrence: null comme une demande de retrait, sans erreur", () => {
      expect(parseEventPatch({ recurrence: null })).toEqual({ ok: true, value: { recurrence: null } });
    });
  });

  describe("exdates", () => {
    it("accepte un tableau de dates ISO", () => {
      const exdates = ["2026-11-02T08:00:00.000Z", "2026-11-09T08:00:00.000Z"];
      const result = parseEventBody({ ...validPayload, exdates });
      expect(result.ok ? result.value.exdates : null).toEqual(exdates);
    });

    it("accepte un tableau vide", () => {
      expect(errorsOf({ ...validPayload, exdates: [] })).toEqual([]);
    });

    // Vérifier la correspondance exigerait de développer la série ici, donc de
    // dupliquer le calcul de dates du frontend (research.md, R-006).
    it("accepte une exdate qui ne correspond à aucune occurrence réelle", () => {
      expect(errorsOf({ ...validPayload, exdates: ["2030-01-01T00:00:00.000Z"] })).toEqual([]);
    });

    it.each([
      ["une chaîne", "2026-11-02T08:00:00.000Z"],
      ["un objet", { date: "2026-11-02T08:00:00.000Z" }],
    ])("refuse des exdates qui sont %s", (_label, value) => {
      expect(errorsOf({ ...validPayload, exdates: value })).toContainEqual(
        'Le champ "exdates" doit être un tableau de dates ISO.'
      );
    });

    it.each([
      ["une date invalide", ["pas-une-date"]],
      ["un nombre", [1234567890]],
      ["null", [null]],
    ])("refuse un tableau contenant %s", (_label, value) => {
      expect(errorsOf({ ...validPayload, exdates: value })).toContainEqual(
        'Le champ "exdates" ne doit contenir que des dates ISO valides.'
      );
    });

    it("traite exdates: null comme une demande de retrait, sans erreur", () => {
      expect(parseEventPatch({ exdates: null })).toEqual({ ok: true, value: { exdates: null } });
    });
  });

  describe("occurrence surchargée", () => {
    const override = {
      ...validPayload,
      recurrenceParentId: "a1",
      recurrenceId: "2026-11-09T08:00:00.000Z",
    };

    it("accepte un rattachement valide", () => {
      const result = parseEventBody(override);
      expect(result.ok).toBe(true);
      expect(result.ok ? result.value.recurrenceParentId : null).toBe("a1");
    });

    it.each(["recurrenceParentId", "recurrenceId"] as const)("refuse un %s vide", (field) => {
      expect(errorsOf({ ...override, [field]: "" })).toContainEqual(
        `Le champ "${field}" doit être une chaîne de caractères non vide.`
      );
    });

    it.each(["recurrenceParentId", "recurrenceId"] as const)("refuse un %s qui n'est pas une chaîne", (field) => {
      expect(errorsOf({ ...override, [field]: 42 })).toContainEqual(
        `Le champ "${field}" doit être une chaîne de caractères non vide.`
      );
    });

    // INV-3 : une surcharge porteuse d'une règle se développerait à son tour et
    // doublerait l'affichage de sa propre date.
    it("refuse recurrence et recurrenceParentId fournis ensemble", () => {
      expect(errorsOf({ ...override, recurrence: weekly })).toContainEqual(
        'Les champs "recurrence" et "recurrenceParentId" ne peuvent pas être fournis ensemble.'
      );
    });

    it("accepte recurrence: null avec recurrenceParentId", () => {
      expect(errorsOf({ ...override, recurrence: null })).toEqual([]);
    });

    // Sémantique de `null` symétrique sur les quatre attributs : c'est ce qui
    // permet à une occurrence surchargée de redevenir un événement simple.
    it.each(["recurrenceParentId", "recurrenceId"] as const)(
      "traite %s: null comme une demande de retrait",
      (field) => {
        expect(parseEventPatch({ [field]: null })).toEqual({ ok: true, value: { [field]: null } });
      },
    );
  });
});

describe("parseCategoryQuery (filtre GET /api/events)", () => {
  it("renvoie {} sans paramètre category", () => {
    expect(parseCategoryQuery({})).toEqual({ ok: true, value: {} });
  });

  it("renvoie la catégorie typée pour une valeur valide", () => {
    expect(parseCategoryQuery({ category: "travail" })).toEqual({ ok: true, value: { category: "travail" } });
  });

  it.each([
    ["une valeur inconnue", "inconnu"],
    ["une chaîne vide", ""],
    ["une casse différente", "Travail"],
  ])("refuse %s avec un message qui liste les valeurs admises", (_label, value) => {
    const result = parseCategoryQuery({ category: value });
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors[0]).toContain("personnel, travail, important, famille, loisirs, autre");
  });

  it("refuse un paramètre répété", () => {
    const result = parseCategoryQuery({ category: ["travail", "famille"] });
    expect(result).toEqual({
      ok: false,
      errors: ['Le paramètre "category" ne peut être fourni qu\'une seule fois.'],
    });
  });
});
