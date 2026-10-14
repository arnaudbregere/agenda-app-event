import { describe, it, expect } from "vitest";
import { getMonthWeeks, getWeekDays, eventOccursOnDay, isToday, HOURS } from "./useCalendarGrid.js";

describe("getMonthWeeks", () => {
  it("découpe le mois en semaines complètes de 7 jours démarrant le lundi", () => {
    const weeks = getMonthWeeks(new Date("2026-08-15"));
    for (const week of weeks) {
      expect(week).toHaveLength(7);
      expect(week[0].getDay()).toBe(1); // lundi
    }
  });

  it("couvre bien le 1er et le dernier jour du mois", () => {
    const weeks = getMonthWeeks(new Date("2026-08-15"));
    const allDays = weeks.flat();
    const hasDay = (iso: string) => allDays.some((day) => day.toISOString().slice(0, 10) === iso);
    expect(hasDay("2026-08-01")).toBe(true);
    expect(hasDay("2026-08-31")).toBe(true);
  });
});

describe("getWeekDays", () => {
  it("retourne 7 jours consécutifs démarrant le lundi", () => {
    const days = getWeekDays(new Date("2026-08-28")); // un vendredi
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1);
    expect(days[6].getDay()).toBe(0); // dimanche
  });
});

describe("eventOccursOnDay", () => {
  const day = new Date("2026-08-28");

  it("vrai quand l'événement est entièrement dans le jour", () => {
    const event = { start: "2026-08-28T09:00:00.000Z", end: "2026-08-28T10:00:00.000Z" };
    expect(eventOccursOnDay(event, day)).toBe(true);
  });

  it("vrai quand l'événement chevauche partiellement le jour", () => {
    const event = { start: "2026-08-27T22:00:00.000Z", end: "2026-08-28T02:00:00.000Z" };
    expect(eventOccursOnDay(event, day)).toBe(true);
  });

  it("faux quand l'événement est un autre jour", () => {
    const event = { start: "2026-08-29T09:00:00.000Z", end: "2026-08-29T10:00:00.000Z" };
    expect(eventOccursOnDay(event, day)).toBe(false);
  });

  // Défaut du formulaire de création : 23:00 → 00:00. Sans cette borne stricte
  // l'événement le plus banal de l'app s'affiche sur deux jours dans les 4 vues.
  it("faux le lendemain quand l'événement se termine exactement à minuit", () => {
    const event = {
      start: new Date(2026, 7, 28, 23, 0).toISOString(),
      end: new Date(2026, 7, 29, 0, 0).toISOString(),
    };
    expect(eventOccursOnDay(event, new Date(2026, 7, 29))).toBe(false);
    expect(eventOccursOnDay(event, new Date(2026, 7, 28))).toBe(true);
  });

  // `end === start` est accepté par le backend (validators.ts : « postérieur ou
  // égal »). À minuit pile, la borne stricte seule le rendrait invisible partout.
  it("vrai pour un événement de durée nulle à minuit, le jour qui le contient", () => {
    const midnight = new Date(2026, 7, 29, 0, 0).toISOString();
    const event = { start: midnight, end: midnight };
    expect(eventOccursOnDay(event, new Date(2026, 7, 29))).toBe(true);
    expect(eventOccursOnDay(event, new Date(2026, 7, 28))).toBe(false);
  });
});

describe("isToday", () => {
  it("vrai pour la date du jour", () => {
    expect(isToday(new Date())).toBe(true);
  });

  it("faux pour une date passée", () => {
    expect(isToday(new Date("2000-01-01"))).toBe(false);
  });
});

describe("HOURS", () => {
  it("contient les 24 heures de la journée dans l'ordre", () => {
    expect(HOURS).toHaveLength(24);
    expect(HOURS[0]).toBe(0);
    expect(HOURS[23]).toBe(23);
  });
});
