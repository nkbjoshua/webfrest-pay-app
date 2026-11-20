<template>
  <div>
    <PageHeader title="Payment links" subtitle="Share a link or QR code - payers choose how to pay on a mobile-friendly page.">
      <button class="btn primary" @click="open = true"><q-icon name="add" />New link</button>
    </PageHeader>
    <DataTable :columns="cols" :rows="rows" :loading="loading" :total="total" :page="page" :per-page="perPage" empty-title="No payment links yet" empty-text="Create one to start collecting - no code required." empty-icon="link" @update:page="page = $event">
      <template #empty><button class="btn primary" @click="open = true"><q-icon name="add" />Create your first link</button></template>
      <template #cell-title="{ row }"><div class="font-semibold">{{ row.title }}</div><div class="text-[12.5px] text-muted"><CopyText :text="row.url" /></div></template>
      <template #cell-amount="{ row }">{{ row.amount ? ghs(row.amount) : 'Payer enters' }}</template>
      <template #cell-uses="{ row }">{{ row.usedCount }}{{ row.maxUses ? ` / ${row.maxUses}` : '' }}</template>
      <template #cell-subaccount="{ row }"><span class="mono">{{ row.subaccount || '-' }}</span></template>
      <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
      <template #cell-actions="{ row }">
        <div class="flex gap-1.5 justify-end">
          <a :href="row.url" target="_blank" rel="noopener" class="btn s-sm"><q-icon name="open_in_new" />Open</a>
          <button v-if="row.status !== 'Completed'" class="btn s-sm" @click="toggle(row)">{{ row.status === 'Active' ? 'Pause' : 'Resume' }}</button>
        </div>
      </template>
    </DataTable>

    <Modal v-model="open" title="New payment link">
      <div><label class="field-label">Title</label><input v-model.trim="f.title" class="field" placeholder="e.g. Term 2 school fees" /></div>
      <div><label class="field-label">Description (optional)</label><textarea v-model.trim="f.description" class="field" placeholder="What is this payment for?"></textarea></div>
      <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <div><label class="field-label">Amount (GHS)</label><input v-model="f.amount" class="field" inputmode="decimal" placeholder="Blank = payer enters" /></div>
        <div><label class="field-label">Type</label><select v-model="f.type" class="field"><option value="Reusable">Reusable</option><option value="OneTime">One-time</option></select></div>
      </div>
      <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <div><label class="field-label">Max uses (optional)</label><input v-model.number="f.maxUses" class="field" type="number" min="1" /></div>
        <div><label class="field-label">Expires (optional)</label><input v-model="f.expiresAt" class="field" type="date" /></div>
      </div>
      <div v-if="auth.merchant?.type === 'Platform'"><label class="field-label">Pay into subaccount (optional)</label><input v-model.trim="f.subaccount" class="field" placeholder="mer_xxxxxxxx or your external reference" /></div>
      <div><label class="field-label">After payment, send them to (optional)</label><input v-model.trim="f.redirectUrl" class="field" placeholder="https://" /></div>
      <template #footer><button class="btn" @click="open = false">Cancel</button><button class="btn primary" :disabled="busy || !f.title" @click="create">{{ busy ? 'Creating…' : 'Create link' }}</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { confirmDialog, promptDialog } from 'src/utils/confirm';
import { reactive, ref } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue'; import CopyText from 'src/components/CopyText.vue';
import { useList } from 'src/composables/useList'; import { post, patch, fail, ok } from 'src/services/api'; import { ghs, toMinor } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth();
const cols = [{ key: 'title', label: 'Link' }, { key: 'amount', label: 'Amount' }, { key: 'uses', label: 'Used' }, { key: 'subaccount', label: 'Subaccount' }, { key: 'status', label: 'Status' }, { key: 'actions', label: '' }];
const { rows, total, page, perPage, loading, reload } = useList('/dashboard/links');
const open = ref(false); const busy = ref(false);
const blank = () => ({ title: '', description: '', amount: '', type: 'Reusable', maxUses: null as number | null, expiresAt: '', subaccount: '', redirectUrl: '' });
const f = reactive(blank());
async function create() {
  busy.value = true;
  try {
    await post('/dashboard/links', { title: f.title, description: f.description || undefined, amount: f.amount ? toMinor(f.amount) : undefined, type: f.type, maxUses: f.maxUses || undefined, expiresAt: f.expiresAt ? new Date(f.expiresAt + 'T23:59:59Z').toISOString() : undefined, subaccount: f.subaccount || undefined, redirectUrl: f.redirectUrl || undefined });
    open.value = false; Object.assign(f, blank()); ok('Payment link created'); reload();
  } catch (e) { fail(e); } finally { busy.value = false; }
}
async function toggle(r: any) { const pausing = r.status === 'Active'; if (!(await confirmDialog({ title: pausing ? 'Pause this payment link?' : 'Reactivate this payment link?', message: pausing ? 'Payers who open it will not be able to pay until you reactivate it.' : 'Payers will be able to pay through it again.', confirmText: pausing ? 'Pause' : 'Reactivate', danger: pausing }))) return; try { await patch(`/dashboard/links/${r.id}`, { status: r.status === 'Active' ? 'Paused' : 'Active' }); reload(); } catch (e) { fail(e); } }
</script>
