<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" :persistent="persistent" transition-show="fade" transition-hide="fade">
    <div class="modal" :style="width ? { width: `min(${width}px, calc(100vw - 24px))` } : undefined">
      <div class="modal-head">
        <h3>{{ title }}</h3>
        <button class="btn ghost s-sm" style="padding: 0 6px" @click="$emit('update:modelValue', false)" aria-label="Close"><q-icon name="close" /></button>
      </div>
      <div class="modal-body"><slot /></div>
      <div v-if="$slots.footer" class="modal-foot"><slot name="footer" /></div>
    </div>
  </q-dialog>
</template>
<script setup lang="ts">
defineProps<{ modelValue: boolean; title: string; width?: number; persistent?: boolean }>();
defineEmits(['update:modelValue']);
</script>
