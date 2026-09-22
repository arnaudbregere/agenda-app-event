<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: "primary" | "text" | "danger" | "icon"
    size?: "" | "sm"
    ariaLabel?: string
  }>(),
  {
    variant: "text",
    size: "",
    ariaLabel: "",
  },
)
defineEmits<{ click: [payload: MouseEvent] }>()
</script>

<template>
  <button
    type="button"
    class="c-btn"
    :class="[`c-btn--${variant}`, size && `c-btn--${size}`]"
    :aria-label="ariaLabel || undefined"
    @click="$emit('click', $event)"
  >
    <slot name="icon" />
    <slot />
  </button>
</template>
