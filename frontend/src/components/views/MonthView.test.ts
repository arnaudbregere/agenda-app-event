import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import MonthView from "./MonthView.vue";
import { useCalendarStore } from "../../stores/calendar.js";
import { useEventsStore } from "../../stores/events.js";
import { asCategories, asEvents } from "../../test-support/fixtures.js";

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("MonthView", () => {
  it("affiche des semaines complètes de 7 jours pour le mois courant", () => {
    const store = useCalendarStore();
    store.setCurrentDate(new Date(2026, 7, 15)); // août 2026
    const wrapper = mount(MonthView);

    const weeks = wrapper.findAll(".c-month-grid__week");
    expect(weeks.length).toBeGreaterThan(0);
    weeks.forEach((week) => {
      expect(week.findAll(".c-month-grid__cell")).toHaveLength(7);
    });
  });

  it("met en évidence le jour courant avec is-today", () => {
    const store = useCalendarStore();
    store.setCurrentDate(new Date());
    const wrapper = mount(MonthView);

    expect(wrapper.findAll(".c-month-grid__cell.is-today")).toHaveLength(1);
  });

  it("cliquer sur une cellule ouvre la modale de création (mode création, pas d'événement en édition)", async () => {
    const store = useCalendarStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    const wrapper = mount(MonthView);

    const cells = wrapper.findAll(".c-month-grid__cell");
    await cells[0].trigger("click");

    expect(store.modalOpen).toBe(true);
    expect(store.editingEvent).toBeNull();
  });

  it("cliquer sur le numéro d'un jour bascule vers la vue jour à cette date", async () => {
    const store = useCalendarStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    const wrapper = mount(MonthView);

    const dayButtons = wrapper.findAll(".c-month-grid__day-number");
    await dayButtons[0].trigger("click");

    expect(store.currentView).toBe("day");
  });

  it("affiche les événements du jour et ouvre la modale d'édition au clic sur un pill", async () => {
    const store = useCalendarStore();
    const eventsStore = useEventsStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    eventsStore.categories = asCategories([{ id: "travail", label: "Travail", color: "#0b8043" }]);
    eventsStore.events = asEvents([
      {
        id: "1",
        title: "Réunion",
        description: "",
        location: "",
        category: "travail",
        allDay: false,
        start: new Date(2026, 7, 15, 9, 0).toISOString(),
        end: new Date(2026, 7, 15, 10, 0).toISOString(),
      },
    ]);
    const wrapper = mount(MonthView);

    const pill = wrapper.find(".c-event-pill");
    expect(pill.exists()).toBe(true);
    expect(pill.text()).toContain("Réunion");

    await pill.trigger("click");

    expect(store.modalOpen).toBe(true);
    expect(store.editingEvent?.id).toBe("1");
  });
});
