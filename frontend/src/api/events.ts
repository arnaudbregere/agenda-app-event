import { apiClient, BASE_URL } from "./client.js"
import type { CalendarEvent, Category, EventId, EventInput, EventPatch } from "./types.js"

// `id: EventId` et non `string` : seul un identifiant d'événement stocké est
// accepté ici. Passer celui d'une occurrence calculée ne compile pas (NFR-009).
export const eventsApi = {
  list: () => apiClient.get<CalendarEvent[]>("/events"),
  create: (event: EventInput) => apiClient.post<CalendarEvent>("/events", event),
  update: (id: EventId, patch: EventPatch) => apiClient.put<CalendarEvent>(`/events/${id}`, patch),
  remove: (id: EventId) => apiClient.delete(`/events/${id}`),
  // Lien de téléchargement direct (navigation, pas un appel fetch).
  exportUrl: () => `${BASE_URL}/events/export`,
  importIcs: (content: string) =>
    apiClient.postText<{ imported: number; skipped: number }>("/events/import", content, "text/calendar"),
}

export const categoriesApi = {
  list: () => apiClient.get<Category[]>("/categories"),
}
