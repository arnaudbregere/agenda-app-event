import { addDays, addMonths, addWeeks } from "date-fns"
import type {
  CalendarEvent,
  EventId,
  EventOccurrence,
  OccurrenceId,
  RecurrenceFreq,
} from "../api/types.js"

// Seul endroit du dépôt où une date de récurrence est calculée (NFR-001). Module
// de fonctions pures malgré le préfixe `use` : aucun ref, aucun computed, aucun
// accès au store, aucune lecture de l'horloge — même moule que useCalendarGrid.ts.
// Contrat : specs/002-recurring-events/contracts/recurrence-module.md

// Borne d'AFFICHAGE, pas une règle de donnée : la date de fin obligatoire
// empêche déjà l'infini à la saisie. Ce plafond protège le rendu et la recherche
// contre un `until` lointain, y compris dans un events.json édité à la main, qui
// n'est jamais passé par la validation de l'API (research.md, R-005).
export const MAX_OCCURRENCES = 500

export interface OccurrenceWindow {
  from: Date
  to: Date
}

// Fonctions calendaires exclusivement : elles préservent l'heure murale locale
// au passage de l'heure d'été. Une arithmétique en millisecondes ferait dériver
// une série hebdomadaire de 9h à 8h après le changement d'heure (R-003).
const SHIFT: Record<RecurrenceFreq, (date: Date, amount: number) => Date> = {
  daily: addDays,
  weekly: addWeeks,
  monthly: addMonths,
}

// Seul site de construction d'un OccurrenceId : c'est ce qui donne sa valeur au
// marquage de type. Le résultat ne sert qu'aux clés de template — rien ne le
// réanalyse, l'occurrence porte seriesId et occurrenceStart comme vrais attributs.
export const occurrenceId = (seriesId: EventId, occurrenceStart: string): OccurrenceId =>
  `${seriesId}:${occurrenceStart}` as OccurrenceId

const toOccurrence = (event: CalendarEvent, start: Date, end: Date): EventOccurrence => {
  const occurrenceStart = start.toISOString()
  return {
    ...event,
    id: occurrenceId(event.id, occurrenceStart),
    seriesId: event.id,
    occurrenceStart,
    start: occurrenceStart,
    end: end.toISOString(),
  }
}

const intersects = (start: Date, end: Date, window: OccurrenceWindow): boolean =>
  start.getTime() <= window.to.getTime() && end.getTime() >= window.from.getTime()

/**
 * Développe un événement sur une fenêtre et renvoie ses occurrences, triées par
 * date de départ croissante.
 *
 * Un événement sans `recurrence` ressort en une occurrence identique, si et
 * seulement si elle intersecte la fenêtre : les vues n'ont ainsi jamais à tester
 * « est-ce une série » (NFR-002).
 *
 * Les occurrences surchargées ne sont pas traitées ici. Une surcharge est un
 * événement ordinaire, qui passe par le chemin « sans récurrence » ; c'est
 * l'invariant INV-1 (toute surcharge ajoute sa date aux `exdates` de sa série)
 * qui garantit l'absence de doublon.
 */
export const expandSeries = (event: CalendarEvent, window: OccurrenceWindow): EventOccurrence[] => {
  const anchorStart = new Date(event.start)
  const anchorEnd = new Date(event.end)

  if (!event.recurrence) {
    return intersects(anchorStart, anchorEnd, window) ? [toOccurrence(event, anchorStart, anchorEnd)] : []
  }

  const { freq, interval, until } = event.recurrence
  const shift = SHIFT[freq]
  const untilTime = new Date(until).getTime()
  // Comparaison par instant et non par chaîne : deux écritures ISO du même
  // instant ("…:00.000Z" et "…:00Z") doivent exclure la même occurrence.
  const excluded = new Set((event.exdates ?? []).map((date) => new Date(date).getTime()))

  const occurrences: EventOccurrence[] = []
  for (let rank = 0; rank < MAX_OCCURRENCES; rank++) {
    // Toujours depuis l'ancre, JAMAIS depuis l'occurrence précédente. L'écrêtage
    // mensuel est absorbant en cascade : une série ancrée au 31 donnerait
    // 31 | 28 | 28 | 28 au lieu de 31 | 28 | 31 | 30, et le défaut n'apparaîtrait
    // qu'à la troisième occurrence (R-002).
    const start = shift(anchorStart, rank * interval)
    if (start.getTime() > untilTime) break
    if (excluded.has(start.getTime())) continue

    // Même décalage appliqué à la fin qu'au début : la durée est préservée, et
    // l'heure murale de fin l'est aussi au passage de l'heure d'été.
    const end = shift(anchorEnd, rank * interval)
    if (intersects(start, end, window)) {
      occurrences.push(toOccurrence(event, start, end))
    }
  }

  return occurrences
}
