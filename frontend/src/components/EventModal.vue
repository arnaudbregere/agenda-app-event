<script setup>
import { computed, reactive, ref, watch } from "vue";
import { format } from "date-fns";
import { useCalendarStore } from "../stores/calendar.js";
import { useEventsStore } from "../stores/events.js";
import Icon from "./ui/Icon.vue";

const store = useCalendarStore();
const eventsStore = useEventsStore();

const isEditing = computed(() => Boolean(store.editingEvent));
const submitting = ref(false);
const serverError = ref("");

const DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm";
const DATE_FORMAT = "yyyy-MM-dd";

const form = reactive({
  title: "",
  description: "",
  location: "",
  allDay: false,
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  category: "autre",
});

function resetFromStore() {
  serverError.value = "";
  const event = store.editingEvent;
  const defaults = store.modalDefaults;

  const start = event ? new Date(event.start) : defaults?.start ?? roundToNextHour(new Date());
  const end = event ? new Date(event.end) : defaults?.end ?? addHour(start);

  form.title = event?.title ?? "";
  form.description = event?.description ?? "";
  form.location = event?.location ?? "";
  form.allDay = event?.allDay ?? defaults?.allDay ?? false;
  form.category = event?.category ?? "autre";
  form.startDate = format(start, DATE_FORMAT);
  form.startTime = format(start, "HH:mm");
  form.endDate = format(end, DATE_FORMAT);
  form.endTime = format(end, "HH:mm");
}

function roundToNextHour(date) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}
function addHour(date) {
  const d = new Date(date);
  d.setHours(d.getHours() + 1);
  return d;
}

watch(() => store.modalOpen, (open) => { if (open) resetFromStore(); }, { immediate: true });

const errors = ref([]);

function buildPayload() {
  const start = form.allDay
    ? new Date(`${form.startDate}T00:00:00`)
    : new Date(`${form.startDate}T${form.startTime}`);
  const end = form.allDay
    ? new Date(`${form.endDate}T23:59:59`)
    : new Date(`${form.endDate}T${form.endTime}`);

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    location: form.location.trim(),
    allDay: form.allDay,
    category: form.category,
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function validate(payload) {
  const list = [];
  if (!payload.title) list.push("Le titre est requis.");
  if (new Date(payload.end) < new Date(payload.start)) list.push("La date de fin doit être après la date de début.");
  return list;
}

async function handleSubmit() {
  const payload = buildPayload();
  errors.value = validate(payload);
  if (errors.value.length) return;

  submitting.value = true;
  serverError.value = "";
  try {
    if (isEditing.value) {
      await eventsStore.updateEvent(store.editingEvent.id, payload);
    } else {
      await eventsStore.createEvent(payload);
    }
    store.closeModal();
  } catch (err) {
    serverError.value = err.message;
  } finally {
    submitting.value = false;
  }
}

async function handleDelete() {
  if (!store.editingEvent) return;
  if (!window.confirm(`Supprimer l'événement « ${store.editingEvent.title} » ?`)) return;
  submitting.value = true;
  try {
    await eventsStore.deleteEvent(store.editingEvent.id);
    store.closeModal();
  } catch (err) {
    serverError.value = err.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="store.modalOpen" class="c-modal__overlay" @mousedown.self="store.closeModal">
        <form class="c-modal__panel" @submit.prevent="handleSubmit">
          <div class="c-modal__header">
            <h2 class="c-modal__title">{{ isEditing ? "Modifier l'événement" : "Nouvel événement" }}</h2>
            <button type="button" class="c-btn c-btn--icon" aria-label="Fermer" @click="store.closeModal">
              <Icon name="x" class="c-btn__icon" />
            </button>
          </div>

          <div class="c-modal__body">
            <p v-if="serverError" class="c-form__banner">{{ serverError }}</p>
            <p v-if="errors.length" class="c-form__banner">{{ errors.join(" ") }}</p>

            <div class="c-form__field">
              <label class="c-form__label" for="event-title">Titre</label>
              <input
                id="event-title"
                v-model="form.title"
                type="text"
                class="c-form__input"
                placeholder="Ajouter un titre"
                required
                autofocus
              />
            </div>

            <div class="c-form__field">
              <label class="c-form__checkbox-row">
                <input v-model="form.allDay" type="checkbox" />
                Toute la journée
              </label>
            </div>

            <div class="c-form__field">
              <label class="c-form__label">Début</label>
              <div class="c-form__row">
                <input v-model="form.startDate" type="date" class="c-form__input" required />
                <input v-if="!form.allDay" v-model="form.startTime" type="time" class="c-form__input" required />
              </div>
            </div>

            <div class="c-form__field">
              <label class="c-form__label">Fin</label>
              <div class="c-form__row">
                <input v-model="form.endDate" type="date" class="c-form__input" required />
                <input v-if="!form.allDay" v-model="form.endTime" type="time" class="c-form__input" required />
              </div>
            </div>

            <div class="c-form__field">
              <label class="c-form__label" for="event-location">Lieu</label>
              <input id="event-location" v-model="form.location" type="text" class="c-form__input" placeholder="Ajouter un lieu" />
            </div>

            <div class="c-form__field">
              <label class="c-form__label" for="event-description">Description</label>
              <textarea id="event-description" v-model="form.description" class="c-form__textarea" placeholder="Ajouter une description" />
            </div>

            <div class="c-form__field">
              <label class="c-form__label">Catégorie</label>
              <div class="c-form__swatches">
                <button
                  v-for="category in eventsStore.categories"
                  :key="category.id"
                  type="button"
                  class="c-form__swatch"
                  :class="{ 'is-selected': form.category === category.id }"
                  :style="{ '--swatch-color': category.color }"
                  :aria-label="category.label"
                  :title="category.label"
                  @click="form.category = category.id"
                >
                  <Icon v-if="form.category === category.id" name="check" />
                </button>
              </div>
            </div>
          </div>

          <div class="c-modal__footer">
            <button
              v-if="isEditing"
              type="button"
              class="c-btn c-btn--danger"
              :disabled="submitting"
              @click="handleDelete"
            >
              <Icon name="trash" class="c-btn__icon" />
              Supprimer
            </button>
            <div class="c-modal__footer-actions">
              <button type="button" class="c-btn c-btn--text" @click="store.closeModal">Annuler</button>
              <button type="submit" class="c-btn c-btn--primary" :disabled="submitting">
                {{ isEditing ? "Enregistrer" : "Créer" }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>
