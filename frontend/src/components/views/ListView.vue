<script setup lang="ts">
import { computed } from "vue";
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfDay, endOfDay, max, min, format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCalendarStore } from "../../stores/calendar.js";
import { useEventsStore } from "../../stores/events.js";
import { eventOccursOnDay, isToday } from "../../composables/useCalendarGrid.js";
import type { EventOccurrence } from "../../api/types.js";

interface DayGroup {
  date: Date
  events: EventOccurrence[]
}

const store = useCalendarStore();
const eventsStore = useEventsStore();

const groups = computed(() => {
  const monthStart = startOfMonth(store.currentDate);
  const monthEnd = endOfMonth(store.currentDate);

  // Un seul appel pour tout le mois affiché (research.md, R-004).
  const occurrences = store.occurrencesIn(monthStart, monthEnd);

  // Même prédicat de chevauchement que la vue Mois : un événement qui couvre
  // plusieurs jours apparaît sur chacun d'eux, pas seulement sur celui où il
  // commence. Grouper sur `start` seul faisait diverger Liste et Mois.
  const byDay: DayGroup[] = eachDayOfInterval({ start: monthStart, end: monthEnd }).map((date) => ({
    date,
    events: occurrences
      .filter((e) => eventOccursOnDay(e, date))
      .sort((a, b) => Number(b.allDay) - Number(a.allDay) || new Date(a.start).getTime() - new Date(b.start).getTime()),
  }));
  return byDay.filter((group) => group.events.length > 0);
});

// Les heures sont bornées au jour du groupe. Un événement qui couvre plusieurs
// jours apparaît sur chacun d'eux : afficher ses start/end absolus y
// annoncerait un horaire faux (« 09:00 – 17:00 » un jour qu'il occupe en
// entier). Chaque ligne montre donc la portion réellement occupée ce jour-là.
const eventTime = (event: EventOccurrence, day: Date) => {
  if (event.allDay) return "Toute la journée";
  const from = max([new Date(event.start), startOfDay(day)]);
  const to = min([new Date(event.end), endOfDay(day)]);
  return `${format(from, "HH:mm")} – ${format(to, "HH:mm")}`;
};
</script>

<template>
  <div class="c-agenda-list o-scroll-y">
    <p v-if="!groups.length" class="c-agenda-list__empty">Aucun événement ce mois-ci.</p>
    <div v-for="group in groups" :key="group.date.toISOString()" class="c-agenda-list__group">
      <div class="c-agenda-list__date" :class="{ 'is-today': isToday(group.date) }">
        <div class="c-agenda-list__date-day">{{ group.date.getDate() }}</div>
        <div class="c-agenda-list__date-weekday">{{ format(group.date, "EEE", { locale: fr }) }}</div>
      </div>
      <div class="c-agenda-list__items">
        <button
          v-for="event in group.events"
          :key="event.id"
          type="button"
          class="c-agenda-item"
          @click="store.openEditModal(event)"
        >
          <span class="c-agenda-item__time">{{ eventTime(event, group.date) }}</span>
          <span
            class="c-dot"
            :style="{ '--dot-color': eventsStore.categoryColor(event.category) }"
          />
          <span class="c-agenda-item__title">{{ event.title }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
