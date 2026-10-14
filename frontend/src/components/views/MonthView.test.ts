import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import MonthView from "./MonthView.vue";
import { useCalendarStore } from "../../stores/calendar.js";
import { useEventsStore } from "../../stores/events.js";
import { asCategories, asEvents } from "../../test-support/fixtures.js";
import { endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import * as recurrence from "../../composables/useRecurrence.js";

const WEEK_OPTIONS = { weekStartsOn: 1 as const };

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
    expect(store.editingEvent?.seriesId).toBe("1");
  });

  // Borne stricte de eventOccursOnDay : un événement qui se termine à minuit
  // n'occupe rien le lendemain. Sans elle le défaut du formulaire
  // (23:00 → 00:00) produisait une seconde pilule sur le jour suivant.
  it("n'affiche qu'une pilule pour un événement qui se termine à minuit", () => {
    const store = useCalendarStore();
    const eventsStore = useEventsStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    eventsStore.categories = asCategories([{ id: "travail", label: "Travail", color: "#0b8043" }]);
    eventsStore.events = asEvents([
      {
        id: "1",
        title: "Veille",
        description: "",
        location: "",
        category: "travail",
        allDay: false,
        start: new Date(2026, 7, 20, 23, 0).toISOString(),
        end: new Date(2026, 7, 21, 0, 0).toISOString(),
      },
    ]);
    const wrapper = mount(MonthView);

    expect(wrapper.findAll(".c-event-pill")).toHaveLength(1);
  });

  // Verrouille le endOfDay() de la fenêtre passée à occurrencesIn : sans lui,
  // `to` tombe à minuit et tout événement du dernier jour affiché disparaît.
  it("affiche un événement situé le dernier jour de la grille", () => {
    const store = useCalendarStore();
    const eventsStore = useEventsStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    eventsStore.categories = asCategories([{ id: "travail", label: "Travail", color: "#0b8043" }]);

    const lastDay = endOfWeek(startOfMonth(new Date(2026, 8, 1)), WEEK_OPTIONS);
    eventsStore.events = asEvents([
      {
        id: "last",
        title: "Dernier jour",
        description: "",
        location: "",
        category: "travail",
        allDay: false,
        start: new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), 9, 0).toISOString(),
        end: new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), 10, 0).toISOString(),
      },
    ]);

    expect(mount(MonthView).text()).toContain("Dernier jour");
  });

  it("affiche toutes les occurrences d'une série traversant la grille", () => {
    const store = useCalendarStore();
    const eventsStore = useEventsStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    eventsStore.categories = asCategories([{ id: "travail", label: "Travail", color: "#0b8043" }]);
    eventsStore.events = asEvents([
      {
        id: "s1",
        title: "Hebdo",
        description: "",
        location: "",
        category: "travail",
        allDay: false,
        start: new Date(2026, 7, 3, 9, 0).toISOString(),
        end: new Date(2026, 7, 3, 10, 0).toISOString(),
        recurrence: { freq: "weekly", interval: 1, until: new Date(2026, 7, 31, 23, 59).toISOString() },
      },
    ]);

    const wrapper = mount(MonthView);
    // Les 5 lundis d'août 2026 : 3, 10, 17, 24, 31.
    expect(wrapper.findAll(".c-event-pill")).toHaveLength(5);
  });

  // Verrouille R-004 : un getter Pinia paramétré n'est pas mémoïsé. Appeler
  // occurrencesIn par cellule développerait les séries 42 fois par rendu.
  // Sans ce test, la règle ne vit que dans un commentaire.
  it("ne développe les séries qu'une seule fois par rendu", () => {
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

    const spy = vi.spyOn(recurrence, "expandSeries");
    mount(MonthView);

    // 1 événement x 1 appel de fenêtre. Par cellule, ce serait 42.
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
