<script setup>
import { computed } from "vue";
import { useCalendarStore } from "../../stores/calendar.js";
import TimeGrid from "./TimeGrid.vue";

const store = useCalendarStore();
const days = computed(() => [store.currentDate]);
</script>

<template>
  <TimeGrid :days="days" />
</template>
