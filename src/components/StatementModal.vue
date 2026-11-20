<template>
  <Modal :model-value="modelValue" title="Settlement statement" :width="880" @update:model-value="$emit('update:modelValue', $event)">
    <div v-if="loading" class="py-10 text-center text-muted">Loading…</div>
    <template v-else-if="s">
      <dl class="kv">
        <dt>Payout</dt><dd>{{ s.payout.id }} · {{ s.payout.merchant }}</dd>
        <dt>{{ s.kind !== 'Request' ? 'Settlement day' : 'Requested' }}</dt><dd>{{ s.kind !== 'Request' ? day(s.batchDate) : dt(s.payout.createdAt) }}</dd>
        <dt>Status</dt><dd><StatusBadge :status="s.payout.status" /></dd>
      </dl>
      <div v-if="s.lines.length === 0" class="p-3 rounded-xl text-[13.5px] text-muted" style="background: rgb(var(--border) / 0.4)">This payout was requested from the balance, so it isn't tied to particular payments.</div>
      <div v-else class="overflow-x-auto" style="max-height: 340px">
        <table class="tbl">
          <thead><tr><th>Paid</th><th>Reference</th><th>Payer</th><th>Channel</th><th class="num">Charged</th><th class="num">Fees</th><th class="num">Refunded</th><th class="num">Payable</th></tr></thead>
          <tbody>
            <tr v-for="l in s.lines" :key="l.code">
              <td>{{ dt(l.paidAt) }}</td><td class="font-mono text-[12.5px]">{{ l.reference }}</td><td>{{ l.customer || '—' }}<div class="text-[12px] text-muted">{{ l.description }}</div></td><td>{{ l.channel || '—' }}</td>
              <td class="num">{{ ghs(l.charged) }}</td><td class="num">{{ ghs(l.fee) }}</td><td class="num">{{ l.refunded ? ghs(l.refunded) : '—' }}</td><td class="num"><b>{{ ghs(l.payable) }}</b></td>
            </tr>
          </tbody>
        </table>
      </div>
      <dl class="kv mt-3">
        <dt>Payments</dt><dd>{{ s.payments }}</dd>
        <dt>Payable to the school</dt><dd>{{ ghs(s.totals.payable) }}</dd>
        <template v-if="s.totals.adjustment"><dt>Adjustment</dt><dd>{{ ghs(s.totals.adjustment) }} <span class="text-muted text-[12.5px]">(earlier refunds taken off)</span></dd></template>
        <dt>Paid to bank</dt><dd><b>{{ ghs(s.totals.paid) }}</b></dd>
        <template v-if="s.totals.payoutFee"><dt>Transfer fee</dt><dd>{{ ghs(s.totals.payoutFee) }} <span class="text-muted text-[12.5px]">(charged to the school)</span></dd></template>
      </dl>
    </template>
    <template #footer>
      <button class="btn" @click="$emit('update:modelValue', false)">Close</button>
      <button class="btn primary" :disabled="!s" @click="csv"><q-icon name="download" />Download CSV</button>
    </template>
  </Modal>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
import Modal from 'src/components/Modal.vue'; import StatusBadge from 'src/components/StatusBadge.vue';
import { get, download, fail } from 'src/services/api'; import { ghs, dt } from 'src/utils/format';
const props = defineProps<{ modelValue: boolean; code: string | null; base: '/ops' | '/dashboard' }>();
defineEmits(['update:modelValue']);
const s = ref<any>(null); const loading = ref(false);
const day = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—');
watch(() => [props.modelValue, props.code], async () => {
  if (!props.modelValue || !props.code) return;
  s.value = null; loading.value = true;
  try { s.value = (await get(`${props.base}/payouts/${props.code}/statement`)).data; } catch (e) { fail(e); } finally { loading.value = false; }
});
const csv = () => download(`${props.base}/payouts/${props.code}/statement`, { format: 'csv' }, `statement-${props.code}.csv`).catch(fail);
</script>
