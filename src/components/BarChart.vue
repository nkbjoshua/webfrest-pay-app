<template>
  <div>
    <svg :viewBox="`0 0 ${w} ${h}`" class="w-full" style="height: 200px" preserveAspectRatio="none" role="img" aria-label="Volume chart">
      <defs><linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(var(--cyan))" /><stop offset="1" stop-color="rgb(var(--brand))" /></linearGradient></defs>
      <g v-for="g in 4" :key="g"><line :x1="0" :x2="w" :y1="(h - 24) * (g / 4)" :y2="(h - 24) * (g / 4)" stroke="rgb(var(--line))" stroke-width="1" vector-effect="non-scaling-stroke" /></g>
      <g v-for="(d, i) in data" :key="i" @mouseenter="hover = i" @mouseleave="hover = -1">
        <rect :x="i * step + gap" :y="(h - 24) - barH(d.amount)" :width="step - gap * 2" :height="Math.max(barH(d.amount), d.amount ? 2 : 0)" rx="5" :fill="hover === i ? 'rgb(var(--cyan))' : 'url(#bar)'" />
        <rect :x="i * step" y="0" :width="step" :height="h" fill="transparent" />
      </g>
    </svg>
    <div class="flex justify-between text-[11px] text-muted mt-1 px-0.5"><span v-for="(d, i) in data" :key="i" :style="{ flex: 1, textAlign: 'center', visibility: i % 2 === 0 || data.length < 8 ? 'visible' : 'hidden' }">{{ label(d.day) }}</span></div>
    <div class="text-[12.5px] text-muted mt-2 h-4">
      <template v-if="hover >= 0">{{ label(data[hover].day, true) }} · <b class="text-ink">{{ ghs(data[hover].amount) }}</b> · {{ data[hover].count }} payment{{ data[hover].count === 1 ? '' : 's' }}</template>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { ghs } from 'src/utils/format';
const props = defineProps<{ data: { day: string; amount: number; count: number }[] }>();
const w = 700, h = 200, gap = 6;
const hover = ref(-1);
const step = computed(() => w / Math.max(1, props.data.length));
const max = computed(() => Math.max(1, ...props.data.map((d) => d.amount)));
const barH = (v: number) => ((h - 24) * v) / max.value;
const label = (d: string, long = false) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });
</script>
