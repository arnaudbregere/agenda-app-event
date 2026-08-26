<script setup>
import { computed } from "vue";
import { addMonths, subMonths, format, isSameMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { useCalendarStore } from "../stores/calendar.js";
import { getMonthWeeks, isToday } from "../composables/useCalendarGrid.js";
import Icon from "./ui/Icon.vue";

const store = useCalendarStore();

const weeks = computed(() => getMonthWeeks(store.currentDate));
const title = computed(() => format(store.currentDate, "MMMM yyyy", { locale: fr }));
const weekdayLabels = ["L", "M", "M", "J", "V", "S", "D"];

function prevMonth() {
  store.setCurrentDate(subMonths(store.currentDate, 1));
}
function nextMonth() {
  store.setCurrentDate(addMonths(store.currentDate, 1));
}
function selectDay(day) {
  store.setCurrentDate(day);
}
function isSelected(day) {
  return day.toDateString() === store.currentDate.toDateString();
}
</script>

<template>
  <div class="c-mini-cal">
    <div class="c-mini-cal__header">
      <h3 class="c-mini-cal__title">{{ title }}</h3>
      <div class="c-mini-cal__nav">
        <button type="button" class="c-btn c-btn--icon c-btn--sm" aria-label="Mois précédent" @click="prevMonth">
          <Icon name="chevron-left" class="c-btn__icon" />
        </button>
        <button type="button" class="c-btn c-btn--icon c-btn--sm" aria-label="Mois suivant" @click="nextMonth">
          <Icon name="chevron-right" class="c-btn__icon" />
        </button>
      </div>
    </div>
    <div class="c-mini-cal__grid">
      <span v-for="(w, i) in weekdayLabels" :key="i" class="c-mini-cal__weekday">{{ w }}</span>
      <template v-for="week in weeks" :key="week[0].toISOString()">
        <button
          v-for="day in week"
          :key="day.toISOString()"
          type="button"
          class="c-mini-cal__day"
          :class="{
            'is-outside': !isSameMonth(day, store.currentDate),
            'is-today': isToday(day),
            'is-selected': isSelected(day),
          }"
          @click="selectDay(day)"
        >
          {{ day.getDate() }}
        </button>
      </template>
    </div>
  </div>
</template>
