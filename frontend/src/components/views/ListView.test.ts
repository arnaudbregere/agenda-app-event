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

  // Régression : le groupement se faisait sur `start` seul, donc un événement
  // sur plusieurs jours n'apparaissait que le jour où il commençait, alors que
  // la vue Mois l'étalait sur tous les jours couverts.
  it("affiche un événement sur plusieurs jours dans chacun des jours qu'il couvre", () => {
    const store = useCalendarStore();
    const eventsStore = useEventsStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    eventsStore.categories = asCategories([{ id: "travail", label: "Travail", color: "#0b8043" }]);
    eventsStore.events = asEvents([
      {
        id: "1",
        title: "Séminaire",
        description: "",
        location: "",
        category: "travail",
        allDay: true,
        start: new Date(2026, 7, 10, 0, 0).toISOString(),
        end: new Date(2026, 7, 12, 23, 59, 59).toISOString(),
      },
    ]);
    const wrapper = mount(ListView);

    const groups = wrapper.findAll(".c-agenda-list__group");
    expect(groups).toHaveLength(3);
    for (const group of groups) {
      expect(group.text()).toContain("Séminaire");
    }
    expect(groups.map((g) => g.find(".c-agenda-list__date-day").text())).toEqual(["10", "11", "12"]);
  });

  // B2 de la revue : afficher les start/end absolus sur chaque jour couvert
  // annonçait « 09:00 – 17:00 » le 11, jour que l'événement occupe en entier.
  it("borne les heures au jour du groupe pour un événement chronométré sur plusieurs jours", () => {
    const store = useCalendarStore();
    const eventsStore = useEventsStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    eventsStore.categories = asCategories([{ id: "travail", label: "Travail", color: "#0b8043" }]);
    eventsStore.events = asEvents([
      {
        id: "1",
        title: "Séminaire",
        description: "",
        location: "",
        category: "travail",
        allDay: false,
        start: new Date(2026, 7, 10, 9, 0).toISOString(),
        end: new Date(2026, 7, 12, 17, 0).toISOString(),
      },
    ]);
    const wrapper = mount(ListView);

    const times = wrapper.findAll(".c-agenda-item__time").map((t) => t.text());
    expect(times).toEqual(["09:00 – 23:59", "00:00 – 23:59", "00:00 – 17:00"]);
  });

  // Gèle le retrait du filtre `isWithinInterval` : un événement qui commence au
  // mois précédent et déborde sur le mois affiché apparaît sur les jours qu'il
  // y couvre, comme en vue Mois. Remettre le filtre fait échouer ce test seul.
  it("affiche un événement qui commence au mois précédent et déborde sur le mois affiché", () => {
    const store = useCalendarStore();
    const eventsStore = useEventsStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    eventsStore.categories = asCategories([{ id: "travail", label: "Travail", color: "#0b8043" }]);
    eventsStore.events = asEvents([
      {
        id: "1",
        title: "Congés",
        description: "",
        location: "",
        category: "travail",
        allDay: true,
        start: new Date(2026, 6, 29, 0, 0).toISOString(),
        end: new Date(2026, 7, 2, 23, 59, 59).toISOString(),
      },
    ]);
    const wrapper = mount(ListView);

    const groups = wrapper.findAll(".c-agenda-list__group");
    expect(groups.map((g) => g.find(".c-agenda-list__date-day").text())).toEqual(["1", "2"]);
    expect(groups[0].text()).toContain("Congés");
  });

  // Même défaut que le formulaire de création (23:00 → 00:00) : l'événement ne
  // dure rien le lendemain, il ne doit pas y créer un groupe.
  it("n'affiche pas le lendemain un événement qui se termine à minuit", () => {
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
    const wrapper = mount(ListView);

    const groups = wrapper.findAll(".c-agenda-list__group");
    expect(groups).toHaveLength(1);
    expect(groups[0].find(".c-agenda-list__date-day").text()).toBe("20");
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
    expect(store.editingEvent?.seriesId).toBe("1");
  });
});
