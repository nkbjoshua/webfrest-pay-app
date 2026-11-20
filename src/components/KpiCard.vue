<template>
  <div class="card kpi" :class="{ compact }">
    <div class="kpi-icon" :class="tone"><q-icon :name="icon" size="30px" /></div>
    <div class="min-w-0">
      <div class="text-[13.5px] text-muted">{{ label }}</div>
      <div class="text-[26px] font-extrabold leading-tight nowrap">{{ value }}</div>
      <div v-if="delta !== null && delta !== undefined" class="text-[12.5px] mt-0.5 flex items-center gap-1" :style="{ color: good ? 'rgb(var(--ok))' : 'rgb(var(--bad))' }"><q-icon :name="delta >= 0 ? 'arrow_upward' : 'arrow_downward'" size="14px" /><b>{{ delta >= 0 ? '+' : '' }}{{ delta }}%</b><span class="text-muted">{{ deltaLabel || 'vs previous period' }}</span></div>
      <div v-else-if="note" class="text-[12.5px] text-muted mt-0.5">{{ note }}</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
// A figure with an icon and how it moved against the period before. `lowerIsBetter` flips the colour (e.g. fewer pending payouts is good).
const props = defineProps<{ icon: string; label: string; value: string | number; delta?: number | null; deltaLabel?: string; note?: string; tone?: 'green' | 'blue' | 'orange' | 'violet' | 'red'; lowerIsBetter?: boolean; compact?: boolean }>();
const good = computed(() => (props.delta ?? 0) === 0 || (props.lowerIsBetter ? (props.delta as number) < 0 : (props.delta as number) > 0));
const tone = computed(() => props.tone || 'green');
</script>
<style scoped>
.kpi { display: flex; align-items: center; gap: 16px; padding: 18px 20px; }
.kpi.compact { padding: 14px 16px; gap: 14px; } .kpi.compact .kpi-icon { width: 52px; height: 52px; border-radius: 14px; } .kpi.compact .text-\[26px\] { font-size: 21px; }
.kpi-icon { width: 62px; height: 62px; border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.kpi-icon.green { background: rgb(var(--brand) / 0.12); color: rgb(var(--brand)); } .kpi-icon.blue { background: rgb(var(--info) / 0.12); color: rgb(var(--info)); }
.kpi-icon.red { background: rgb(var(--bad) / 0.12); color: rgb(var(--bad)); } .kpi-icon.orange { background: rgb(var(--warn) / 0.14); color: rgb(var(--warn)); } .kpi-icon.violet { background: rgb(139 92 246 / 0.13); color: rgb(139 92 246); }
</style>
