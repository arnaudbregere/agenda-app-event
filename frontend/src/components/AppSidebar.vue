<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";
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

// Focus management du drawer mobile (issue #40) : à l'ouverture, le focus
// part vers le premier élément du panneau ; à la fermeture (Échap, clic sur
// le fond, sélection d'une vue via goToCurrent), il revient sur l'élément
// qui avait le focus au moment de l'ouverture (le bouton menu, en usage
// normal) — pas de piège de focus complet, la sidebar n'est pas une modale.
const asideRef = ref<HTMLElement | null>(null);
let triggerEl: HTMLElement | null = null;

watch(
  () => store.isSidebarOpen,
  async (open) => {
    if (open) {
      triggerEl = document.activeElement as HTMLElement | null;
      await nextTick();
      asideRef.value?.querySelector<HTMLElement>("button, a, input, [tabindex]")?.focus();
    } else {
      triggerEl?.focus();
      triggerEl = null;
    }
  },
);

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && store.isSidebarOpen) store.closeSidebar();
};

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <aside id="app-sidebar" ref="asideRef" class="c-sidebar">
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
