<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
  }>(),
  {
    confirmLabel: "Confirmer",
    cancelLabel: "Annuler",
    danger: false,
  },
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();

const panelRef = ref<HTMLElement | null>(null);
const cancelRef = ref<HTMLButtonElement | null>(null);
let lastFocusedEl: HTMLElement | null = null;

watch(
  () => props.open,
  (open) => {
    if (open) {
      lastFocusedEl = document.activeElement as HTMLElement | null;
      nextTick(() => cancelRef.value?.focus());
    } else {
      lastFocusedEl?.focus?.();
      lastFocusedEl = null;
    }
  },
  { immediate: true },
);

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    emit("cancel");
    return;
  }
  if (event.key !== "Tab" || !panelRef.value) return;

  const focusable = panelRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm-dialog">
      <div v-if="open" class="c-confirm-dialog__overlay" @mousedown.self="emit('cancel')">
        <div
          ref="panelRef"
          class="c-confirm-dialog__panel"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
          @keydown="handleKeydown"
        >
          <h2 id="confirm-dialog-title" class="c-confirm-dialog__title">{{ title }}</h2>
          <p id="confirm-dialog-message" class="c-confirm-dialog__message">{{ message }}</p>
          <div class="c-confirm-dialog__actions">
            <button ref="cancelRef" type="button" class="c-btn c-btn--text" @click="emit('cancel')">
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              class="c-btn"
              :class="danger ? 'c-btn--danger-solid' : 'c-btn--primary'"
              @click="emit('confirm')"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
