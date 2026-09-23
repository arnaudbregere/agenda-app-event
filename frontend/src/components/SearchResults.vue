<script setup lang="ts">
import { computed } from "vue";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCalendarStore } from "../stores/calendar.js";
import { useEventsStore } from "../stores/events.js";
import type { CalendarEvent } from "../api/types.js";

const emit = defineEmits<{ select: [event: CalendarEvent] }>();

const store = useCalendarStore();
const eventsStore = useEventsStore();

const results = computed(() => store.searchResults);

function eventWhen(event: CalendarEvent) {
  const day = format(new Date(event.start), "EEE d MMM yyyy", { locale: fr });
  if (event.allDay) return day;
  return `${day}, ${format(new Date(event.start), "HH:mm")}`;
}
</script>

<template>
  <div class="c-search-results" role="listbox" aria-label="Résultats de la recherche">
    <p v-if="!results.length" class="c-search-results__empty">Aucun événement trouvé.</p>
    <button
      v-for="event in results"
      :key="event.id"
      type="button"
      class="c-search-results__item"
      role="option"
      @click="emit('select', event)"
    >
      <span class="c-dot" :style="{ '--dot-color': eventsStore.categoryColor(event.category) }" />
      <span class="c-search-results__title">{{ event.title }}</span>
      <span class="c-search-results__when">{{ eventWhen(event) }}</span>
    </button>
  </div>
</template>
