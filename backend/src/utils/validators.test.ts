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
