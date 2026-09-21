import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import MiniCalendar from "./MiniCalendar.vue";
import { useCalendarStore } from "../stores/calendar.js";

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("MiniCalendar", () => {
  it("affiche le mois/année de la date courante du store", () => {
    const store = useCalendarStore();
    store.setCurrentDate(new Date(2026, 7, 15)); // 15 août 2026
    const wrapper = mount(MiniCalendar);

    expect(wrapper.find(".c-mini-cal__title").text()).toBe(
      format(new Date(2026, 7, 15), "MMMM yyyy", { locale: fr }),
    );
  });

  it("le bouton mois suivant avance la date courante d'un mois", async () => {
    const store = useCalendarStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    const wrapper = mount(MiniCalendar);

    await wrapper.find('[aria-label="Mois suivant"]').trigger("click");

    expect(format(store.currentDate, "yyyy-MM")).toBe("2026-09");
  });

  it("le bouton mois précédent recule la date courante d'un mois", async () => {
    const store = useCalendarStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    const wrapper = mount(MiniCalendar);

    await wrapper.find('[aria-label="Mois précédent"]').trigger("click");

    expect(format(store.currentDate, "yyyy-MM")).toBe("2026-07");
  });

  it("cliquer sur un jour du mois affiché définit la date courante du store", async () => {
    const store = useCalendarStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    const wrapper = mount(MiniCalendar);

    const days = wrapper.findAll(".c-mini-cal__day");
    const target = days.find((d) => d.text() === "20" && !d.classes().includes("is-outside"));
    await target.trigger("click");

    expect(format(store.currentDate, "yyyy-MM-dd")).toBe("2026-08-20");
  });

  it("marque uniquement le jour sélectionné avec is-selected", () => {
    const store = useCalendarStore();
    store.setCurrentDate(new Date(2026, 7, 15));
    const wrapper = mount(MiniCalendar);

    const selected = wrapper.findAll(".c-mini-cal__day.is-selected");
    expect(selected).toHaveLength(1);
    expect(selected[0].text()).toBe("15");
  });
});
