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

    const btn = wrapper.findAll(".c-sidebar__quick-btn").find((b) => b.text() === label)!;
    await btn.trigger("click");

    expect(store.currentView).toBe(view);
    expect(store.currentDate.toDateString()).toBe(new Date().toDateString());
  });
});
