<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { endOfDay, format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useCalendarStore } from "../../stores/calendar.js";
import { useEventsStore } from "../../stores/events.js";
import { HOURS, eventOccursOnDay, isToday } from "../../composables/useCalendarGrid.js";
import { layoutTimedEvents, toDayMinutes, type DayMinutes, type LayoutBox } from "../../composables/useEventLayout.js";
import type { EventOccurrence } from "../../api/types.js";

type TimedBlock = EventOccurrence & DayMinutes & LayoutBox

// Doit rester synchronisé avec --hour-row-height dans settings/_spacing.css
const HOUR_ROW_HEIGHT = 48;

const props = defineProps<{ days: Date[] }>();

const store = useCalendarStore();
const eventsStore = useEventsStore();
const bodyRef = ref<HTMLDivElement | null>(null);
const now = ref(new Date());
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timer = setInterval(() => (now.value = new Date()), 60_000);
  if (bodyRef.value) bodyRef.value.scrollTop = 7 * HOUR_ROW_HEIGHT;
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});

// Un seul appel à occurrencesIn pour toute la grille, partitionné ensuite par
// jour. Le template interroge deux listes par jour (bandeau journée entière et
// blocs horaires) : sans cette fusion, une semaine développerait toutes les
// séries 14 fois par rendu, un getter Pinia paramétré n'étant pas mémoïsé
// (research.md, R-004).
const byDay = computed(() => {
  const map = new Map<string, { allDay: EventOccurrence[]; timed: TimedBlock[] }>();
  if (!props.days.length) return map;

  const occurrences = store.occurrencesIn(
    startOfDay(props.days[0]),
    endOfDay(props.days[props.days.length - 1]),
  );

  for (const day of props.days) {
    map.set(day.toISOString(), {
      allDay: occurrences.filter((e) => e.allDay && eventOccursOnDay(e, day)),
      timed: layoutTimedEvents(
        occurrences
          .filter((e) => !e.allDay && eventOccursOnDay(e, day))
          .map((e) => ({ ...e, ...toDayMinutes(e, day) })),
      ),
    });
  }
  return map;
});

function allDayEvents(day: Date): EventOccurrence[] {
  return byDay.value.get(day.toISOString())?.allDay ?? [];
}

function timedEventsForDay(day: Date): TimedBlock[] {
  return byDay.value.get(day.toISOString())?.timed ?? [];
}

function blockStyle(event: TimedBlock) {
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

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function quickCreate(day: Date, hour: number) {
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
        <button
          v-for="event in allDayEvents(day)"
          :key="event.id"
          type="button"
          class="c-event-allday"
          :style="{ '--event-color': eventsStore.categoryColor(event.category) }"
          @click="store.openEditModal(event)"
        >
          {{ event.title }}
        </button>
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
          <button
            v-for="event in timedEventsForDay(day)"
            :key="event.id"
            type="button"
            class="c-event-block"
            :style="blockStyle(event)"
            @click.stop="store.openEditModal(event)"
          >
            <div class="c-event-block__title">{{ event.title }}</div>
            <div class="c-event-block__time">
              {{ format(new Date(event.start), "HH:mm") }} – {{ format(new Date(event.end), "HH:mm") }}
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
