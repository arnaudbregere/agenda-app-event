import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import AppHeader from "./AppHeader.vue";
import { useCalendarStore } from "../stores/calendar.js";
import { useEventsStore } from "../stores/events.js";
import { asEvents } from "../test-support/fixtures.js";

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("AppHeader", () => {
  it("la vue Mois est active par défaut", () => {
    const wrapper = mount(AppHeader);

    const activeBtn = wrapper.find(".c-view-switcher__btn.is-active");
    expect(activeBtn.text()).toBe("Mois");
  });

  it("cliquer sur un bouton de vue change la vue courante du store et l'état actif", async () => {
    const store = useCalendarStore();
    const wrapper = mount(AppHeader);

    const buttons = wrapper.findAll(".c-view-switcher__btn");
    const weekBtn = buttons.find((b) => b.text() === "Semaine")!;
    await weekBtn.trigger("click");

    expect(store.currentView).toBe("week");
    expect(weekBtn.classes()).toContain("is-active");
  });

  it("la saisie de recherche met à jour store.searchQuery", async () => {
    const store = useCalendarStore();
    const wrapper = mount(AppHeader);

    await wrapper.find('input[type="search"]').setValue("réunion");

    expect(store.searchQuery).toBe("réunion");
  });

  it("le bouton d'effacement n'apparaît que pendant une recherche, et vide la recherche", async () => {
    const store = useCalendarStore();
    const wrapper = mount(AppHeader);

    expect(wrapper.find(".c-search__clear").exists()).toBe(false);

    await wrapper.find('input[type="search"]').setValue("réunion");
    expect(wrapper.find(".c-search__clear").exists()).toBe(true);

    await wrapper.find(".c-search__clear").trigger("click");
    expect(store.searchQuery).toBe("");
  });

  it("le bouton Aujourd'hui remet la date courante à aujourd'hui", async () => {
    const store = useCalendarStore();
    store.setCurrentDate(new Date(2000, 0, 1));
    const wrapper = mount(AppHeader);

    await wrapper.find(".c-btn--text").trigger("click");

    expect(store.currentDate.toDateString()).toBe(new Date().toDateString());
  });

  describe("résultats de recherche", () => {
    function seed() {
      useEventsStore().events = asEvents([
        { id: "1", title: "Réunion projet", start: "2026-10-05T09:00:00", end: "2026-10-05T10:00:00", category: "travail" },
      ]);
    }

    it("affiche une liste de résultats sous la barre pendant la recherche", async () => {
      seed();
      const wrapper = mount(AppHeader, { attachTo: document.body });
      const input = wrapper.find('input[type="search"]');
      await input.trigger("focusin");
      await input.setValue("réunion");

      const items = wrapper.findAll(".c-search-results__item");
      expect(items).toHaveLength(1);
      expect(items[0].text()).toContain("Réunion projet");
      wrapper.unmount();
    });

    it("affiche un message quand rien ne correspond", async () => {
      seed();
      const wrapper = mount(AppHeader);
      const input = wrapper.find('input[type="search"]');
      await input.trigger("focusin");
      await input.setValue("zzz");

      expect(wrapper.find(".c-search-results__empty").exists()).toBe(true);
    });

    it("cliquer sur un résultat ouvre l'événement et ferme la liste", async () => {
      seed();
      const store = useCalendarStore();
      const wrapper = mount(AppHeader);
      const input = wrapper.find('input[type="search"]');
      await input.trigger("focusin");
      await input.setValue("réunion");

      await wrapper.find(".c-search-results__item").trigger("click");

      expect(store.modalOpen).toBe(true);
      expect(store.editingEvent?.id).toBe("1");
      expect(wrapper.find(".c-search-results").exists()).toBe(false);
    });

    it("Échap ferme la liste", async () => {
      seed();
      const wrapper = mount(AppHeader);
      const input = wrapper.find('input[type="search"]');
      await input.trigger("focusin");
      await input.setValue("réunion");
      await input.trigger("keydown", { key: "Escape" });

      expect(wrapper.find(".c-search-results").exists()).toBe(false);
    });
  });
});
