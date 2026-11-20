<template>
  <div class="flex items-center justify-between gap-3 flex-wrap px-5 py-3.5 hairline text-[13px] text-muted">
    <span>Showing <b class="text-ink">{{ from.toLocaleString() }} – {{ to.toLocaleString() }}</b> of <b class="text-ink">{{ total.toLocaleString() }}</b> {{ noun || 'results' }}</span>
    <div class="flex items-center gap-2">
      <button class="pg" :disabled="page <= 1" aria-label="Previous page" @click="$emit('update:page', page - 1)"><q-icon name="chevron_left" size="18px" /></button>
      <template v-for="n in shown" :key="n">
        <span v-if="n === 0" class="px-1">…</span>
        <button v-else class="pg" :class="{ on: n === page }" :aria-current="n === page ? 'page' : undefined" @click="$emit('update:page', n)">{{ n }}</button>
      </template>
      <button class="pg" :disabled="page >= pages" aria-label="Next page" @click="$emit('update:page', page + 1)"><q-icon name="chevron_right" size="18px" /></button>
      <select v-if="sizes" class="field s-sm" style="width: 112px; margin-left: 6px" aria-label="Rows per page" :value="perPage" @change="$emit('update:perPage', Number(($event.target as HTMLSelectElement).value))"><option v-for="n in sizes" :key="n" :value="n">{{ n }} / page</option></select>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ page: number; perPage: number; total: number; noun?: string; sizes?: number[] }>();
defineEmits(['update:page', 'update:perPage']);
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)));
const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.perPage + 1));
const to = computed(() => Math.min(props.total, props.page * props.perPage));
// 1 … 4 5 6 … 20 : the first, the last and the neighbours of the current page (0 = a gap)
const shown = computed(() => {
  const n = pages.value, c = props.page; const set = new Set([1, n, c - 1, c, c + 1].filter((x) => x >= 1 && x <= n)); const out: number[] = []; let prev = 0;
  for (const x of [...set].sort((a, b) => a - b)) { if (x - prev > 1) out.push(0); out.push(x); prev = x; }
  return out;
});
</script>
<style scoped>
.pg { min-width: 34px; height: 34px; padding: 0 8px; border-radius: 9px; border: 0; background: rgb(var(--sunken)); color: rgb(var(--ink)); font: 600 13px Inter, sans-serif; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.pg:hover:not(:disabled):not(.on) { background: rgb(var(--line)); }
.pg.on { background: linear-gradient(135deg, #065f46, #059669); color: #fff; }
.pg:disabled { opacity: 0.45; cursor: default; }
</style>
