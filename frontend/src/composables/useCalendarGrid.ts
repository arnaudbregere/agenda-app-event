import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  isSameDay,
  startOfDay,
  endOfDay,
} from "date-fns"
import type { CalendarEvent } from "../api/types.js"

// Semaine française : commence le lundi.
export const WEEK_OPTIONS = { weekStartsOn: 1 as const }

export const HOURS = Array.from({ length: 24 }, (_, i) => i)

/** Découpe le mois contenant `date` en semaines complètes de 7 jours. */
export function getMonthWeeks(date: Date): Date[][] {
  const start = startOfWeek(startOfMonth(date), WEEK_OPTIONS)
  const end = endOfWeek(endOfMonth(date), WEEK_OPTIONS)
  const days = eachDayOfInterval({ start, end })

  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

/** Les 7 jours de la semaine contenant `date`. */
export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, WEEK_OPTIONS)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/**
 * Un événement (start/end en ISO) touche-t-il ce jour ?
 *
 * Un événement qui se termine exactement à minuit ne touche PAS le jour
 * suivant : il n'y occupe aucune durée. Le cas n'est pas théorique, c'est le
 * défaut du formulaire de création (23:00 → 00:00), qui apparaîtrait sinon sur
 * deux jours dans toutes les vues.
 *
 * `start >= dayStart` garde les événements de durée nulle (`end === start`,
 * accepté par le backend) visibles le jour qui les contient, minuit compris.
 */
export function eventOccursOnDay(event: Pick<CalendarEvent, "start" | "end">, day: Date): boolean {
  const start = new Date(event.start)
  const end = new Date(event.end)
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)
  return start <= dayEnd && (end > dayStart || start >= dayStart)
}

export function isToday(day: Date): boolean {
  return isSameDay(day, new Date())
}
