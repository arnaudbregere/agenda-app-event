<script setup lang="ts">
import { ref, watch } from "vue";

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

const dialogRef = ref<HTMLDialogElement | null>(null);

// showModal()/close() plutôt qu'un v-if + overlay + piège de focus/Échap
// maison : un <dialog> ouvert en modal gère nativement tout ça (focus piégé,
// reste de la page rendu inert, focus restitué au déclencheur à la
// fermeture), sans code à maintenir ni bug de synchronisation à surveiller.
watch(
  () => props.open,
  (open) => (open ? dialogRef.value?.showModal() : dialogRef.value?.close()),
);

// Empêche la fermeture native par défaut : on laisse le watch ci-dessus,
// piloté par le parent via l'event cancel, être la seule source de vérité
// sur l'état ouvert/fermé.
const handleCancel = (event: Event) => {
  event.preventDefault();
  emit("cancel");
};

// Un clic sur le ::backdrop cible le <dialog> lui-même (ce n'est pas un
// élément DOM à part) : cliquer sur son contenu ne remonte pas jusqu'ici.
const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === dialogRef.value) emit("cancel");
};
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialogRef"
      class="c-confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      @cancel="handleCancel"
      @click="handleBackdropClick"
    >
      <h2 id="confirm-dialog-title" class="c-confirm-dialog__title">{{ title }}</h2>
      <p id="confirm-dialog-message" class="c-confirm-dialog__message">{{ message }}</p>
      <div class="c-confirm-dialog__actions">
        <button autofocus type="button" class="c-btn c-btn--text" @click="emit('cancel')">
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
    </dialog>
  </Teleport>
</template>
