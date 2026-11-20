<template>
  <Modal :model-value="confirmState.open" :title="confirmState.opts.title" :width="460" @update:model-value="(v: boolean) => !v && settleConfirm(false)">
    <div class="flex gap-3.5 items-start">
      <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" :style="confirmState.opts.danger ? 'background: rgb(var(--bad) / 0.12); color: rgb(var(--bad))' : 'background: rgb(var(--brand) / 0.12); color: rgb(var(--brand))'"><q-icon :name="confirmState.opts.icon || (confirmState.opts.danger ? 'warning_amber' : 'help_outline')" size="22px" /></div>
      <p v-if="confirmState.opts.message" class="text-[14px] leading-relaxed pt-1.5" style="white-space: pre-line">{{ confirmState.opts.message }}</p>
    </div>
    <div v-if="confirmState.prompt"><label class="field-label" for="confirm-input">{{ confirmState.opts.label }}</label><input id="confirm-input" ref="input" v-model="confirmState.value" class="field" :placeholder="confirmState.opts.placeholder" autocomplete="off" @keyup.enter="ok" /></div>
    <template #footer>
      <button class="btn" @click="settleConfirm(false)">{{ confirmState.opts.cancelText || 'Cancel' }}</button>
      <button class="btn" :class="confirmState.opts.danger ? 'danger-solid' : 'primary'" :disabled="confirmState.prompt && confirmState.opts.required && !confirmState.value.trim()" @click="ok">{{ confirmState.opts.confirmText || 'Confirm' }}</button>
    </template>
  </Modal>
</template>
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import Modal from './Modal.vue';
import { confirmState, settleConfirm } from 'src/utils/confirm';
const input = ref<HTMLInputElement | null>(null);
watch(() => confirmState.open, (o) => { if (o && confirmState.prompt) nextTick(() => setTimeout(() => input.value?.focus(), 80)); });
function ok() { if (confirmState.prompt && confirmState.opts.required && !confirmState.value.trim()) return; settleConfirm(true); }
</script>
