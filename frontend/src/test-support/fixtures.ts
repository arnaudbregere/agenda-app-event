import type { CalendarEvent, Category } from "../api/types.js";

// Helpers de test partagés : construisent des fixtures volontairement
// partielles (seuls les champs utiles au test) et les cassent vers le type
// réel, plutôt que de forcer chaque test à fournir un CalendarEvent/Category
// complet qu'il ne vérifie pas.
export const asEvent = (value: object) => value as CalendarEvent;
export const asEvents = (value: object[]) => value as CalendarEvent[];
export const asCategories = (value: object[]) => value as Category[];
