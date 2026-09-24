// Reflète le schéma backend (backend/src/utils/categories.ts et validators.ts).
export type CategoryId = "personnel" | "travail" | "important" | "famille" | "loisirs" | "autre"

export interface Category {
  id: CategoryId
  label: string
  color: string
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  start: string
  end: string
  allDay: boolean
  category?: CategoryId
  createdAt: string
  updatedAt: string
}

export type EventInput = Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">

export type EventPatch = Partial<EventInput>
