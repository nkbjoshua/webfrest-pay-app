<template>
  <span class="inline-flex items-center gap-1.5 max-w-full">
    <span class="mono truncate min-w-0" :title="text">{{ text }}</span>
    <button class="btn ghost s-sm" style="padding: 0 5px; height: 24px" :title="done ? 'Copied' : 'Copy'" @click.stop="doCopy"><q-icon :name="done ? 'check' : 'content_copy'" size="15px" /></button>
  </span>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { copy } from 'src/utils/format';
const props = defineProps<{ text: string }>();
const done = ref(false);
async function doCopy() { if (await copy(props.text)) { done.value = true; setTimeout(() => (done.value = false), 1500); } }
</script>
