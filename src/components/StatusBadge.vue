<template><span class="badge" :class="tone">{{ label }}</span></template>
<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ status?: string | null; text?: string }>();
const MAP: Record<string, [string, string?]> = {
  success: ['ok', 'Successful'], paid: ['ok'], active: ['ok'], verified: ['ok'], approved: ['ok'], delivered: ['ok'], matched: ['ok'], healthy: ['ok'], processed: ['ok'], completed: ['ok'],
  pending: ['warn'], pendingapproval: ['warn', 'Awaiting approval'], pendingverification: ['warn', 'Awaiting verification'], processing: ['info'], sending: ['info'], uploaded: ['info'], degraded: ['warn'],
  failed: ['bad'], rejected: ['bad'], suspended: ['bad'], revoked: ['bad'], down: ['bad'], mismatched: ['bad'], missinginternal: ['bad', 'Not in our records'], missingprovider: ['bad', 'Not in bank file'], blocked: ['bad'],
  abandoned: ['plain'], paused: ['plain'], cancelled: ['plain'], disabled: ['plain'], expired: ['plain'], deleted: ['plain'], unknown: ['plain'], reversed: ['bad'],
  partiallyrefunded: ['warn', 'Partly refunded'], refunded: ['info'], flag: ['warn', 'Flagged'], block: ['bad'],
};
const key = computed(() => (props.status || '').toLowerCase().replace(/[\s_-]/g, ''));
const tone = computed(() => MAP[key.value]?.[0] || 'plain');
const label = computed(() => props.text || MAP[key.value]?.[1] || (props.status ? props.status.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase()) : '-'));
</script>
