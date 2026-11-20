<template>
  <div class="inline-flex p-1 rounded-xl bg-sunken border border-line text-[13px] font-semibold" role="group" aria-label="Mode">
    <button v-for="m in ['test', 'live']" :key="m" class="px-3.5 h-7 rounded-lg capitalize transition-all" :class="mode.mode === m ? (m === 'live' ? 'bg-ok text-white' : 'bg-warn text-white') : 'text-muted'" :style="{ border: 0, cursor: 'pointer', background: mode.mode === m ? undefined : 'transparent' }" @click="mode.set(m as any)">{{ m }}</button>
  </div>
</template>
<script setup lang="ts">
import { useMode } from 'src/stores/mode';
const mode = useMode();
</script>
