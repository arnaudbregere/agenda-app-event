import { defineStore } from "pinia";
import { eventsApi, categoriesApi } from "../api/events.js";

export const useEventsStore = defineStore("events", {
  state: () => ({
    events: [],
    categories: [],
    loading: false,
    error: null,
  }),

  getters: {
    categoryColor: (state) => (categoryId) =>
      state.categories.find((c) => c.id === categoryId)?.color ?? "#616161",
  },

  actions: {
    async fetchAll() {
      this.loading = true;
      this.error = null;
      try {
        const [events, categories] = await Promise.all([eventsApi.list(), categoriesApi.list()]);
        this.events = events;
        this.categories = categories;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    async createEvent(payload) {
      const created = await eventsApi.create(payload);
      this.events.push(created);
      return created;
    },

    async updateEvent(id, patch) {
      const updated = await eventsApi.update(id, patch);
      const index = this.events.findIndex((e) => e.id === id);
      if (index !== -1) this.events[index] = updated;
      return updated;
    },

    async deleteEvent(id) {
      await eventsApi.remove(id);
      this.events = this.events.filter((e) => e.id !== id);
    },
  },
});
