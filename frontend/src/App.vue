<script setup lang="ts">
import { onMounted, type Component } from "vue";
import { useEventsStore } from "./stores/events.js";
import { useCalendarStore, type CalendarView } from "./stores/calendar.js";
import AppHeader from "./components/AppHeader.vue";
import AppSidebar from "./components/AppSidebar.vue";
import MonthView from "./components/views/MonthView.vue";
import WeekView from "./components/views/WeekView.vue";
import DayView from "./components/views/DayView.vue";
import ListView from "./components/views/ListView.vue";
import EventModal from "./components/EventModal.vue";

const eventsStore = useEventsStore();
const calendarStore = useCalendarStore();

const VIEW_COMPONENTS: Record<CalendarView, Component> = { month: MonthView, week: WeekView, day: DayView, list: ListView };

onMounted(() => {
  eventsStore.fetchAll();
});
</script>

<template>
  <div class="o-app-shell">
    <div class="o-app-shell__header">
      <AppHeader />
    </div>
    <div class="o-app-shell__sidebar">
      <AppSidebar />
    </div>
    <main class="o-app-shell__main">
      <p v-if="eventsStore.error" class="c-form__banner" style="margin: var(--space-3)">
        Impossible de contacter l'API : {{ eventsStore.error }}
      </p>
      <component :is="VIEW_COMPONENTS[calendarStore.currentView]" />
    </main>
    <EventModal />
  </div>
</template>
