<script setup>
import { computed } from "vue";
import { startOfMonth, endOfMonth, isWithinInterval, format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useCalendarStore } from "../../stores/calendar.js";
import { useEventsStore } from "../../stores/events.js";
import { isToday } from "../../composables/useCalendarGrid.js";

const store = useCalendarStore();
const eventsStore = useEventsStore();

const groups = computed(() => {
  const monthStart = startOfMonth(store.currentDate);
  const monthEnd = endOfMonth(store.currentDate);

  const inMonth = store.filteredEvents
    .filter((e) => isWithinInterval(new Date(e.start), { start: monthStart, end: monthEnd }))
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || new Date(a.start) - new Date(b.start));

  const byDay = [];
  for (const event of inMonth) {
    const eventDate = new Date(event.start);
    let group = byDay.find((g) => isSameDay(g.date, eventDate));
    if (!group) {
      group = { date: eventDate, events: [] };
      byDay.push(group);
    }
    group.events.push(event);
  }
  return byDay.sort((a, b) => a.date - b.date);
});

function eventTime(event) {
  if (event.allDay) return "Toute la journée";
  return `${format(new Date(event.start), "HH:mm")} – ${format(new Date(event.end), "HH:mm")}`;
}
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
        <div
          v-for="event in group.events"
          :key="event.id"
          class="c-agenda-item"
          @click="store.openEditModal(event)"
        >
          <span class="c-agenda-item__time">{{ eventTime(event) }}</span>
          <span
            class="c-dot"
            :style="{ '--dot-color': eventsStore.categoryColor(event.category) }"
          />
          <span class="c-agenda-item__title">{{ event.title }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
