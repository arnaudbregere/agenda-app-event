import { describe, it, expect } from "vitest";
import { validateEvent } from "./validators.js";

const validPayload = {
  title: "Réunion équipe",
  start: "2026-08-28T10:00:00.000Z",
  end: "2026-08-28T11:00:00.000Z",
};

describe("validateEvent", () => {
  it("accepte un payload minimal valide", () => {
    expect(validateEvent(validPayload)).toEqual([]);
  });

  it("accepte un payload complet valide", () => {
    expect(
      validateEvent({
        ...validPayload,
        allDay: false,
        category: "travail",
        description: "Point hebdo",
        location: "Salle B",
      })
    ).toEqual([]);
  });

  describe("champs requis (création, partial=false)", () => {
    it.each(["title", "start", "end"])("rejette un payload sans %s", (field) => {
      const payload = { ...validPayload };
      delete payload[field];
      const errors = validateEvent(payload);
      expect(errors).toContainEqual(expect.stringContaining(field));
    });

    it("rejette une chaîne vide pour title", () => {
      const errors = validateEvent({ ...validPayload, title: "" });
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("mode partiel (partial=true, utilisé pour PUT)", () => {
    it("n'exige aucun champ", () => {
      expect(validateEvent({}, { partial: true })).toEqual([]);
    });

    it("valide quand même les champs fournis", () => {
      const errors = validateEvent({ title: "" }, { partial: true });
      expect(errors).not.toEqual([]);
    });
  });

  describe("title", () => {
    it("rejette un title non-string", () => {
      const errors = validateEvent({ ...validPayload, title: 42 });
      expect(errors.some((e) => e.includes("title"))).toBe(true);
    });

    it("rejette un title composé uniquement d'espaces", () => {
      const errors = validateEvent({ ...validPayload, title: "   " });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("rejette un title de plus de 200 caractères", () => {
      const errors = validateEvent({ ...validPayload, title: "a".repeat(201) });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("accepte un title de exactement 200 caractères", () => {
      const errors = validateEvent({ ...validPayload, title: "a".repeat(200) });
      expect(errors).toEqual([]);
    });
  });

  describe("dates", () => {
    it("rejette une date start invalide", () => {
      const errors = validateEvent({ ...validPayload, start: "pas-une-date" });
      expect(errors.some((e) => e.includes("start"))).toBe(true);
    });

    it("rejette une date end invalide", () => {
      const errors = validateEvent({ ...validPayload, end: "pas-une-date" });
      expect(errors.some((e) => e.includes("end"))).toBe(true);
    });

    it("rejette end antérieur à start", () => {
      const errors = validateEvent({
        ...validPayload,
        start: "2026-08-28T11:00:00.000Z",
        end: "2026-08-28T10:00:00.000Z",
      });
      expect(errors.some((e) => e.includes("postérieur"))).toBe(true);
    });

    it("accepte end égal à start (événement instantané)", () => {
      const errors = validateEvent({
        ...validPayload,
        start: "2026-08-28T10:00:00.000Z",
        end: "2026-08-28T10:00:00.000Z",
      });
      expect(errors).toEqual([]);
    });
  });

  describe("allDay", () => {
    it("rejette une valeur non booléenne", () => {
      const errors = validateEvent({ ...validPayload, allDay: "oui" });
      expect(errors.some((e) => e.includes("allDay"))).toBe(true);
    });
  });

  describe("category", () => {
    it("rejette une catégorie inconnue", () => {
      const errors = validateEvent({ ...validPayload, category: "inexistante" });
      expect(errors.some((e) => e.includes("category"))).toBe(true);
    });

    it("accepte chacune des catégories valides", () => {
      for (const category of ["personnel", "travail", "important", "famille", "loisirs", "autre"]) {
        expect(validateEvent({ ...validPayload, category })).toEqual([]);
      }
    });
  });

  describe("description / location", () => {
    it("rejette une description non-string", () => {
      const errors = validateEvent({ ...validPayload, description: 123 });
      expect(errors.some((e) => e.includes("description"))).toBe(true);
    });

    it("rejette une location non-string", () => {
      const errors = validateEvent({ ...validPayload, location: 123 });
      expect(errors.some((e) => e.includes("location"))).toBe(true);
    });
  });

  it("accumule plusieurs erreurs à la fois", () => {
    const errors = validateEvent({ title: "", start: "invalide", category: "?" });
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});
