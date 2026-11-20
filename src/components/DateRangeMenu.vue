<template>
  <button class="btn range-btn" type="button"><q-icon name="calendar_month" size="20px" /><span>{{ label }}</span><q-icon name="expand_more" size="20px" />
    <q-menu anchor="bottom right" self="top right" :offset="[0, 8]" class="range-menu">
      <div class="p-2 grid gap-0.5" style="min-width: 250px">
        <button v-for="p in presets" :key="p.id" v-close-popup class="range-item" :class="{ on: active === p.id }" type="button" @click="pick(p.id)">{{ p.label }}</button>
        <div class="px-2 pt-2 pb-1 hairline mt-1">
          <div class="text-[11.5px] font-bold uppercase tracking-wider text-muted mb-1.5">Custom range</div>
          <div class="flex gap-2"><input v-model="from" type="date" class="field s-sm" aria-label="From" /><input v-model="to" type="date" class="field s-sm" aria-label="To" /></div>
          <button v-close-popup class="btn primary s-sm block mt-2" type="button" :disabled="!from || !to || from > to" @click="apply">Apply</button>
        </div>
      </div>
    </q-menu>
  </button>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
// v-model is { from, to } as yyyy-MM-dd ('' = no limit). `preset` tells the page how to word "vs last month".
const props = defineProps<{ modelValue: { from: string; to: string } }>();
const emit = defineEmits(['update:modelValue', 'preset']);
const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const range = (id: string): { from: string; to: string } => {
  const n = new Date(); const y = n.getFullYear(), m = n.getMonth();
  switch (id) {
    case 'today': return { from: fmt(n), to: fmt(n) };
    case '7d': return { from: fmt(new Date(y, m, n.getDate() - 6)), to: fmt(n) };
    case '30d': return { from: fmt(new Date(y, m, n.getDate() - 29)), to: fmt(n) };
    case 'month': return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
    case 'lastmonth': return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) };
    case 'year': return { from: fmt(new Date(y, 0, 1)), to: fmt(new Date(y, 11, 31)) };
    default: return { from: '', to: '' };
  }
};
const presets = [{ id: 'today', label: 'Today' }, { id: '7d', label: 'Last 7 days' }, { id: '30d', label: 'Last 30 days' }, { id: 'month', label: 'This month' }, { id: 'lastmonth', label: 'Last month' }, { id: 'year', label: 'This year' }, { id: 'all', label: 'All time' }];
const from = ref(props.modelValue.from); const to = ref(props.modelValue.to);
watch(() => props.modelValue, (v) => { from.value = v.from; to.value = v.to; });
const active = computed(() => presets.find((p) => { const r = range(p.id); return r.from === props.modelValue.from && r.to === props.modelValue.to; })?.id || 'custom');
const pretty = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const label = computed(() => (props.modelValue.from && props.modelValue.to ? `${pretty(props.modelValue.from)} – ${pretty(props.modelValue.to)}` : 'All time'));
function pick(id: string) { emit('preset', id); emit('update:modelValue', range(id)); }
function apply() { emit('preset', 'custom'); emit('update:modelValue', { from: from.value, to: to.value }); }
defineExpose({ range });
</script>
<style scoped>
.range-btn { height: 46px; padding: 0 14px; gap: 10px; border-radius: 12px; }
.range-item { text-align: left; padding: 9px 12px; border: 0; border-radius: 9px; background: none; font: 500 14px Inter, sans-serif; color: rgb(var(--ink)); cursor: pointer; }
.range-item:hover { background: rgb(var(--sunken)); } .range-item.on { background: rgb(var(--brand) / 0.12); color: rgb(var(--brand)); font-weight: 600; }
</style>
