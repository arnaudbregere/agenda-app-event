<script setup>
defineProps({
  variant: { type: String, default: "text" }, // primary | text | danger | icon
  size: { type: String, default: "" }, // "" | sm
  ariaLabel: { type: String, default: "" },
});
defineEmits(["click"]);
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
