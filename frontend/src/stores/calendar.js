import { defineStore } from "pinia";
import { useEventsStore } from "./events.js";

export const VIEWS = ["month", "week", "day", "list"];

export const useCalendarStore = defineStore("calendar", {
  state: () => ({
    currentView: "month",
    currentDate: new Date(),
    searchQuery: "",
    // null = toutes les catégories actives (filtre vide par défaut)
    excludedCategoryIds: [],
    modalOpen: false,
    editingEvent: null, // objet événement complet en édition, null en création
    modalDefaults: null, // { start, end, allDay } pré-remplis à la création
  }),

  getters: {
    filteredEvents(state) {
      const eventsStore = useEventsStore();
      const query = state.searchQuery.trim().toLowerCase();

      return eventsStore.events.filter((event) => {
        if (state.excludedCategoryIds.includes(event.category)) return false;
        if (!query) return true;
        return (
          event.title.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query) ||
          event.location.toLowerCase().includes(query)
        );
      });
    },

    isCategoryActive: (state) => (categoryId) => !state.excludedCategoryIds.includes(categoryId),
  },

  actions: {
    setView(view) {
      this.currentView = view;
    },

    goToday() {
      this.currentDate = new Date();
    },

    setCurrentDate(date) {
      this.currentDate = date;
    },

    toggleCategory(categoryId) {
      const idx = this.excludedCategoryIds.indexOf(categoryId);
      if (idx === -1) this.excludedCategoryIds.push(categoryId);
      else this.excludedCategoryIds.splice(idx, 1);
    },

    openCreateModal(defaults = null) {
      this.editingEvent = null;
      this.modalDefaults = defaults;
      this.modalOpen = true;
    },

    openEditModal(event) {
      this.editingEvent = event;
      this.modalDefaults = null;
      this.modalOpen = true;
    },

    closeModal() {
      this.modalOpen = false;
      this.editingEvent = null;
      this.modalDefaults = null;
    },
  },
});
