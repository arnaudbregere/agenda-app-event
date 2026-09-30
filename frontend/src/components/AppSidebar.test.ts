import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import AppSidebar from "./AppSidebar.vue";
import { useCalendarStore } from "../stores/calendar.js";

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("AppSidebar — accès rapide", () => {
  it.each([
    ["Aujourd'hui", "day"],
    ["Cette semaine", "week"],
    ["Ce mois-ci", "month"],
  ])("« %s » ouvre la vue %s sur la date du jour", async (label, view) => {
    const store = useCalendarStore();
    store.setView("list");
    store.setCurrentDate(new Date(2000, 0, 1));
    const wrapper = mount(AppSidebar);

    const btn = wrapper.findAll(".c-sidebar__quick-btn").find((button) => button.text() === label)!;
    await btn.trigger("click");

    expect(store.currentView).toBe(view);
    expect(store.currentDate.toDateString()).toBe(new Date().toDateString());
  });
});

describe("AppSidebar — drawer mobile", () => {
  it("Échap referme la sidebar quand elle est ouverte", async () => {
    const store = useCalendarStore();
    store.openSidebar();
    mount(AppSidebar, { attachTo: document.body });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await Promise.resolve();

    expect(store.isSidebarOpen).toBe(false);
  });

  it("le focus part vers le premier élément du panneau à l'ouverture", async () => {
    const store = useCalendarStore();
    const wrapper = mount(AppSidebar, { attachTo: document.body });

    store.openSidebar();
    await wrapper.vm.$nextTick();
    await Promise.resolve();

    expect(document.activeElement?.className).toContain("c-sidebar__create");
    wrapper.unmount();
  });
});
