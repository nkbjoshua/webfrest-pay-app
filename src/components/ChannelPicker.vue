<template>
  <div class="grid gap-2.5" role="radiogroup" aria-label="Payment method">
    <button v-for="o in items" :key="o.channel" type="button" role="radio" :aria-checked="modelValue === o.channel" class="opt" :class="{ on: modelValue === o.channel }" @click="$emit('update:modelValue', o.channel)">
      <span class="ico"><q-icon :name="o.icon" size="22px" /></span>
      <span class="flex-1 text-left"><span class="block font-semibold text-[14.5px]">{{ o.label }}</span><span class="block text-[12.5px] text-muted">{{ o.sub }}</span></span>
      <span v-if="o.total != null && o.fee" class="text-right" style="white-space: nowrap"><span class="block font-bold text-[14px]">{{ ghs(o.total) }}</span><span class="block text-[11.5px] text-muted">incl. {{ ghs(o.fee) }} fee</span></span>
      <q-icon :name="modelValue === o.channel ? 'radio_button_checked' : 'radio_button_unchecked'" size="22px" :class="modelValue === o.channel ? 'text-brand' : 'text-muted'" />
    </button>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { ghs } from 'src/utils/format';
const props = defineProps<{ modelValue: string; options?: { channel: string; fee: number; total: number }[] }>();
defineEmits(['update:modelValue']);
const META: Record<string, any> = {
  momo: { icon: 'smartphone', label: 'Mobile money', sub: 'Approve a prompt on your phone (MTN, Telecel, AirtelTigo)' },
  card: { icon: 'credit_card', label: 'Card or mobile money', sub: 'Visa, Mastercard or mobile money on the bank\'s secure page' },
  bank: { icon: 'account_balance', label: 'Bank transfer', sub: 'Pay from your bank app' },
};
const items = computed(() => {
  const list = props.options?.length ? props.options : (['momo', 'card', 'bank'] as const).map((c) => ({ channel: c, fee: 0, total: null as any }));
  return list.map((o: any) => ({ ...META[o.channel], channel: o.channel, fee: o.fee, total: props.options?.length ? o.total : null }));
});
</script>
<style scoped lang="scss">
.opt { display: flex; align-items: center; gap: 12px; padding: 13px 14px; border-radius: 14px; border: 1.5px solid rgb(var(--line)); background: rgb(var(--surface)); cursor: pointer; color: rgb(var(--ink)); font-family: Inter, sans-serif; transition: all 0.15s;
  &:hover { border-color: rgb(var(--brand) / 0.5); }
  &.on { border-color: rgb(var(--brand)); background: rgb(var(--brand) / 0.06); box-shadow: 0 0 0 3px rgb(var(--brand) / 0.12); }
  .ico { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgb(var(--brand) / 0.1); color: rgb(var(--brand)); }
}
</style>
