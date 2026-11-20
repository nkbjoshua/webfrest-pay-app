<template>
  <span class="inline-flex items-center gap-1 max-w-full">
    <span class="mono truncate" :title="shown ? shown : undefined">{{ shown ?? masked }}</span>
    <button v-if="enabled" class="btn ghost s-sm" style="padding: 0 5px; height: 24px" :disabled="busy" :title="shown ? 'Hide' : 'Show the full number (this is logged)'" @click.stop="toggle"><q-icon :name="shown ? 'visibility_off' : 'visibility'" size="16px" /></button>
    <button v-if="shown" class="btn ghost s-sm" style="padding: 0 5px; height: 24px" :title="done ? 'Copied' : 'Copy'" @click.stop="doCopy"><q-icon :name="done ? 'check' : 'content_copy'" size="15px" /></button>
  </span>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { fail } from 'src/services/api'; import { copy } from 'src/utils/format';
// Shows a masked number with an eye. The full number is only fetched when asked for (the server logs it) and hides itself again after 20 seconds.
const props = defineProps<{ masked: string; load: () => Promise<string | null | undefined>; enabled?: boolean }>();
const shown = ref<string | null>(null); const busy = ref(false); const done = ref(false); let timer: any = null;
onBeforeUnmount(() => clearTimeout(timer));
async function toggle() {
  if (shown.value) { shown.value = null; clearTimeout(timer); return; }
  busy.value = true;
  try { const v = await props.load(); if (v) { shown.value = v; clearTimeout(timer); timer = setTimeout(() => (shown.value = null), 20000); } } catch (e) { fail(e); } finally { busy.value = false; }
}
async function doCopy() { if (shown.value && (await copy(shown.value))) { done.value = true; setTimeout(() => (done.value = false), 1500); } }
</script>
