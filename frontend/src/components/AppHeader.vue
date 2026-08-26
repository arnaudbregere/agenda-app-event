<script setup>
import { computed } from "vue";
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  format,
} from "date-fns";
import { fr } from "date-fns/locale";
import { useCalendarStore, VIEWS } from "../stores/calendar.js";
import { getWeekDays } from "../composables/useCalendarGrid.js";
import Icon from "./ui/Icon.vue";

const store = useCalendarStore();

const VIEW_LABELS = { month: "Mois", week: "Semaine", day: "Jour", list: "Liste" };

const periodLabel = computed(() => {
  const date = store.currentDate;
  if (store.currentView === "day") {
    return format(date, "EEEE d MMMM yyyy", { locale: fr });
  }
  if (store.currentView === "week") {
    const [first, ...rest] = getWeekDays(date);
    const last = rest[rest.length - 1];
    const sameMonth = first.getMonth() === last.getMonth();
    const start = format(first, sameMonth ? "d" : "d MMM", { locale: fr });
    const end = format(last, "d MMMM yyyy", { locale: fr });
    return `${start} – ${end}`;
  }
  // month & list
  return format(date, "MMMM yyyy", { locale: fr });
});

function step(direction) {
  const date = store.currentDate;
  switch (store.currentView) {
    case "week":
      store.setCurrentDate(direction > 0 ? addWeeks(date, 1) : subWeeks(date, 1));
      break;
    case "day":
      store.setCurrentDate(direction > 0 ? addDays(date, 1) : subDays(date, 1));
      break;
    default:
      store.setCurrentDate(direction > 0 ? addMonths(date, 1) : subMonths(date, 1));
  }
}
</script>

<template>
  <header class="c-app-header">
    <div class="c-app-header__brand">
      <svg class="c-app-header__logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </svg>
      <span class="u-hidden-mobile">Agenda</span>
    </div>

    <div class="c-app-header__nav">
      <button type="button" class="c-btn c-btn--text" @click="store.goToday">Aujourd'hui</button>
      <button type="button" class="c-btn c-btn--icon" aria-label="Précédent" @click="step(-1)">
        <Icon name="chevron-left" class="c-btn__icon" />
      </button>
      <button type="button" class="c-btn c-btn--icon" aria-label="Suivant" @click="step(1)">
        <Icon name="chevron-right" class="c-btn__icon" />
      </button>
      <h1 class="c-app-header__title">{{ periodLabel }}</h1>
    </div>

    <div class="c-app-header__search">
      <div class="c-search">
        <Icon name="search" class="c-search__icon" />
        <input
          v-model="store.searchQuery"
          type="search"
          class="c-search__input"
          placeholder="Rechercher un événement"
          aria-label="Rechercher un événement"
        />
        <button
          v-if="store.searchQuery"
          type="button"
          class="c-search__clear"
          aria-label="Effacer la recherche"
          @click="store.searchQuery = ''"
        >
          <Icon name="x" />
        </button>
      </div>
    </div>

    <div class="c-app-header__actions">
      <div class="c-view-switcher">
        <button
          v-for="view in VIEWS"
          :key="view"
          type="button"
          class="c-view-switcher__btn"
          :class="{ 'is-active': store.currentView === view }"
          @click="store.setView(view)"
        >
          {{ VIEW_LABELS[view] }}
        </button>
      </div>
    </div>
  </header>
</template>
