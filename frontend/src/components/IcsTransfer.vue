<script setup lang="ts">
import { ref } from "vue";
import { useEventsStore } from "../stores/events.js";
import { eventsApi } from "../api/events.js";

const eventsStore = useEventsStore();

// Le champ fichier reste masqué : le bouton « Importer » est le contrôle
// accessible, il ouvre le sélecteur de fichier natif.
const fileInput = ref<HTMLInputElement | null>(null);
const successMessage = ref("");
const errorMessage = ref("");

const openFilePicker = () => fileInput.value?.click();

const onFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // Vide le champ pour pouvoir réimporter le même fichier ensuite.
  input.value = "";
  if (!file) return;

  successMessage.value = "";
  errorMessage.value = "";
  try {
    const imported = await eventsStore.importIcs(await file.text());
    successMessage.value = `${imported} événement(s) importé(s).`;
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : String(err);
  }
};
</script>

<template>
  <section class="c-ics-transfer" aria-labelledby="ics-transfer-title">
    <h3 id="ics-transfer-title" class="c-sidebar__section-title">Calendrier (.ics)</h3>
    <a class="c-btn c-btn--text" :href="eventsApi.exportUrl()" download="agenda.ics">Exporter</a>
    <button type="button" class="c-btn c-btn--text" @click="openFilePicker">Importer</button>
    <input
      ref="fileInput"
      type="file"
      accept=".ics,text/calendar"
      class="u-hidden"
      @change="onFileChange"
    />
    <p v-if="successMessage" role="status" class="c-ics-transfer__message">{{ successMessage }}</p>
    <p v-if="errorMessage" role="alert" class="c-ics-transfer__message c-ics-transfer__message--error">
      {{ errorMessage }}
    </p>
  </section>
</template>
