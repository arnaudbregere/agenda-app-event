import { describe, it, expect } from "vitest";
import { layoutTimedEvents, toDayMinutes } from "./useEventLayout.js";

describe("layoutTimedEvents", () => {
  it("place un seul événement sur toute la largeur", () => {
    const [result] = layoutTimedEvents([{ id: "a", startMinutes: 60, endMinutes: 120 }]);
    expect(result.left).toBe(0);
    expect(result.width).toBe(100);
  });

  it("place deux événements non chevauchants chacun sur toute la largeur", () => {
    const result = layoutTimedEvents([
      { id: "a", startMinutes: 0, endMinutes: 60 },
      { id: "b", startMinutes: 60, endMinutes: 120 },
    ]);
    expect(result.find((e) => e.id === "a").width).toBe(100);
    expect(result.find((e) => e.id === "b").width).toBe(100);
  });

  it("partage la largeur en deux colonnes pour deux événements chevauchants", () => {
    const result = layoutTimedEvents([
      { id: "a", startMinutes: 0, endMinutes: 120 },
      { id: "b", startMinutes: 60, endMinutes: 180 },
    ]);
    const a = result.find((e) => e.id === "a");
    const b = result.find((e) => e.id === "b");
    expect(a.width).toBe(50);
    expect(b.width).toBe(50);
    expect(new Set([a.left, b.left])).toEqual(new Set([0, 50]));
  });

  it("gère trois événements se chevauchant tous (3 colonnes)", () => {
    const result = layoutTimedEvents([
      { id: "a", startMinutes: 0, endMinutes: 90 },
      { id: "b", startMinutes: 10, endMinutes: 90 },
      { id: "c", startMinutes: 20, endMinutes: 90 },
    ]);
    for (const ev of result) {
      expect(ev.width).toBeCloseTo(100 / 3);
    }
    const lefts = result.map((e) => e.left).sort((x, y) => x - y);
    [0, 100 / 3, 200 / 3].forEach((expected, i) => expect(lefts[i]).toBeCloseTo(expected));
  });

  it("traite deux clusters séparés indépendamment (pas de fuite de colonnes)", () => {
    const result = layoutTimedEvents([
      { id: "a", startMinutes: 0, endMinutes: 60 },
      { id: "b", startMinutes: 0, endMinutes: 60 },
      { id: "c", startMinutes: 120, endMinutes: 180 },
    ]);
    // a et b se chevauchent (2 colonnes) ; c est seul dans son cluster (pleine largeur)
    expect(result.find((e) => e.id === "c").width).toBe(100);
  });

  it("réutilise une colonne libérée par un événement déjà terminé", () => {
    const result = layoutTimedEvents([
      { id: "a", startMinutes: 0, endMinutes: 30 },
      { id: "b", startMinutes: 0, endMinutes: 60 },
      { id: "c", startMinutes: 30, endMinutes: 90 }, // chevauche b, mais pas a (a fini à 30)
    ]);
    const a = result.find((e) => e.id === "a");
    const c = result.find((e) => e.id === "c");
    // c doit pouvoir reprendre la colonne de a puisque a est terminé
    expect(c.left).toBe(a.left);
  });

  it("retourne un tableau vide pour une liste vide", () => {
    expect(layoutTimedEvents([])).toEqual([]);
  });

  it("ne mute pas les objets événements d'origine", () => {
    const original = { id: "a", startMinutes: 0, endMinutes: 60 };
    layoutTimedEvents([original]);
    expect(original).not.toHaveProperty("left");
    expect(original).not.toHaveProperty("width");
  });
});

describe("toDayMinutes", () => {
  // toDayMinutes raisonne en heure locale (setHours) : on construit les dates
  // en composants locaux plutôt qu'en ISO UTC pour ne pas dépendre du fuseau
  // horaire de la machine qui exécute les tests.
  const day = new Date(2026, 7, 28); // 28 août 2026, local

  it("convertit un événement entièrement contenu dans le jour", () => {
    const event = { start: new Date(2026, 7, 28, 9, 0), end: new Date(2026, 7, 28, 10, 30) };
    const { startMinutes, endMinutes } = toDayMinutes(event, day);
    expect(startMinutes).toBe(9 * 60);
    expect(endMinutes).toBe(10 * 60 + 30);
  });

  it("borne le début à 0 quand l'événement commence la veille", () => {
    const event = { start: new Date(2026, 7, 27, 20, 0), end: new Date(2026, 7, 28, 10, 0) };
    const { startMinutes } = toDayMinutes(event, day);
    expect(startMinutes).toBe(0);
  });

  it("borne la fin à ~1440 quand l'événement finit le lendemain", () => {
    const event = { start: new Date(2026, 7, 28, 20, 0), end: new Date(2026, 7, 29, 5, 0) };
    const { endMinutes } = toDayMinutes(event, day);
    expect(endMinutes).toBeCloseTo(24 * 60, 0);
  });

  it("impose une durée minimale visible de 20 minutes", () => {
    const event = { start: new Date(2026, 7, 28, 9, 0), end: new Date(2026, 7, 28, 9, 5) };
    const { startMinutes, endMinutes } = toDayMinutes(event, day);
    expect(endMinutes - startMinutes).toBe(20);
  });
});
