import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import TimeGrid from "./TimeGrid.vue";
import { useCalendarStore } from "../../stores/calendar.js";
import { useEventsStore } from "../../stores/events.js";

const DAY = new Date(2026, 7, 28); // vendredi 28 août 2026

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("TimeGrid", () => {
  it("affiche les 24 heures de la journée en gouttière", () => {
    const wrapper = mount(TimeGrid, { props: { days: [DAY] } });

    const labels = wrapper.findAll(".c-time-grid__hour-label");
    expect(labels).toHaveLength(24);
    expect(labels[0].text()).toBe("00:00");
    expect(labels[23].text()).toBe("23:00");
  });

  it("positionne un événement chronométré selon son heure de début/fin (HOUR_ROW_HEIGHT = 48px)", () => {
    const eventsStore = useEventsStore();
    eventsStore.categories = [{ id: "travail", label: "Travail", color: "#0b8043" }];
    eventsStore.events = [
      {
        id: "1",
        title: "Réunion",
        description: "",
        location: "",
        category: "travail",
        allDay: false,
        start: new Date(2026, 7, 28, 9, 0).toISOString(),
        end: new Date(2026, 7, 28, 10, 0).toISOString(),
      },
    ];
    const wrapper = mount(TimeGrid, { props: { days: [DAY] } });

    const block = wrapper.find(".c-event-block");
    expect(block.exists()).toBe(true);
    expect(block.attributes("style")).toContain("top: 432px"); // 9h * 48px
    expect(block.attributes("style")).toContain("height: 48px"); // 1h * 48px
  });

  it("affiche les événements 'toute la journée' dans le bandeau dédié, pas dans la grille horaire", () => {
    const eventsStore = useEventsStore();
    eventsStore.categories = [{ id: "travail", label: "Travail", color: "#0b8043" }];
    eventsStore.events = [
      {
        id: "1",
        title: "Séminaire",
        description: "",
        location: "",
        category: "travail",
        allDay: true,
        start: new Date(2026, 7, 28, 0, 0).toISOString(),
        end: new Date(2026, 7, 28, 23, 59).toISOString(),
      },
    ];
    const wrapper = mount(TimeGrid, { props: { days: [DAY] } });

    expect(wrapper.find(".c-event-allday").text()).toBe("Séminaire");
    expect(wrapper.find(".c-event-block").exists()).toBe(false);
  });

  it("cliquer sur une ligne d'heure ouvre la modale de création à l'heure cliquée", async () => {
    const store = useCalendarStore();
    const wrapper = mount(TimeGrid, { props: { days: [DAY] } });

    const hourLines = wrapper.findAll(".c-time-grid__hour-line");
    await hourLines[14].trigger("click"); // 14h

    expect(store.modalOpen).toBe(true);
    expect(store.modalDefaults.start.getHours()).toBe(14);
    expect(store.modalDefaults.end.getHours()).toBe(15);
  });

  it("cliquer sur un événement chronométré ouvre la modale d'édition", async () => {
    const store = useCalendarStore();
    const eventsStore = useEventsStore();
    eventsStore.categories = [{ id: "travail", label: "Travail", color: "#0b8043" }];
    eventsStore.events = [
      {
        id: "1",
        title: "Réunion",
        description: "",
        location: "",
        category: "travail",
        allDay: false,
        start: new Date(2026, 7, 28, 9, 0).toISOString(),
        end: new Date(2026, 7, 28, 10, 0).toISOString(),
      },
    ];
    const wrapper = mount(TimeGrid, { props: { days: [DAY] } });

    await wrapper.find(".c-event-block").trigger("click");

    expect(store.modalOpen).toBe(true);
    expect(store.editingEvent?.id).toBe("1");
  });
});
