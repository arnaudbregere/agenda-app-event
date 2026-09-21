import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import CategoryFilter from "./CategoryFilter.vue";
import { useEventsStore } from "../stores/events.js";
import { useCalendarStore } from "../stores/calendar.js";

const CATEGORIES = [
  { id: "travail", label: "Travail", color: "#0b8043" },
  { id: "famille", label: "Famille", color: "#e67c73" },
];

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("CategoryFilter", () => {
  it("affiche une entrée par catégorie du store events", () => {
    useEventsStore().categories = CATEGORIES;
    const wrapper = mount(CategoryFilter);

    expect(wrapper.findAll(".c-category-filter__item")).toHaveLength(2);
    expect(wrapper.text()).toContain("Travail");
    expect(wrapper.text()).toContain("Famille");
  });

  it("toutes les catégories sont cochées par défaut", () => {
    useEventsStore().categories = CATEGORIES;
    const wrapper = mount(CategoryFilter);

    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox) => expect(checkbox.element.checked).toBe(true));
  });

  it("décocher une catégorie appelle toggleCategory et retire l'état visuel is-checked", async () => {
    useEventsStore().categories = CATEGORIES;
    const calendarStore = useCalendarStore();
    const wrapper = mount(CategoryFilter);

    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[0].setValue(false);

    expect(calendarStore.isCategoryActive("travail")).toBe(false);
    expect(wrapper.findAll(".c-category-filter__checkbox")[0].classes()).not.toContain("is-checked");
  });

  it("re-cocher une catégorie précédemment exclue la réactive", async () => {
    useEventsStore().categories = CATEGORIES;
    const calendarStore = useCalendarStore();
    calendarStore.toggleCategory("travail"); // exclue avant le montage
    const wrapper = mount(CategoryFilter);

    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    expect(checkboxes[0].element.checked).toBe(false);

    await checkboxes[0].setValue(true);

    expect(calendarStore.isCategoryActive("travail")).toBe(true);
    expect(wrapper.findAll(".c-category-filter__checkbox")[0].classes()).toContain("is-checked");
  });
});
