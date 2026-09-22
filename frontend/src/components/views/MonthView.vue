<script setup lang="ts">
import { computed } from "vue";
import { isSameMonth, isSaturday, isSunday, format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCalendarStore } from "../../stores/calendar.js";
import { useEventsStore } from "../../stores/events.js";
import { getMonthWeeks, eventOccursOnDay, isToday } from "../../composables/useCalendarGrid.js";
import type { CalendarEvent } from "../../api/types.js";

const MAX_VISIBLE = 3;

const store = useCalendarStore();
const eventsStore = useEventsStore();

const weeks = computed(() => getMonthWeeks(store.currentDate));

// Groupé une seule fois par rendu (le template appelle eventsForDay deux
// fois par cellule : liste visible + condition du lien "+N") plutôt que de
// refiltrer/retrier store.filteredEvents à chaque appel.
const eventsByDay = computed(() => {
  const map = new Map();
  for (const week of weeks.value) {
    for (const day of week) {
      map.set(
        day.toISOString(),
        store.filteredEvents
          .filter((e) => eventOccursOnDay(e, day))
          .sort((a, b) => Number(b.allDay) - Number(a.allDay) || new Date(a.start).getTime() - new Date(b.start).getTime()),
      );
    }
  }
  return map;
});

function eventsForDay(day: Date) {
  return eventsByDay.value.get(day.toISOString()) ?? [];
}

function eventTime(event: CalendarEvent) {
  return event.allDay ? "" : format(new Date(event.start), "HH:mm");
}

function goToDay(day: Date) {
  store.setCurrentDate(day);
  store.setView("day");
}

function quickCreate(day: Date) {
  const start = new Date(day);
  start.setHours(9, 0, 0, 0);
  const end = new Date(day);
  end.setHours(10, 0, 0, 0);
  store.openCreateModal({ start, end, allDay: false });
}
</script>

<template>
  <div class="c-month-grid">
    <div class="c-month-grid__weekdays">
      <span v-for="label in ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']" :key="label" class="c-month-grid__weekday">
        {{ label }}
      </span>
    </div>
    <div class="c-month-grid__weeks">
      <div v-for="week in weeks" :key="week[0].toISOString()" class="c-month-grid__week">
        <div
          v-for="day in week"
          :key="day.toISOString()"
          class="c-month-grid__cell"
          :class="{
            'is-outside': !isSameMonth(day, store.currentDate),
            'is-weekend': isSaturday(day) || isSunday(day),
            'is-today': isToday(day),
          }"
          @click="quickCreate(day)"
        >
          <button
            type="button"
            class="c-month-grid__day-number"
            :aria-label="`Aller à la vue jour du ${format(day, 'EEEE d MMMM', { locale: fr })}`"
            @click.stop="goToDay(day)"
          >{{ day.getDate() }}</button>
          <div class="c-month-grid__events">
            <button
              v-for="event in eventsForDay(day).slice(0, MAX_VISIBLE)"
              :key="event.id"
              type="button"
              class="c-event-pill"
              :style="{ '--event-color': eventsStore.categoryColor(event.category) }"
              @click.stop="store.openEditModal(event)"
            >
              <span v-if="eventTime(event)" class="c-event-pill__time">{{ eventTime(event) }}</span>
              <span class="c-event-pill__title">{{ event.title }}</span>
            </button>
            <button
              v-if="eventsForDay(day).length > MAX_VISIBLE"
              type="button"
              class="c-month-grid__more"
              @click.stop="goToDay(day)"
            >
              + {{ eventsForDay(day).length - MAX_VISIBLE }} de plus
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
