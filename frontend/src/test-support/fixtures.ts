import type { CalendarEvent, Category, EventId, EventOccurrence, OccurrenceId } from "../api/types.js";

// Helpers de test partagés : construisent des fixtures volontairement
// partielles (seuls les champs utiles au test) et les cassent vers le type
// réel, plutôt que de forcer chaque test à fournir un CalendarEvent/Category
// complet qu'il ne vérifie pas.
export const asEvent = (value: object) => value as CalendarEvent;
export const asEvents = (value: object[]) => value as CalendarEvent[];
export const asCategories = (value: object[]) => value as Category[];

// Identifiants marqués (api/types.ts) : seul un test a le droit de fabriquer
// une marque à partir d'une chaîne littérale. Le code de production obtient ses
// EventId de l'API et ses OccurrenceId de useRecurrence.occurrenceId().
export const asEventId = (value: string) => value as EventId;
export const asOccurrenceId = (value: string) => value as OccurrenceId;

// Occurrence partielle. `seriesId` et `occurrenceStart` sont dérivés de l'objet
// fourni quand il ne les porte pas : un événement non récurrent est l'occurrence
// unique de lui-même, c'est ce que produit expandSeries.
export const asOccurrence = (value: object) => {
  const { id, start } = value as { id?: string; start?: string };
  return { seriesId: id, occurrenceStart: start, ...value } as unknown as EventOccurrence;
};
