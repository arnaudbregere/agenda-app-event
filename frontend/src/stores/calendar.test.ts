import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useCalendarStore } from "./calendar.js";
import type { ModalDefaults } from "./calendar.js";
import { useEventsStore } from "./events.js";
// Fixtures volontairement partielles : ces tests exercent la mécanique du
// store (stockage / lecture tel quel), pas la conformité au schéma complet.
import { asEvent, asOccurrence } from "../test-support/fixtures.js";

const asModalDefaults = (value: object) => value as ModalDefaults;

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("useCalendarStore", () => {
  it("état initial : vue mois, aucun filtre, modal fermée", () => {
    const store = useCalendarStore();
    expect(store.currentView).toBe("month");
    expect(store.excludedCategoryIds).toEqual([]);
    expect(store.modalOpen).toBe(false);
  });

  describe("navigation / vue", () => {
    it("setView change la vue courante", () => {
      const store = useCalendarStore();
      store.setView("week");
      expect(store.currentView).toBe("week");
    });

    it("goToday remet la date courante à aujourd'hui", () => {
      const store = useCalendarStore();
      store.setCurrentDate(new Date("2000-01-01"));
      store.goToday();
      expect(store.currentDate.toDateString()).toBe(new Date().toDateString());
    });
  });

  describe("goToCurrent", () => {
    it.each(["day", "week", "month"] as const)("bascule en vue %s et recentre sur aujourd'hui", (view) => {
      const store = useCalendarStore();
      store.setCurrentDate(new Date(2000, 0, 1));
      store.goToCurrent(view);
      expect(store.currentView).toBe(view);
      expect(store.currentDate.toDateString()).toBe(new Date().toDateString());
    });

    it("referme la sidebar (accès rapide mobile)", () => {
      const store = useCalendarStore();
      store.openSidebar();
      store.goToCurrent("week");
      expect(store.isSidebarOpen).toBe(false);
    });
  });

  describe("sidebar", () => {
    it("fermée par défaut", () => {
      expect(useCalendarStore().isSidebarOpen).toBe(false);
    });

    it("openSidebar / closeSidebar / toggleSidebar", () => {
      const store = useCalendarStore();
      store.openSidebar();
      expect(store.isSidebarOpen).toBe(true);
      store.closeSidebar();
      expect(store.isSidebarOpen).toBe(false);
      store.toggleSidebar();
      expect(store.isSidebarOpen).toBe(true);
      store.toggleSidebar();
      expect(store.isSidebarOpen).toBe(false);
    });
  });

  describe("toggleCategory / isCategoryActive", () => {
    it("une catégorie est active par défaut", () => {
      const store = useCalendarStore();
      expect(store.isCategoryActive("travail")).toBe(true);
    });

    it("toggleCategory désactive puis réactive une catégorie", () => {
      const store = useCalendarStore();
      store.toggleCategory("travail");
      expect(store.isCategoryActive("travail")).toBe(false);
      store.toggleCategory("travail");
      expect(store.isCategoryActive("travail")).toBe(true);
    });
  });

  describe("modal", () => {
    it("openCreateModal ouvre en mode création avec defaults", () => {
      const store = useCalendarStore();
      const defaults = { start: "2026-08-28T09:00:00.000Z" };
      store.openCreateModal(asModalDefaults(defaults));
      expect(store.modalOpen).toBe(true);
      expect(store.editingEvent).toBeNull();
      expect(store.modalDefaults).toEqual(defaults);
    });

    it("openEditModal ouvre en mode édition avec l'occurrence", () => {
      const store = useCalendarStore();
      const occurrence = asOccurrence({ id: "1", title: "Existant" });
      store.openEditModal(occurrence);
      expect(store.modalOpen).toBe(true);
      expect(store.editingEvent).toEqual(occurrence);
      expect(store.modalDefaults).toBeNull();
    });

    it("closeModal réinitialise tout", () => {
      const store = useCalendarStore();
      store.openEditModal(asOccurrence({ id: "1" }));
      store.closeModal();
      expect(store.modalOpen).toBe(false);
      expect(store.editingEvent).toBeNull();
      expect(store.modalDefaults).toBeNull();
    });
  });

  // Remplace l'ancien getter `filteredEvents` : point d'accès unique aux
  // événements affichables, qui développe les séries sur une fenêtre puis
  // applique le filtrage (NFR-004, NFR-005).
  describe("occurrencesIn", () => {
    const OCTOBER = { from: new Date(2026, 9, 1), to: new Date(2026, 9, 31, 23, 59, 59) };

    const event = (id: string, day: number, rest: object = {}) => ({
      id,
      category: "travail",
      description: "",
      location: "",
      start: new Date(2026, 9, day, 9, 0).toISOString(),
      end: new Date(2026, 9, day, 10, 0).toISOString(),
      ...rest,
    });

    function seedEvents() {
      useEventsStore().events = [
        event("1", 5, { title: "Réunion projet" }),
        event("2", 12, { title: "Anniversaire", location: "Chez Paul", category: "famille" }),
        event("3", 19, { title: "Sport", description: "Footing", category: "loisirs" }),
      ].map(asEvent);
    }

    const seriesIdsIn = (window: { from: Date; to: Date }) =>
      useCalendarStore()
        .occurrencesIn(window.from, window.to)
        .map((occurrence) => occurrence.seriesId);

    it("retourne tous les événements de la fenêtre sans filtre actif", () => {
      seedEvents();
      expect(useCalendarStore().occurrencesIn(OCTOBER.from, OCTOBER.to)).toHaveLength(3);
    });

    it("exclut les événements des catégories désactivées", () => {
      seedEvents();
      useCalendarStore().toggleCategory("famille");
      expect(seriesIdsIn(OCTOBER)).toEqual(["1", "3"]);
    });

    it("filtre par recherche texte sur title/description/location (insensible à la casse)", () => {
      seedEvents();
      useCalendarStore().searchQuery = "PAUL";
      expect(seriesIdsIn(OCTOBER)).toEqual(["2"]);
    });

    it("combine filtre catégorie et recherche texte", () => {
      seedEvents();
      const store = useCalendarStore();
      store.searchQuery = "footing";
      store.toggleCategory("loisirs");
      expect(store.occurrencesIn(OCTOBER.from, OCTOBER.to)).toEqual([]);
    });

    it("exclut les événements hors de la fenêtre demandée", () => {
      seedEvents();
      expect(seriesIdsIn({ from: new Date(2026, 9, 10), to: new Date(2026, 9, 15, 23, 59, 59) })).toEqual(["2"]);
    });

    // NFR-002 : un événement non récurrent emprunte le même chemin et ressort
    // en une occurrence unique de lui-même.
    it("renvoie un événement non récurrent en une seule occurrence", () => {
      seedEvents();
      const occurrences = useCalendarStore().occurrencesIn(OCTOBER.from, OCTOBER.to);
      expect(occurrences[0].seriesId).toBe("1");
      expect(occurrences[0].occurrenceStart).toBe(occurrences[0].start);
    });

    it("développe une série en plusieurs occurrences dans la fenêtre", () => {
      useEventsStore().events = [
        asEvent(
          event("s1", 5, {
            title: "Réunion équipe",
            recurrence: { freq: "weekly", interval: 1, until: new Date(2026, 9, 31).toISOString() },
          }),
        ),
      ];

      const occurrences = useCalendarStore().occurrencesIn(OCTOBER.from, OCTOBER.to);
      expect(occurrences).toHaveLength(4);
      expect(occurrences.every((o) => o.seriesId === "s1")).toBe(true);
      expect(new Set(occurrences.map((o) => o.id)).size).toBe(4);
    });

    it("retourne les occurrences triées par date croissante", () => {
      seedEvents();
      const starts = useCalendarStore()
        .occurrencesIn(OCTOBER.from, OCTOBER.to)
        .map((o) => new Date(o.start).getTime());
      expect(starts).toEqual([...starts].sort((a, b) => a - b));
    });
  });

  describe("searchResults", () => {
    const at = (id: string, month: number, day: number, title: string, category: string) => ({
      id,
      title,
      category,
      start: new Date(2026, month, day, 9, 0).toISOString(),
      end: new Date(2026, month, day, 10, 0).toISOString(),
    });

    function seed() {
      useEventsStore().events = [
        at("1", 9, 5, "Réunion B", "travail"),
        at("2", 2, 1, "Réunion A", "travail"),
        at("3", 3, 1, "Sport", "loisirs"),
      ].map(asEvent);
    }

    it("est vide sans recherche", () => {
      seed();
      expect(useCalendarStore().searchResults).toEqual([]);
    });

    it("est vide sans aucun événement", () => {
      const store = useCalendarStore();
      store.searchQuery = "réunion";
      expect(store.searchResults).toEqual([]);
    });

    it("retourne les correspondances toutes dates confondues, triées par date", () => {
      seed();
      const store = useCalendarStore();
      store.searchQuery = "réunion";
      expect(store.searchResults.map((occurrence) => occurrence.seriesId)).toEqual(["2", "1"]);
    });

    // La fenêtre de recherche va jusqu'au `until` des séries existantes : les
    // occurrences hors du mois affiché doivent être trouvées.
    it("trouve les occurrences d'une série au-delà de son ancre", () => {
      useEventsStore().events = [
        asEvent({
          ...at("s1", 9, 5, "Réunion équipe", "travail"),
          recurrence: { freq: "monthly", interval: 1, until: new Date(2027, 2, 31).toISOString() },
        }),
      ];

      const store = useCalendarStore();
      store.searchQuery = "équipe";
      expect(store.searchResults.length).toBeGreaterThan(1);
    });
  });
});
