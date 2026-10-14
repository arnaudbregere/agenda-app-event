import { defineStore } from "pinia"
import { useEventsStore } from "./events.js"
import { expandSeries } from "../composables/useRecurrence.js"
import type { CalendarEvent, CategoryId, EventOccurrence } from "../api/types.js"

export const VIEWS = ["month", "week", "day", "list"] as const
export type CalendarView = (typeof VIEWS)[number]

export interface ModalDefaults {
  start: Date
  end: Date
  allDay: boolean
}

// Unique exemplaire du filtrage affichable : exclusion de catégorie + recherche
// plein texte. Consommé par `occurrencesIn` seul (NFR-005).
const matchesFilters = (
  event: Pick<CalendarEvent, "category" | "title" | "description" | "location">,
  excludedCategoryIds: CategoryId[],
  query: string,
): boolean => {
  if (excludedCategoryIds.includes(event.category as CategoryId)) return false
  if (!query) return true
  return (
    event.title.toLowerCase().includes(query) ||
    (event.description?.toLowerCase().includes(query) ?? false) ||
    (event.location?.toLowerCase().includes(query) ?? false)
  )
}

const byStart = (a: EventOccurrence, b: EventOccurrence): number =>
  new Date(a.start).getTime() - new Date(b.start).getTime()

// Plage couverte par les événements existants. Sert de fenêtre à la recherche,
// qui cherche toutes dates confondues. C'est un `reduce` sur des attributs
// stockés (`end`, `recurrence.until`), pas du calcul de récurrence.
const spanOf = (events: CalendarEvent[]): { from: Date; to: Date } | null => {
  if (events.length === 0) return null
  let from = Infinity
  let to = -Infinity
  for (const event of events) {
    from = Math.min(from, new Date(event.start).getTime())
    to = Math.max(to, new Date(event.recurrence?.until ?? event.end).getTime())
  }
  return { from: new Date(from), to: new Date(to) }
}

export const useCalendarStore = defineStore("calendar", {
  state: () => ({
    currentView: "month" as CalendarView,
    currentDate: new Date(),
    searchQuery: "",
    // null = toutes les catégories actives (filtre vide par défaut)
    excludedCategoryIds: [] as CategoryId[],
    modalOpen: false,
    // Occurrence en édition, null en création. Les vues manipulent des occurrences
    // calculées, pas des événements stockés : un événement simple est une
    // occurrence unique de lui-même (NFR-002).
    editingEvent: null as EventOccurrence | null,
    modalDefaults: null as ModalDefaults | null, // pré-rempli à la création
    // Drawer sidebar sous 900px : toujours false sur desktop, où le bouton
    // qui le fait varier n'est pas affiché (voir _app-header.scss).
    isSidebarOpen: false,
  }),

  getters: {
    // Point d'accès unique aux événements affichables : développe les séries sur
    // la fenêtre demandée, puis applique le filtrage. Un événement non récurrent
    // en ressort tel quel, pour que les vues n'aient jamais à distinguer les deux
    // cas (NFR-002).
    //
    // ⚠️ Un getter Pinia paramétré n'est PAS mémoïsé : la fonction renvoyée
    // s'exécute entièrement à chaque appel. Chaque vue ne l'appelle donc qu'une
    // seule fois par rendu, dans un `computed`, puis regroupe localement. Jamais
    // dans un template, une boucle ou une fois par cellule (research.md, R-004).
    occurrencesIn(state) {
      return (from: Date, to: Date): EventOccurrence[] => {
        const eventsStore = useEventsStore()
        const query = state.searchQuery.trim().toLowerCase()

        return eventsStore.events
          .filter((event) => matchesFilters(event, state.excludedCategoryIds, query))
          .flatMap((event) => expandSeries(event, { from, to }))
          .sort(byStart)
      }
    },

    // Résultats de recherche toutes dates confondues, triés chronologiquement.
    // Vide tant qu'aucune recherche n'est saisie.
    searchResults(state): EventOccurrence[] {
      if (!state.searchQuery.trim()) return []
      const span = spanOf(useEventsStore().events)
      return span ? this.occurrencesIn(span.from, span.to) : []
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

    // Accès direct au jour / à la semaine / au mois en cours : change la vue
    // ET recentre sur aujourd'hui en une seule action.
    goToCurrent(view: CalendarView) {
      this.currentView = view
      this.currentDate = new Date()
      this.isSidebarOpen = false
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

    openEditModal(event: EventOccurrence) {
      this.editingEvent = event
      this.modalDefaults = null
      this.modalOpen = true
    },

    closeModal() {
      this.modalOpen = false
      this.editingEvent = null
      this.modalDefaults = null
    },

    openSidebar() {
      this.isSidebarOpen = true
    },

    closeSidebar() {
      this.isSidebarOpen = false
    },

    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen
    },
  },
})
