<script setup>
import { computed } from "vue";
import { useCalendarStore } from "../../stores/calendar.js";
import { getWeekDays } from "../../composables/useCalendarGrid.js";
import TimeGrid from "./TimeGrid.vue";

const store = useCalendarStore();
const days = computed(() => getWeekDays(store.currentDate));
</script>

<template>
  <TimeGrid :days="days" />
</template>
