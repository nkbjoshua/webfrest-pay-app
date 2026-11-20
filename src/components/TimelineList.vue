<template>
  <ol class="tl">
    <li v-for="(e, i) in events" :key="i"><span class="dot"></span>
      <div><div class="text-[13.5px]"><b>{{ nice(e.type) }}</b><span v-if="e.to" class="text-muted ml-1.5"><q-icon name="east" size="13px" />  {{ nice(e.to) }}</span></div>
        <div class="text-[12.5px] text-muted">{{ dt(e.at) }}<span v-if="e.detail"> · {{ e.detail }}</span></div></div></li>
  </ol>
</template>
<script setup lang="ts">
import { dt } from 'src/utils/format';
// Events down a line, newest at the bottom, like the payment's own history.
defineProps<{ events: { type: string; to?: string; detail?: string; at: string }[] }>();
const nice = (s: string) => (s || '').replace(/_/g, ' ');
</script>
<style scoped>
.tl { list-style: none; margin: 4px 0 0; padding: 0; display: grid; gap: 0; }
.tl li { position: relative; display: flex; gap: 14px; padding-bottom: 16px; }
.tl li:last-child { padding-bottom: 0; }
.tl li::before { content: ''; position: absolute; left: 5px; top: 16px; bottom: -2px; width: 2px; background: rgb(var(--line)); }
.tl li:last-child::before { display: none; }
.dot { width: 12px; height: 12px; border-radius: 50%; background: rgb(var(--brand)); margin-top: 4px; flex-shrink: 0; box-shadow: 0 0 0 3px rgb(var(--brand) / 0.15); position: relative; z-index: 1; }
</style>
