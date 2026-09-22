import { defineStore } from "pinia"
import { useEventsStore } from "./events.js"
import type { CalendarEvent, CategoryId } from "../api/types.js"

export const VIEWS = ["month", "week", "day", "list"] as const
export type CalendarView = (typeof VIEWS)[number]

export interface ModalDefaults {
  start: Date
  end: Date
  allDay: boolean
}

export const useCalendarStore = defineStore("calendar", {
  state: () => ({
    currentView: "month" as CalendarView,
    currentDate: new Date(),
    searchQuery: "",
    // null = toutes les catégories actives (filtre vide par défaut)
    excludedCategoryIds: [] as CategoryId[],
    modalOpen: false,
    editingEvent: null as CalendarEvent | null, // événement complet en édition, null en création
    modalDefaults: null as ModalDefaults | null, // pré-rempli à la création
  }),

  getters: {
    filteredEvents(state) {
      const eventsStore = useEventsStore()
      const query = state.searchQuery.trim().toLowerCase()

      return eventsStore.events.filter((event) => {
        if (state.excludedCategoryIds.includes(event.category as CategoryId)) return false
        if (!query) return true
        return (
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query)
        )
      })
    },

    isCategoryActive: (state) => (categoryId: CategoryId) => !state.excludedCategoryIds.includes(categoryId),
  },

  actions: {
    setView(view: CalendarView) {
      this.currentView = view
    },

    goToday() {
      this.currentDate = new Date()
    },

    setCurrentDate(date: Date) {
      this.currentDate = date
    },

    toggleCategory(categoryId: CategoryId) {
      const idx = this.excludedCategoryIds.indexOf(categoryId)
      if (idx === -1) this.excludedCategoryIds.push(categoryId)
      else this.excludedCategoryIds.splice(idx, 1)
    },

    openCreateModal(defaults: ModalDefaults | null = null) {
      this.editingEvent = null
      this.modalDefaults = defaults
      this.modalOpen = true
    },

    openEditModal(event: CalendarEvent) {
      this.editingEvent = event
      this.modalDefaults = null
      this.modalOpen = true
    },

    closeModal() {
      this.modalOpen = false
      this.editingEvent = null
      this.modalDefaults = null
    },
  },
})
