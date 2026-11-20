<template>
  <div class="inline-flex items-center gap-2.5">
    <svg :width="size" :height="size" viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient :id="gid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#064E3B" /><stop offset="0.55" stop-color="#059669" /><stop offset="1" stop-color="#34D399" /></linearGradient></defs>
      <rect width="64" height="64" rx="16" :fill="`url(#${gid})`" />
      <path d="M13 20l8.5 26 10.5-17 10.5 17L51 20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span v-if="!iconOnly" :style="{ color: light ? '#fff' : 'rgb(var(--ink))', fontSize: size * 0.5 + 'px' }" class="font-extrabold tracking-tight leading-none">
      Webfrest <span class="font-semibold" :style="{ color: light ? '#6ee7b7' : 'rgb(var(--brand))' }">Pay</span>
    </span>
  </div>
</template>
<script setup lang="ts">
import { useId } from 'vue';
withDefaults(defineProps<{ size?: number; light?: boolean; iconOnly?: boolean }>(), { size: 34 });
const gid = 'wfg' + useId().replace(/[^a-z0-9]/gi, '');
</script>
