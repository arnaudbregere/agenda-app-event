import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, DOMWrapper } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { nextTick } from "vue";
import { format } from "date-fns";
import EventModal from "./EventModal.vue";
import { useCalendarStore } from "../stores/calendar.js";
import { useEventsStore } from "../stores/events.js";
import { asCategories, asEvent } from "../test-support/fixtures.js";

const CATEGORIES = asCategories([
  { id: "travail", label: "Travail", color: "#0b8043" },
  { id: "famille", label: "Famille", color: "#e67c73" },
]);

const inputValue = (input: { element: Element }) => (input.element as HTMLInputElement).value;

let wrapper: ReturnType<typeof mount> | undefined;

function mountModal() {
  wrapper = mount(EventModal, { attachTo: document.body });
  return wrapper;
}

// EventModal se rend via <Teleport to="body"> : son contenu n'est pas un
// descendant du root du wrapper monté, donc on interroge document.body
// directement plutôt que `wrapper.find(...)`.
function body() {
  return new DOMWrapper(document.body);
}

beforeEach(() => {
  setActivePinia(createPinia());
  useEventsStore().categories = CATEGORIES;
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe("EventModal", () => {
  it("n'affiche rien tant que la modale n'est pas ouverte", () => {
    mountModal();
    expect(body().find(".c-modal__overlay").exists()).toBe(false);
  });

  describe("mode création", () => {
    it("affiche le titre 'Nouvel événement' et pas de bouton supprimer", async () => {
      const calendarStore = useCalendarStore();
      mountModal();
      calendarStore.openCreateModal();
      await nextTick();

      expect(body().find("#event-modal-title").text()).toBe("Nouvel événement");
      expect(body().find(".c-btn--danger").exists()).toBe(false);
    });
  });

  describe("mode édition", () => {
    const event = {
      id: "1",
      title: "Réunion projet",
      description: "Point d'équipe",
      location: "Salle A",
      allDay: false,
      category: "famille",
      start: "2026-08-28T09:00:00.000Z",
      end: "2026-08-28T10:00:00.000Z",
    };

    it("préremplit le formulaire avec l'événement et affiche 'Modifier l'événement'", async () => {
      const calendarStore = useCalendarStore();
      mountModal();
      calendarStore.openEditModal(asEvent(event));
      await nextTick();

      expect(body().find("#event-modal-title").text()).toBe("Modifier l'événement");
      expect(inputValue(body().find("#event-title"))).toBe("Réunion projet");
      expect(inputValue(body().find("#event-location"))).toBe("Salle A");
      expect(inputValue(body().find("#event-description"))).toBe("Point d'équipe");
      expect(body().find(".c-btn--danger").exists()).toBe(true);
    });
  });

  describe("régression : piège de focus à l'ouverture", () => {
    it("déplace le focus dans #event-title quand la modale s'ouvre", async () => {
      const calendarStore = useCalendarStore();
      mountModal();
      calendarStore.openCreateModal();
      await flushPromises();

      expect(document.activeElement?.id).toBe("event-title");
    });
  });

  describe("validation", () => {
    it("bloque la soumission si le titre est vide", async () => {
      const calendarStore = useCalendarStore();
      const eventsStore = useEventsStore();
      const createSpy = vi.spyOn(eventsStore, "createEvent");
      mountModal();
      calendarStore.openCreateModal();
      await nextTick();

      await body().find("form").trigger("submit");

      expect(body().text()).toContain("Le titre est requis.");
      expect(createSpy).not.toHaveBeenCalled();
      expect(calendarStore.modalOpen).toBe(true);
    });

    it("bloque la soumission si la date de fin est avant la date de début", async () => {
      const calendarStore = useCalendarStore();
      const eventsStore = useEventsStore();
      const createSpy = vi.spyOn(eventsStore, "createEvent");
      mountModal();
      calendarStore.openCreateModal();
      await nextTick();

      await body().find("#event-title").setValue("Titre valide");
      const dateInputs = body().findAll('input[type="date"]');
      const [y, m, d] = inputValue(dateInputs[0]!).split("-").map(Number);
      const earlier = format(new Date(y, m - 1, d - 1), "yyyy-MM-dd");
      await dateInputs[1].setValue(earlier);

      await body().find("form").trigger("submit");

      expect(body().text()).toContain("La date de fin doit être après la date de début.");
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe("sélection de catégorie", () => {
    it("cliquer sur un swatch sélectionne la catégorie correspondante", async () => {
      const calendarStore = useCalendarStore();
      mountModal();
      calendarStore.openCreateModal();
      await nextTick();

      const swatches = body().findAll(".c-form__swatch");
      expect(swatches).toHaveLength(CATEGORIES.length);
      // catégorie par défaut "autre" : aucun swatch de la liste n'est sélectionné au départ
      expect(swatches.some((swatch) => swatch.classes().includes("is-selected"))).toBe(false);

      await swatches[1].trigger("click");

      expect(swatches[1].classes()).toContain("is-selected");
      expect(swatches[0].classes()).not.toContain("is-selected");
    });
  });

  describe("soumission", () => {
    it("mode création : appelle eventsStore.createEvent avec le payload puis ferme la modale", async () => {
      const calendarStore = useCalendarStore();
      const eventsStore = useEventsStore();
      const createSpy = vi.spyOn(eventsStore, "createEvent").mockResolvedValue(asEvent({ id: "new" }));
      mountModal();
      calendarStore.openCreateModal();
      await nextTick();

      await body().find("#event-title").setValue("Nouvel événement de test");
      await body().find("form").trigger("submit");
      await flushPromises();

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy.mock.calls[0][0]).toMatchObject({ title: "Nouvel événement de test" });
      expect(calendarStore.modalOpen).toBe(false);
    });

    it("mode édition : appelle eventsStore.updateEvent avec l'id existant puis ferme la modale", async () => {
      const calendarStore = useCalendarStore();
      const eventsStore = useEventsStore();
      const event = {
        id: "42",
        title: "Ancien titre",
        description: "",
        location: "",
        allDay: false,
        category: "travail",
        start: "2026-08-28T09:00:00.000Z",
        end: "2026-08-28T10:00:00.000Z",
      };
      const updateSpy = vi.spyOn(eventsStore, "updateEvent").mockResolvedValue(asEvent({ ...event, title: "Nouveau titre" }));
      mountModal();
      calendarStore.openEditModal(asEvent(event));
      await nextTick();

      await body().find("#event-title").setValue("Nouveau titre");
      await body().find("form").trigger("submit");
      await flushPromises();

      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledWith("42", expect.objectContaining({ title: "Nouveau titre" }));
      expect(calendarStore.modalOpen).toBe(false);
    });

    it("affiche l'erreur serveur si la soumission échoue et garde la modale ouverte", async () => {
      const calendarStore = useCalendarStore();
      const eventsStore = useEventsStore();
      vi.spyOn(eventsStore, "createEvent").mockRejectedValue(new Error("réseau HS"));
      mountModal();
      calendarStore.openCreateModal();
      await nextTick();

      await body().find("#event-title").setValue("Titre valide");
      await body().find("form").trigger("submit");
      await flushPromises();

      expect(body().text()).toContain("réseau HS");
      expect(calendarStore.modalOpen).toBe(true);
    });
  });
});
