import type { CategoryId } from "./utils/categories.js";

export const RECURRENCE_FREQS = ["daily", "weekly", "monthly"] as const;
export type RecurrenceFreq = (typeof RECURRENCE_FREQS)[number];

export const MIN_RECURRENCE_INTERVAL = 1;
export const MAX_RECURRENCE_INTERVAL = 99;

// Règle de répétition d'une série. Ne contient aucune date d'occurrence : les
// occurrences sont calculées à l'affichage (frontend/src/composables/useRecurrence.ts),
// jamais persistées. Voir specs/002-recurring-events/data-model.md.
export interface RecurrenceRule {
  freq: RecurrenceFreq;
  // Entier de MIN_RECURRENCE_INTERVAL à MAX_RECURRENCE_INTERVAL.
  interval: number;
  // Date de fin ISO, obligatoire et >= start de la série. Pas de série sans fin.
  until: string;
}

// Schéma d'un événement tel que persisté dans backend/data/events.json.
// Reflète frontend/src/api/types.ts : description, location et category sont
// optionnels car des événements plus anciens peuvent ne pas les avoir.
export interface CalendarEvent {
  id: string;
  // UID RFC 5545 de l'événement importé : sert à ne pas importer deux fois le même.
  uid?: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
  category?: CategoryId;
  // Présent = série récurrente. start/end sont alors son ancre.
  recurrence?: RecurrenceRule;
  // Dates (ISO) des occurrences retirées de la série.
  exdates?: string[];
  // Occurrence surchargée : rattachement à sa série et à la date qu'elle remplace.
  // Jamais présents en même temps que `recurrence`.
  recurrenceParentId?: string;
  recurrenceId?: string;
  createdAt: string;
  updatedAt: string;
}

// Corps d'une création (POST) une fois validé : title, start et end sont requis.
export type EventBody = {
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay?: boolean;
  category?: CategoryId;
  // `null` sur le fil signifie « retirer cet attribut » (FR-023 : décocher la
  // récurrence d'une série existante). Absent = ne pas y toucher. Le schéma
  // persisté, lui, ne contient jamais `null` : l'attribut est simplement absent.
  recurrence?: RecurrenceRule | null;
  exdates?: string[] | null;
  recurrenceParentId?: string | null;
  recurrenceId?: string | null;
};

// Corps d'une mise à jour (PUT) une fois validé : tout est optionnel, et `null`
// est admis sur `recurrence`/`exdates` pour demander un retrait.
export type EventPatchBody = Partial<EventBody>;

// Correctif appliqué au stockage. Distinct de EventPatchBody : le fichier ne
// contient jamais `null`, c'est `putEvent` qui traduit un retrait en `undefined`.
export type EventPatch = Partial<Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">>;

