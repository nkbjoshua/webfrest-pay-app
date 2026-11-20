<template>
  <div>
    <PageHeader title="Refunds" subtitle="Money returned to payers.">
      <button v-if="auth.canManage && auth.merchant?.type !== 'Subaccount'" class="btn primary" @click="open = true"><q-icon name="undo" />New refund</button>
    </PageHeader>
    <DataTable :columns="cols" :rows="rows" :loading="loading" :total="total" :page="page" :per-page="perPage" empty-title="No refunds" empty-text="Refunds you issue will be listed here." empty-icon="undo" @update:page="page = $event">
      <template #cell-id="{ row }"><span class="mono">{{ row.id }}</span><div class="text-[12px] text-muted">via {{ row.via }}</div></template>
      <template #cell-reason="{ row }"><span>{{ row.reason || '-' }}</span></template>
      <template #cell-processedAt="{ row }">{{ row.processedAt ? dt(row.processedAt) : '-' }}</template>
      <template #cell-transaction="{ row }"><router-link :to="`/dashboard/transactions/${row.transaction}`" class="font-semibold">{{ row.reference }}</router-link></template>
      <template #cell-amount="{ row }"><b>{{ ghs(row.amount) }}</b></template>
      <template #cell-status="{ row }"><StatusBadge :status="row.status" /><div v-if="row.failureReason" class="text-[12px] text-muted mt-1">{{ row.failureReason }}</div></template>
      <template #cell-createdAt="{ row }">{{ dt(row.createdAt) }}</template>
    </DataTable>
    <Modal v-model="open" title="New refund">
      <div><label class="field-label">Transaction ID or reference</label><input v-model.trim="f.transaction" class="field" placeholder="WEBFCL… or your reference" /></div>
      <div><label class="field-label">Amount (GHS) - blank for the full amount</label><input v-model="f.amount" class="field" inputmode="decimal" /></div>
      <div><label class="field-label">Reason</label><input v-model.trim="f.reason" class="field" /></div>
      <template #footer><button class="btn" @click="open = false">Cancel</button><button class="btn danger" :disabled="busy || !f.transaction" @click="create">{{ busy ? 'Submitting…' : 'Refund' }}</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { reactive, ref } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue';
import { useList } from 'src/composables/useList'; import { post, fail, ok } from 'src/services/api'; import { ghs, dt, toMinor } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth();
const cols = [{ key: 'id', label: 'Refund' }, { key: 'transaction', label: 'Payment' }, { key: 'amount', label: 'Amount', num: true }, { key: 'reason', label: 'Reason' }, { key: 'status', label: 'Status' }, { key: 'createdAt', label: 'Requested' }, { key: 'processedAt', label: 'Completed' }];
const { rows, total, page, perPage, loading, reload } = useList('/dashboard/refunds');
const open = ref(false); const busy = ref(false); const f = reactive({ transaction: '', amount: '', reason: '' });
async function create() {
  busy.value = true;
  try { await post('/dashboard/refunds', { transaction: f.transaction, amount: f.amount ? toMinor(f.amount) : undefined, reason: f.reason || undefined }); open.value = false; Object.assign(f, { transaction: '', amount: '', reason: '' }); ok('Refund submitted'); reload(); }
  catch (e) { fail(e); } finally { busy.value = false; }
}
</script>
