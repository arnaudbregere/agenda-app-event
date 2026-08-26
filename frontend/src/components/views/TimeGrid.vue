<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCalendarStore } from "../../stores/calendar.js";
import { useEventsStore } from "../../stores/events.js";
import { HOURS, eventOccursOnDay, isToday } from "../../composables/useCalendarGrid.js";
import { layoutTimedEvents, toDayMinutes } from "../../composables/useEventLayout.js";

// Doit rester synchronisé avec --hour-row-height dans settings/_spacing.css
const HOUR_ROW_HEIGHT = 48;

defineProps({
  days: { type: Array, required: true },
});

const store = useCalendarStore();
const eventsStore = useEventsStore();
const bodyRef = ref(null);
const now = ref(new Date());
let timer = null;

onMounted(() => {
  timer = setInterval(() => (now.value = new Date()), 60_000);
  if (bodyRef.value) bodyRef.value.scrollTop = 7 * HOUR_ROW_HEIGHT;
});
onUnmounted(() => clearInterval(timer));

function allDayEvents(day) {
  return store.filteredEvents.filter((e) => e.allDay && eventOccursOnDay(e, day));
}

function timedEventsForDay(day) {
  const raw = store.filteredEvents
    .filter((e) => !e.allDay && eventOccursOnDay(e, day))
    .map((e) => ({ ...e, ...toDayMinutes(e, day) }));
  return layoutTimedEvents(raw);
}

function blockStyle(event) {
  return {
    top: `${(event.startMinutes / 60) * HOUR_ROW_HEIGHT}px`,
    height: `${((event.endMinutes - event.startMinutes) / 60) * HOUR_ROW_HEIGHT}px`,
    left: `${event.left}%`,
    width: `calc(${event.width}% - 4px)`,
    "--event-color": eventsStore.categoryColor(event.category),
  };
}

const nowLineTop = computed(() => {
  const minutes = now.value.getHours() * 60 + now.value.getMinutes();
  return (minutes / 60) * HOUR_ROW_HEIGHT;
});

function formatHour(h) {
  return `${String(h).padStart(2, "0")}:00`;
}

function quickCreate(day, hour) {
  const start = new Date(day);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(day);
  end.setHours(hour + 1, 0, 0, 0);
  store.openCreateModal({ start, end, allDay: false });
}
</script>

<template>
  <div class="c-time-grid">
    <div class="c-time-grid__head">
      <div class="c-time-grid__head-gutter" />
      <div v-for="day in days" :key="'h-' + day.toISOString()" class="c-time-grid__head-day" :class="{ 'is-today': isToday(day) }">
        <div class="c-time-grid__head-weekday">{{ format(day, "EEE", { locale: fr }) }}</div>
        <div class="c-time-grid__head-number">{{ day.getDate() }}</div>
      </div>
    </div>

    <div class="c-time-grid__allday">
      <div class="c-time-grid__allday-gutter" />
      <div v-for="day in days" :key="'a-' + day.toISOString()" class="c-time-grid__allday-day">
        <div
          v-for="event in allDayEvents(day)"
          :key="event.id"
          class="c-event-allday"
          :style="{ '--event-color': eventsStore.categoryColor(event.category) }"
          @click="store.openEditModal(event)"
        >
          {{ event.title }}
        </div>
      </div>
    </div>

    <div ref="bodyRef" class="c-time-grid__body o-scroll-y">
      <div class="c-time-grid__gutter">
        <div v-for="h in HOURS" :key="'g-' + h" class="c-time-grid__hour-label">{{ formatHour(h) }}</div>
      </div>
      <div class="c-time-grid__columns">
        <div
          v-for="day in days"
          :key="'c-' + day.toISOString()"
          class="c-time-grid__column"
        >
          <div
            v-for="h in HOURS"
            :key="h"
            class="c-time-grid__hour-line"
            @click="quickCreate(day, h)"
          />
          <div v-if="isToday(day)" class="c-now-line" :style="{ top: nowLineTop + 'px' }" />
          <div
            v-for="event in timedEventsForDay(day)"
            :key="event.id"
            class="c-event-block"
            :style="blockStyle(event)"
            @click.stop="store.openEditModal(event)"
          >
            <div class="c-event-block__title">{{ event.title }}</div>
            <div class="c-event-block__time">
              {{ format(new Date(event.start), "HH:mm") }} – {{ format(new Date(event.end), "HH:mm") }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
