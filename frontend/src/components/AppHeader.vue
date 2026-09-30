<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
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
import { useCalendarStore, VIEWS, type CalendarView } from "../stores/calendar.js";
import { getWeekDays } from "../composables/useCalendarGrid.js";
import type { CalendarEvent } from "../api/types.js";
import Icon from "./ui/Icon.vue";
import SearchResults from "./SearchResults.vue";

const store = useCalendarStore();

const VIEW_LABELS: Record<CalendarView, string> = { month: "Mois", week: "Semaine", day: "Jour", list: "Liste" };

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

// Le panneau de résultats reste fermé tant que la recherche n'a pas le focus ;
// il se referme à la sortie du champ, sur Échap ou après sélection.
const searchOpen = ref(false);

function onSearchFocusOut(e: FocusEvent) {
  const container = e.currentTarget as HTMLElement;
  if (!container.contains(e.relatedTarget as Node | null)) searchOpen.value = false;
}

// Sous 900px, le champ de recherche est masqué par défaut (place limitée
// dans le header, voir _app-header.scss) et se déplie via un bouton dédié.
// Le déclencheur est toujours ce même bouton (pas de document.activeElement
// : Safari ne lui donne pas le focus au clic, cf. mousedown.prevent plus
// bas).
const mobileSearchOpen = ref(false);
const searchContainerRef = ref<HTMLElement | null>(null);
const searchToggleRef = ref<HTMLElement | null>(null);

const toggleMobileSearch = async () => {
  mobileSearchOpen.value = !mobileSearchOpen.value;
  if (mobileSearchOpen.value) {
    await nextTick();
    searchContainerRef.value?.querySelector("input")?.focus();
  } else {
    searchToggleRef.value?.focus();
  }
};

const closeMobileSearch = () => {
  if (!mobileSearchOpen.value) return;
  mobileSearchOpen.value = false;
  // <input type="search"> retire nativement le focus sur Échap, après nos
  // gestionnaires et malgré preventDefault() — setTimeout repousse le
  // focus() après ce retrait plutôt que de se le faire écraser.
  setTimeout(() => searchToggleRef.value?.focus(), 0);
};

// Un seul appui referme liste de résultats et champ mobile : le
// comportement natif ci-dessus sur <input type="search"> rend peu fiable
// un enchaînement en deux temps sur deux appuis successifs.
const onSearchKeydown = (e: KeyboardEvent) => {
  e.preventDefault();
  searchOpen.value = false;
  closeMobileSearch();
};

// AppSidebar.vue restitue le focus au déclencheur en lisant
// document.activeElement à l'ouverture : on le force explicitement ici
// (même raison que pour la recherche mobile ci-dessus) plutôt que de
// compter sur le focus-au-clic natif du bouton.
const onToggleSidebar = (e: MouseEvent) => {
  (e.currentTarget as HTMLElement).focus();
  store.toggleSidebar();
};

function selectResult(event: CalendarEvent) {
  searchOpen.value = false;
  mobileSearchOpen.value = false;
  store.openEditModal(event);
}

function step(direction: 1 | -1) {
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
  <header class="c-app-header" :class="{ 'is-search-open': mobileSearchOpen }">
    <button
      type="button"
      class="c-btn c-btn--icon c-app-header__menu-toggle"
      :aria-expanded="store.isSidebarOpen"
      aria-controls="app-sidebar"
      :aria-label="store.isSidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'"
      @click="onToggleSidebar"
    >
      <Icon :name="store.isSidebarOpen ? 'x' : 'menu'" class="c-btn__icon" />
    </button>

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

    <div id="mobile-search" ref="searchContainerRef" class="c-app-header__search">
      <div
        class="c-search"
        @focusin="searchOpen = true"
        @focusout="onSearchFocusOut"
        @keydown.esc="onSearchKeydown"
      >
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
        <!-- mousedown.prevent : garde le focus dans le conteneur (Safari ne focus pas les boutons au clic) -->
        <SearchResults
          v-if="searchOpen && store.searchQuery.trim()"
          @mousedown.prevent
          @select="selectResult"
        />
      </div>
    </div>

    <div class="c-app-header__actions">
      <button
        ref="searchToggleRef"
        type="button"
        class="c-btn c-btn--icon c-app-header__search-toggle"
        :aria-expanded="mobileSearchOpen"
        aria-controls="mobile-search"
        :aria-label="mobileSearchOpen ? 'Fermer la recherche' : 'Rechercher'"
        @click="toggleMobileSearch"
      >
        <Icon :name="mobileSearchOpen ? 'x' : 'search'" class="c-btn__icon" />
      </button>

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
