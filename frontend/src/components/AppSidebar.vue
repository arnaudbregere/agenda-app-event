<script setup lang="ts">
import { useCalendarStore, type CalendarView } from "../stores/calendar.js";
import MiniCalendar from "./MiniCalendar.vue";
import CategoryFilter from "./CategoryFilter.vue";
import Icon from "./ui/Icon.vue";

const store = useCalendarStore();

const QUICK_ACCESS: { view: CalendarView; label: string }[] = [
  { view: "day", label: "Aujourd'hui" },
  { view: "week", label: "Cette semaine" },
  { view: "month", label: "Ce mois-ci" },
];
</script>

<template>
  <aside class="c-sidebar">
    <button type="button" class="c-btn c-sidebar__create" @click="store.openCreateModal()">
      <Icon name="plus" class="c-btn__icon" />
      Créer
    </button>
    <nav class="c-sidebar__quick-access" aria-label="Accès rapide">
      <button
        v-for="item in QUICK_ACCESS"
        :key="item.view"
        type="button"
        class="c-btn c-btn--text c-sidebar__quick-btn"
        @click="store.goToCurrent(item.view)"
      >
        {{ item.label }}
      </button>
    </nav>
    <MiniCalendar />
    <CategoryFilter />
  </aside>
</template>
