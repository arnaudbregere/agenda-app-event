import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("../api/events.js", () => ({
  eventsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  categoriesApi: {
    list: vi.fn(),
  },
}));

const { eventsApi, categoriesApi } = await import("../api/events.js");
const { useEventsStore } = await import("./events.js");

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe("useEventsStore", () => {
  it("état initial vide", () => {
    const store = useEventsStore();
    expect(store.events).toEqual([]);
    expect(store.categories).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  describe("fetchAll", () => {
    it("charge événements et catégories, et gère loading", async () => {
      const events = [{ id: "1" }];
      const categories = [{ id: "travail", color: "#0b8043" }];
      eventsApi.list.mockResolvedValue(events);
      categoriesApi.list.mockResolvedValue(categories);

      const store = useEventsStore();
      const promise = store.fetchAll();
      expect(store.loading).toBe(true);
      await promise;

      expect(store.loading).toBe(false);
      expect(store.events).toEqual(events);
      expect(store.categories).toEqual(categories);
      expect(store.error).toBeNull();
    });

    it("capture une erreur et la stocke dans state.error", async () => {
      eventsApi.list.mockRejectedValue(new Error("réseau HS"));
      categoriesApi.list.mockResolvedValue([]);

      const store = useEventsStore();
      await store.fetchAll();

      expect(store.error).toBe("réseau HS");
      expect(store.loading).toBe(false);
    });
  });

  describe("createEvent", () => {
    it("ajoute l'événement créé à la liste", async () => {
      const created = { id: "new", title: "Créé" };
      eventsApi.create.mockResolvedValue(created);

      const store = useEventsStore();
      const result = await store.createEvent({ title: "Créé" });

      expect(result).toEqual(created);
      expect(store.events).toContainEqual(created);
    });
  });

  describe("updateEvent", () => {
    it("remplace l'événement existant dans la liste", async () => {
      const store = useEventsStore();
      store.events = [{ id: "1", title: "Ancien" }];
      const updated = { id: "1", title: "Nouveau" };
      eventsApi.update.mockResolvedValue(updated);

      await store.updateEvent("1", { title: "Nouveau" });

      expect(store.events).toEqual([updated]);
    });

    it("ne touche pas la liste si l'id n'existe pas localement", async () => {
      const store = useEventsStore();
      store.events = [{ id: "1", title: "Ancien" }];
      eventsApi.update.mockResolvedValue({ id: "autre", title: "X" });

      await store.updateEvent("autre", { title: "X" });

      expect(store.events).toEqual([{ id: "1", title: "Ancien" }]);
    });
  });

  describe("deleteEvent", () => {
    it("retire l'événement de la liste", async () => {
      const store = useEventsStore();
      store.events = [{ id: "1" }, { id: "2" }];
      eventsApi.remove.mockResolvedValue(undefined);

      await store.deleteEvent("1");

      expect(store.events).toEqual([{ id: "2" }]);
    });
  });

  describe("categoryColor", () => {
    it("retourne la couleur de la catégorie", () => {
      const store = useEventsStore();
      store.categories = [{ id: "travail", color: "#0b8043" }];
      expect(store.categoryColor("travail")).toBe("#0b8043");
    });

    it("retourne une couleur par défaut si catégorie inconnue", () => {
      const store = useEventsStore();
      expect(store.categoryColor("inconnue")).toBe("#616161");
    });
  });
});
