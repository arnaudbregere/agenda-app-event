import { describe, it, expect } from "vitest";
import { addDays, localDateOf, zonedToInstant } from "./timezone.js";

describe("addDays", () => {
  it("passe la fin de mois et d'année", () => {
    expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({ year: 2027, month: 1, day: 1 });
    expect(addDays({ year: 2028, month: 2, day: 28 }, 1)).toEqual({ year: 2028, month: 2, day: 29 });
    expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({ year: 2026, month: 2, day: 28 });
  });
});

describe("localDateOf", () => {
  it("donne la date du fuseau, pas celle de UTC", () => {
    // 23:30 UTC le 31/12 = 00:30 le 01/01 à Paris (UTC+1).
    expect(localDateOf(new Date("2026-12-31T23:30:00.000Z"), "Europe/Paris")).toEqual({ year: 2027, month: 1, day: 1 });
    expect(localDateOf(new Date("2026-12-31T23:30:00.000Z"), "UTC")).toEqual({ year: 2026, month: 12, day: 31 });
  });
});

describe("zonedToInstant — bascule d'heure", () => {
  it("minuit le jour du passage à l'heure d'été (Paris, 29/03/2026) est en CET", () => {
    expect(zonedToInstant(2026, 3, 29, 0, 0, 0, "Europe/Paris").toISOString()).toBe("2026-03-28T23:00:00.000Z");
  });
});
