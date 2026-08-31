import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useCalendarStore } from "./calendar.js";
import { useEventsStore } from "./events.js";

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
      store.openCreateModal(defaults);
      expect(store.modalOpen).toBe(true);
      expect(store.editingEvent).toBeNull();
      expect(store.modalDefaults).toEqual(defaults);
    });

    it("openEditModal ouvre en mode édition avec l'événement", () => {
      const store = useCalendarStore();
      const event = { id: "1", title: "Existant" };
      store.openEditModal(event);
      expect(store.modalOpen).toBe(true);
      expect(store.editingEvent).toEqual(event);
      expect(store.modalDefaults).toBeNull();
    });

    it("closeModal réinitialise tout", () => {
      const store = useCalendarStore();
      store.openEditModal({ id: "1" });
      store.closeModal();
      expect(store.modalOpen).toBe(false);
      expect(store.editingEvent).toBeNull();
      expect(store.modalDefaults).toBeNull();
    });
  });

  describe("filteredEvents", () => {
    function seedEvents() {
      const eventsStore = useEventsStore();
      eventsStore.events = [
        { id: "1", title: "Réunion projet", description: "", location: "", category: "travail" },
        { id: "2", title: "Anniversaire", description: "", location: "Chez Paul", category: "famille" },
        { id: "3", title: "Sport", description: "Footing", location: "", category: "loisirs" },
      ];
    }

    it("retourne tous les événements sans filtre actif", () => {
      seedEvents();
      const store = useCalendarStore();
      expect(store.filteredEvents).toHaveLength(3);
    });

    it("exclut les événements des catégories désactivées", () => {
      seedEvents();
      const store = useCalendarStore();
      store.toggleCategory("famille");
      expect(store.filteredEvents.map((e) => e.id)).toEqual(["1", "3"]);
    });

    it("filtre par recherche texte sur title/description/location (insensible à la casse)", () => {
      seedEvents();
      const store = useCalendarStore();
      store.searchQuery = "PAUL";
      expect(store.filteredEvents.map((e) => e.id)).toEqual(["2"]);
    });

    it("combine filtre catégorie et recherche texte", () => {
      seedEvents();
      const store = useCalendarStore();
      store.searchQuery = "footing";
      store.toggleCategory("loisirs");
      expect(store.filteredEvents).toEqual([]);
    });
  });
});
