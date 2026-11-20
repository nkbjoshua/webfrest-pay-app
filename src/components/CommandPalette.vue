<template>
  <q-dialog :model-value="modelValue" position="top" transition-show="fade" transition-hide="fade" @update:model-value="$emit('update:modelValue', $event)" @show="onShow">
    <div class="palette">
      <div class="palette-input"><q-icon name="search" size="22px" class="text-muted" /><input ref="input" v-model="q" :placeholder="ops ? 'Search transactions, merchants, payouts, accounts…' : 'Search payments, payouts, schools…'" aria-label="Search" autocomplete="off" @keydown.down.prevent="move(1)" @keydown.up.prevent="move(-1)" @keydown.enter.prevent="go(items[active])" /><kbd>Esc</kbd></div>
      <div class="palette-body">
        <div v-if="busy" class="px-5 py-6 text-muted text-[13.5px]">Searching…</div>
        <template v-else-if="q.trim().length >= 2">
          <div v-if="!items.length" class="px-5 py-8 text-center text-muted text-[13.5px]">Nothing matches “{{ q }}”. Try a reference, a name, an email or the last 4 digits of an account.</div>
          <template v-for="(it, i) in items" :key="it.type + it.title + i">
            <div v-if="i === 0 || items[i - 1].type !== it.type" class="palette-group">{{ it.type }}</div>
            <button class="palette-item" :class="{ on: i === active }" @mouseenter="active = i" @click="go(it)"><span class="mono title">{{ it.title }}</span><span class="sub">{{ it.subtitle }}</span><q-icon name="subdirectory_arrow_left" size="16px" class="enter" /></button>
          </template>
        </template>
        <template v-else>
          <div class="palette-group">Go to</div>
          <button v-for="(it, i) in quick" :key="it.to" class="palette-item" :class="{ on: i === active }" @mouseenter="active = i" @click="go(it)"><q-icon :name="it.icon" size="20px" class="text-muted" /><span class="title">{{ it.label }}</span><q-icon name="subdirectory_arrow_left" size="16px" class="enter" /></button>
        </template>
      </div>
    </div>
  </q-dialog>
</template>
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { get } from 'src/services/api';
const props = defineProps<{ modelValue: boolean; ops: boolean; links: { to: string; icon: string; label: string }[] }>();
const emit = defineEmits(['update:modelValue']);
const router = useRouter();
const q = ref(''); const results = ref<any[]>([]); const busy = ref(false); const active = ref(0); const input = ref<HTMLInputElement | null>(null);
const quick = computed(() => props.links.map((l) => ({ to: l.to, icon: l.icon, label: l.label, title: l.label, subtitle: '', type: 'Go to' })));
const items = computed(() => (q.value.trim().length >= 2 ? results.value : quick.value));
let t: any; let seq = 0;
watch(q, (v) => {
  active.value = 0; clearTimeout(t);
  if (v.trim().length < 2) { results.value = []; busy.value = false; return; }
  busy.value = true;
  t = setTimeout(async () => {
    const my = ++seq;
    try { const r = (await get(props.ops ? '/ops/search' : '/dashboard/search', { q: v.trim() })).data; if (my === seq) results.value = r; } catch { if (my === seq) results.value = []; } finally { if (my === seq) busy.value = false; }
  }, 220);
});
function onShow() { q.value = ''; results.value = []; active.value = 0; nextTick(() => setTimeout(() => input.value?.focus(), 30)); }
function move(d: number) { const n = items.value.length; if (n) active.value = (active.value + d + n) % n; }
function go(it: any) { if (!it) return; emit('update:modelValue', false); router.push(it.to); }
</script>
<style scoped>
.palette { width: min(640px, calc(100vw - 24px)); margin-top: 11vh; background: rgb(var(--surface)); border: 1px solid rgb(var(--line)); border-radius: 18px; box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.5); overflow: hidden; }
.palette-input { display: flex; align-items: center; gap: 12px; padding: 0 18px; height: 60px; border-bottom: 1px solid rgb(var(--line)); }
.palette-input input { flex: 1; background: none; border: 0; outline: 0; font: 500 16px Inter, sans-serif; color: rgb(var(--ink)); }
.palette-input kbd { font: 600 11px Inter, sans-serif; background: rgb(var(--sunken)); border-radius: 6px; padding: 3px 7px; color: rgb(var(--muted)); }
.palette-body { max-height: min(60vh, 460px); overflow-y: auto; padding: 6px 8px 10px; }
.palette-group { font-size: 11px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: rgb(var(--muted)); padding: 10px 12px 4px; }
.palette-item { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 0; border-radius: 10px; background: none; color: rgb(var(--ink)); cursor: pointer; text-align: left; font: 500 14px Inter, sans-serif; }
.palette-item .title { font-weight: 600; white-space: nowrap; } .palette-item .sub { color: rgb(var(--muted)); font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.palette-item .enter { margin-left: auto; opacity: 0; } .palette-item.on { background: rgb(var(--sunken)); } .palette-item.on .enter { opacity: 0.6; }
</style>
