import { apiClient, BASE_URL } from "./client.js"
import type { CalendarEvent, Category, EventInput, EventPatch } from "./types.js"

export const eventsApi = {
  list: () => apiClient.get<CalendarEvent[]>("/events"),
  create: (event: EventInput) => apiClient.post<CalendarEvent>("/events", event),
  update: (id: string, patch: EventPatch) => apiClient.put<CalendarEvent>(`/events/${id}`, patch),
  remove: (id: string) => apiClient.delete(`/events/${id}`),
  // Lien de téléchargement direct (navigation, pas un appel fetch).
  exportUrl: () => `${BASE_URL}/events/export`,
  importIcs: (content: string) =>
    apiClient.postText<{ imported: number }>("/events/import", content, "text/calendar"),
}

export const categoriesApi = {
  list: () => apiClient.get<Category[]>("/categories"),
}
