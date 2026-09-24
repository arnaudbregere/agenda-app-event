import type { CategoryId } from "./utils/categories.js";

// Schéma d'un événement tel que persisté dans backend/data/events.json.
// Reflète frontend/src/api/types.ts : description, location et category sont
// optionnels car des événements plus anciens peuvent ne pas les avoir.
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
  category?: CategoryId;
  createdAt: string;
  updatedAt: string;
}

export type EventPatch = Partial<Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">>;
