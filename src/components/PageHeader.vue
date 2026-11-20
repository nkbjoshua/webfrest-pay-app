<template>
  <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
    <div class="min-w-0">
      <h1 class="text-[24px] font-extrabold leading-tight">{{ title }}</h1>
      <p v-if="subtitle" class="text-muted text-[14px] mt-1">{{ subtitle }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2"><slot /></div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>();
</script>
