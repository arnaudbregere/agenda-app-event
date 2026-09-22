import { defineStore } from "pinia"
import { eventsApi, categoriesApi } from "../api/events.js"
import type { CalendarEvent, Category, CategoryId, EventInput, EventPatch } from "../api/types.js"

export const useEventsStore = defineStore("events", {
  state: () => ({
    events: [] as CalendarEvent[],
    categories: [] as Category[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    categoryColor: (state) => (categoryId: CategoryId) =>
      state.categories.find((c) => c.id === categoryId)?.color ?? "#616161",
  },

  actions: {
    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const [events, categories] = await Promise.all([eventsApi.list(), categoriesApi.list()])
        this.events = events
        this.categories = categories
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
      } finally {
        this.loading = false
      }
    },

    async createEvent(payload: EventInput) {
      const created = await eventsApi.create(payload)
      this.events.push(created)
      return created
    },

    async updateEvent(id: string, patch: EventPatch) {
      const updated = await eventsApi.update(id, patch)
      const index = this.events.findIndex((e) => e.id === id)
      if (index !== -1) this.events[index] = updated
      return updated
    },

    async deleteEvent(id: string) {
      await eventsApi.remove(id)
      this.events = this.events.filter((e) => e.id !== id)
    },
  },
})
