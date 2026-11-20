<template>
  <span class="inline-flex items-center"><q-icon name="info_outline" size="16px" class="text-muted" style="cursor: help"><q-tooltip anchor="top middle" self="bottom middle" max-width="280px" class="text-[12.5px]"><slot>{{ text }}</slot></q-tooltip></q-icon></span>
</template>
<script setup lang="ts">
defineProps<{ text?: string }>();
</script>
