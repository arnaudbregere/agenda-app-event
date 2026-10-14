// Reflète le schéma backend (backend/src/utils/categories.ts et validators.ts).
export type CategoryId = "personnel" | "travail" | "important" | "famille" | "loisirs" | "autre"

export interface Category {
  id: CategoryId
  label: string
  color: string
}

// Identifiants marqués. Les deux marques diffèrent, donc aucun des deux types
// n'est assignable à l'autre : passer l'identifiant d'une occurrence à une
// fonction qui attend celui d'un événement stocké ne compile pas. C'est tout
// l'objet de NFR-009 — une occurrence n'existe pas en stockage, l'envoyer à
// PUT /api/events/:id produirait un 404 au moment de l'exécution.
export type EventId = string & { readonly __brand: "EventId" }
export type OccurrenceId = string & { readonly __brand: "OccurrenceId" }

export const RECURRENCE_FREQS = ["daily", "weekly", "monthly"] as const
export type RecurrenceFreq = (typeof RECURRENCE_FREQS)[number]

export const MIN_RECURRENCE_INTERVAL = 1
export const MAX_RECURRENCE_INTERVAL = 99

// Règle de répétition d'une série. Ne contient aucune date d'occurrence : celles-ci
// sont calculées à l'affichage par composables/useRecurrence.ts.
export interface RecurrenceRule {
  freq: RecurrenceFreq
  interval: number
  until: string
}

export interface CalendarEvent {
  id: EventId
  title: string
  description?: string
  location?: string
  start: string
  end: string
  allDay: boolean
  category?: CategoryId
  // Présent = série récurrente. start/end sont alors son ancre.
  recurrence?: RecurrenceRule
  // Dates (ISO) des occurrences retirées de la série.
  exdates?: string[]
  // Occurrence surchargée : rattachement à sa série et à la date remplacée.
  recurrenceParentId?: EventId
  recurrenceId?: string
  createdAt: string
  updatedAt: string
}

// Occurrence calculée, jamais persistée. `id` ne sert qu'aux clés de template :
// personne ne le réanalyse, `seriesId` et `occurrenceStart` sont de vrais
// attributs. Un événement non récurrent traverse l'expanseur et en ressort en
// une occurrence identique, pour que les vues n'aient jamais à distinguer les
// deux cas (NFR-002).
export interface EventOccurrence extends Omit<CalendarEvent, "id"> {
  id: OccurrenceId
  seriesId: EventId
  occurrenceStart: string
}

// `null` demande le retrait de l'attribut (décocher la récurrence d'une série
// existante) ; absent = ne pas y toucher. Voir backend/src/types.ts, EventBody.
export type EventInput = Omit<CalendarEvent, "id" | "createdAt" | "updatedAt" | "recurrence" | "exdates"> & {
  recurrence?: RecurrenceRule | null
  exdates?: string[] | null
}

export type EventPatch = Partial<EventInput>
