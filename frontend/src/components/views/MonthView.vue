<script setup>
import { computed } from "vue";
import { isSameMonth, isSaturday, isSunday, format } from "date-fns";
import { useCalendarStore } from "../../stores/calendar.js";
import { useEventsStore } from "../../stores/events.js";
import { getMonthWeeks, eventOccursOnDay, isToday } from "../../composables/useCalendarGrid.js";

const MAX_VISIBLE = 3;

const store = useCalendarStore();
const eventsStore = useEventsStore();

const weeks = computed(() => getMonthWeeks(store.currentDate));

function eventsForDay(day) {
  return store.filteredEvents
    .filter((e) => eventOccursOnDay(e, day))
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || new Date(a.start) - new Date(b.start));
}

function eventTime(event) {
  return event.allDay ? "" : format(new Date(event.start), "HH:mm");
}

function goToDay(day) {
  store.setCurrentDate(day);
  store.setView("day");
}

function quickCreate(day) {
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
          <span class="c-month-grid__day-number" @click.stop="goToDay(day)">{{ day.getDate() }}</span>
          <div class="c-month-grid__events">
            <div
              v-for="event in eventsForDay(day).slice(0, MAX_VISIBLE)"
              :key="event.id"
              class="c-event-pill"
              :style="{ '--event-color': eventsStore.categoryColor(event.category) }"
              @click.stop="store.openEditModal(event)"
            >
              <span v-if="eventTime(event)" class="c-event-pill__time">{{ eventTime(event) }}</span>
              <span class="c-event-pill__title">{{ event.title }}</span>
            </div>
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
