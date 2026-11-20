<template>
  <div class="card card-pad">
    <div class="flex items-center justify-between"><span class="text-[12.5px] font-semibold text-muted uppercase tracking-wide">{{ label }}</span><q-icon v-if="icon" :name="icon" size="20px" class="text-brand" /></div>
    <div class="text-[26px] font-extrabold mt-2 tracking-tight">{{ value }}</div>
    <div v-if="hint" class="text-[12.5px] text-muted mt-1">{{ hint }}</div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ label: string; value: string | number; hint?: string; icon?: string }>();
</script>
