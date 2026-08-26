<script setup>
import { useEventsStore } from "../stores/events.js";
import { useCalendarStore } from "../stores/calendar.js";
import Icon from "./ui/Icon.vue";

const eventsStore = useEventsStore();
const calendarStore = useCalendarStore();
</script>

<template>
  <div class="c-category-filter">
    <h3 class="c-sidebar__section-title">Mes catégories</h3>
    <label
      v-for="category in eventsStore.categories"
      :key="category.id"
      class="c-category-filter__item"
    >
      <input
        type="checkbox"
        class="u-visually-hidden"
        :checked="calendarStore.isCategoryActive(category.id)"
        @change="calendarStore.toggleCategory(category.id)"
      />
      <span
        class="c-category-filter__checkbox"
        :class="{ 'is-checked': calendarStore.isCategoryActive(category.id) }"
        :style="{ '--dot-color': category.color }"
      >
        <Icon v-if="calendarStore.isCategoryActive(category.id)" name="check" />
      </span>
      <span class="c-category-filter__label">{{ category.label }}</span>
    </label>
  </div>
</template>
