import { apiClient } from "./client.js";

export const eventsApi = {
  list: () => apiClient.get("/events"),
  create: (event) => apiClient.post("/events", event),
  update: (id, patch) => apiClient.put(`/events/${id}`, patch),
  remove: (id) => apiClient.delete(`/events/${id}`),
};

export const categoriesApi = {
  list: () => apiClient.get("/categories"),
};
