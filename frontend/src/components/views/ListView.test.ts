import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import ListView from "./ListView.vue";
import { useCalendarStore } from "../../stores/calendar.js";
import { useEventsStore } from "../../stores/events.js";
import { asCategories, asEvents } from "../../test-support/fixtures.js";

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("ListView", () => {
  it("affiche un message si aucun événement ce mois-ci", () => {
    const store = useCalendarStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    const wrapper = mount(ListView);

    expect(wrapper.find(".c-agenda-list__empty").exists()).toBe(true);
    expect(wrapper.text()).toContain("Aucun événement ce mois-ci.");
  });

  it("regroupe les événements par jour, groupes triés chronologiquement", () => {
    const store = useCalendarStore();
    const eventsStore = useEventsStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    eventsStore.categories = asCategories([{ id: "travail", label: "Travail", color: "#0b8043" }]);
    eventsStore.events = asEvents([
      {
        id: "1",
        title: "Second",
        description: "",
        location: "",
        category: "travail",
        allDay: false,
        start: new Date(2026, 7, 20, 14, 0).toISOString(),
        end: new Date(2026, 7, 20, 15, 0).toISOString(),
      },
      {
        id: "2",
        title: "Premier",
        description: "",
        location: "",
        category: "travail",
        allDay: false,
        start: new Date(2026, 7, 5, 9, 0).toISOString(),
        end: new Date(2026, 7, 5, 10, 0).toISOString(),
      },
    ]);
    const wrapper = mount(ListView);

    const groups = wrapper.findAll(".c-agenda-list__group");
    expect(groups).toHaveLength(2);
    expect(groups[0].text()).toContain("Premier");
    expect(groups[1].text()).toContain("Second");
  });

  it("exclut du mois affiché les événements d'un autre mois", () => {
    const store = useCalendarStore();
    const eventsStore = useEventsStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    eventsStore.categories = asCategories([{ id: "travail", label: "Travail", color: "#0b8043" }]);
    eventsStore.events = asEvents([
      {
        id: "1",
        title: "Hors mois",
        description: "",
        location: "",
        category: "travail",
        allDay: false,
        start: new Date(2026, 8, 5, 9, 0).toISOString(),
        end: new Date(2026, 8, 5, 10, 0).toISOString(),
      },
    ]);
    const wrapper = mount(ListView);

    expect(wrapper.find(".c-agenda-list__empty").exists()).toBe(true);
  });

  it("cliquer sur un événement ouvre la modale d'édition avec cet événement", async () => {
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
        start: new Date(2026, 7, 20, 14, 0).toISOString(),
        end: new Date(2026, 7, 20, 15, 0).toISOString(),
      },
    ]);
    const wrapper = mount(ListView);

    await wrapper.find(".c-agenda-item").trigger("click");

    expect(store.modalOpen).toBe(true);
    expect(store.editingEvent?.id).toBe("1");
  });
});
