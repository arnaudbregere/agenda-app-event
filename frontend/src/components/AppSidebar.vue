<script setup>
import { useCalendarStore } from "../stores/calendar.js";
import MiniCalendar from "./MiniCalendar.vue";
import CategoryFilter from "./CategoryFilter.vue";
import Icon from "./ui/Icon.vue";

const store = useCalendarStore();
</script>

<template>
  <aside class="c-sidebar">
    <button type="button" class="c-btn c-sidebar__create" @click="store.openCreateModal()">
      <Icon name="plus" class="c-btn__icon" />
      Créer
    </button>
    <MiniCalendar />
    <CategoryFilter />
  </aside>
</template>
