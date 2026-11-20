<template>
  <div>
    <PageHeader title="Payouts" subtitle="Money leaving Webfrest Pay to merchants' bank accounts. Schools on automatic settlement get one bulk payout a day for everything that cleared.">
      <button v-if="auth.opsDecider" class="btn" :disabled="busy" @click="approveAll"><q-icon name="done_all" />Approve all waiting batches</button>
      <button v-if="auth.opsAdmin" class="btn primary" :disabled="busy" @click="settleNow"><q-icon name="bolt" />Settle now</button>
    </PageHeader>
    <DataTable :columns="cols" :rows="rows" :loading="loading" :total="total" :page="page" :per-page="perPage" noun="payouts" clickable empty-title="No payouts" empty-text="Nothing matches this filter." empty-icon="payments" @update:page="page = $event" @row="openDetails">
      <template #toolbar>
        <div class="filters-row">
          <input v-model="filters.q" class="field s-sm" style="max-width: 250px" placeholder="Payout code, bank reference or merchant…" aria-label="Search" />
          <select v-model="filters.queue" class="field s-sm" style="max-width: 200px" aria-label="Queue"><option value="ops">Needs my approval</option><option value="">All payouts</option></select>
          <select v-model="filters.status" class="field s-sm" style="max-width: 190px" aria-label="Status"><option value="">Any status</option><option v-for="s in ['PendingApproval', 'Approved', 'Processing', 'Paid', 'Failed', 'Rejected', 'Cancelled']" :key="s" :value="s">{{ s.replace(/([A-Z])/g, ' $1').trim() }}</option></select>
          <select v-model="filters.mode" class="field s-sm" style="max-width: 130px" aria-label="Mode"><option value="">Test + live</option><option>live</option><option>test</option></select>
        </div>
      </template>
      <template #cell-payout="{ row }"><div class="mono font-semibold">{{ row.payout.id }}</div><template v-if="row.payout.kind !== 'Request'"><span class="chip mt-1">{{ row.payout.kind === 'Instant' ? 'Instant' : 'Daily batch' }}</span> <span class="text-[12px] text-muted">{{ row.payout.payments }} payment{{ row.payout.payments === 1 ? '' : 's' }}</span></template><div v-else class="text-[12px] text-muted mt-1">Requested</div></template>
      <template #cell-merchant="{ row }"><div class="font-semibold">{{ row.payout.merchant }}</div><div class="mono text-muted" style="font-size: 11.5px">{{ row.payout.merchantCode }}</div></template>
      <template #cell-destination="{ row }">
        <div>{{ row.payout.bank || '-' }}</div>
        <Reveal :masked="`····${row.payout.accountLast4}`" :enabled="auth.opsDecider" :load="() => revealAccount(row.bankAccountId)" />
        <div class="text-[12.5px] text-muted">{{ row.payout.accountName }}</div>
      </template>
      <template #cell-mode="{ row }"><span class="chip" :class="row.payout.mode">{{ row.payout.mode }}</span></template>
      <template #cell-amount="{ row }"><b class="nowrap">{{ ghs(row.payout.amount) }}</b><div v-if="row.payout.fee" class="text-[12px] text-muted">+ {{ ghs(row.payout.fee) }} fee</div></template>
      <template #cell-status="{ row }"><StatusBadge :status="row.payout.status" /><div v-if="row.payout.failureReason" class="text-[12px] text-muted mt-1" style="max-width: 240px">{{ row.payout.failureReason }}</div><div class="text-[12px] text-muted mt-1" v-if="row.approvals.length">{{ row.approvals.map((a: any) => `${a.stage} ${a.decision.toLowerCase()}`).join(' · ') }}</div></template>
      <template #cell-createdAt="{ row }">{{ dt(row.payout.createdAt) }}<div class="text-[12px] text-muted">via {{ row.payout.via }}</div><div v-if="row.payout.paidAt" class="text-[12px] text-muted">paid {{ dt(row.payout.paidAt) }}</div></template>
      <template #cell-actions="{ row }">
        <div class="flex gap-1.5 justify-end flex-wrap">
          <button class="btn s-sm" @click.stop="openDetails(row)"><q-icon name="open_in_new" />Details</button>
          <button v-if="row.payout.kind !== 'Request'" class="btn s-sm" @click.stop="statement = row.payout.id">Statement</button>
        </div>
        <div v-if="row.payout.status === 'PendingApproval' && auth.opsDecider && ['Ops', 'Both'].includes(row.payout.approvalMode) && !row.approvals.some((a: any) => a.stage === 'Ops')" class="flex gap-1.5 justify-end mt-1.5">
          <button class="btn s-sm ok" :disabled="row.createdByMe" :title="row.createdByMe ? 'You created this payout' : ''" @click.stop="open(row, true)">Approve</button><button class="btn s-sm danger" @click.stop="open(row, false)">Reject</button>
        </div>
      </template>
    </DataTable>
    <StatementModal :model-value="!!statement" :code="statement" base="/ops" @update:model-value="statement = null" />

    <PayoutDetailsModal v-model="det.open" :detail="det.d" :loading="det.loading" :reveal-account="revealAccount" :can-reveal="auth.opsDecider" internal base="/ops" @statement="(c: string) => (statement = c)" />

    <Modal v-model="dlg.open" :title="dlg.approve ? 'Approve payout' : 'Reject payout'">
      <dl class="kv"><dt>Merchant</dt><dd>{{ dlg.row?.payout.merchant }}</dd><dt>Amount</dt><dd><b>{{ ghs(dlg.row?.payout.amount) }}</b></dd><dt>Destination</dt><dd>{{ dlg.row?.payout.bank }} ····{{ dlg.row?.payout.accountLast4 }} · {{ dlg.row?.payout.accountName }}</dd><dt>Mode</dt><dd>{{ dlg.row?.payout.mode }}</dd></dl>
      <div v-if="dlg.row?.payout.mode === 'live' && dlg.approve" class="p-3 rounded-xl text-[13.5px]" style="background: rgb(var(--warn) / 0.12)">Approving sends real money. Check the destination account against the merchant's verified details.</div>
      <div><label class="field-label">Note {{ dlg.approve ? '(optional)' : '(required)' }}</label><input v-model.trim="dlg.note" class="field" /></div>
      <template #footer><button class="btn" @click="dlg.open = false">Back</button><button class="btn" :class="dlg.approve ? 'primary' : 'danger'" :disabled="busy || (!dlg.approve && !dlg.note)" @click="submit">{{ dlg.approve ? 'Approve and send' : 'Reject' }}</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { confirmDialog, promptDialog } from 'src/utils/confirm';
import { reactive, ref } from 'vue'; import { useRoute } from 'vue-router'; import { Notify } from 'quasar';
import StatementModal from 'src/components/StatementModal.vue'; import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue'; import Reveal from 'src/components/Reveal.vue'; import PayoutDetailsModal from 'src/components/PayoutDetailsModal.vue';
import { useList } from 'src/composables/useList'; import { get, post, fail, ok } from 'src/services/api'; import { ghs, dt } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth();
const cols = [{ key: 'payout', label: 'Payout' }, { key: 'merchant', label: 'Merchant' }, { key: 'destination', label: 'Destination account' }, { key: 'mode', label: 'Mode' }, { key: 'amount', label: 'Amount', num: true }, { key: 'status', label: 'Status' }, { key: 'createdAt', label: 'Requested' }, { key: 'actions', label: '' }];
const route = useRoute(); const found = (route.query.find as string) || '';
const { filters, rows, total, page, perPage, loading, reload } = useList('/ops/payouts', { queue: found ? '' : 'ops', status: '', mode: '', q: found }, { modeAware: false });
const dlg = reactive<any>({ open: false, approve: true, row: null, note: '' }); const busy = ref(false); const statement = ref<string | null>(null);
const det = reactive<any>({ open: false, loading: false, d: null });
const revealAccount = async (bankId: string) => (await get(`/ops/bank-accounts/${bankId}/reveal`)).data.accountNumber as string;
async function openDetails(row: any) {
  Object.assign(det, { open: true, loading: true, d: null });
  try { det.d = (await get(`/ops/payouts/${row.payout.id}`)).data; } catch (e) { fail(e); det.open = false; } finally { det.loading = false; }
}
async function settleNow() {
  if (!(await confirmDialog({ title: 'Settle now?', message: "This builds today's payouts for every school on daily settlement, from the payments that have cleared. Nothing is sent to the bank until the batches are approved.", confirmText: 'Settle now', icon: 'bolt' }))) return;
  busy.value = true;
  try { const r = await post('/ops/settlements/run', {}); ok(r.message); if (r.data?.skipped?.length) Notify.create({ type: 'warning', message: r.data.skipped.join(' · '), timeout: 9000, multiLine: true }); reload(); } catch (e) { fail(e); } finally { busy.value = false; }
}
async function approveAll() {
  if (!(await confirmDialog({ title: 'Approve all waiting batches?', message: 'Every daily and instant batch waiting for approval will be approved and sent to the bank. Batches you created yourself are skipped. In live mode this moves real money.', confirmText: 'Approve and send', danger: true }))) return;
  busy.value = true;
  try { const r = await post('/ops/payouts/approve-batch', {}); ok(r.message); reload(); } catch (e) { fail(e); } finally { busy.value = false; }
}
function open(row: any, approve: boolean) { Object.assign(dlg, { open: true, approve, row, note: '' }); }
async function submit() { busy.value = true; try { const r = await post(`/ops/payouts/${dlg.row.payout.id}/${dlg.approve ? 'approve' : 'reject'}`, { note: dlg.note || undefined }); dlg.open = false; ok(r.message); reload(); } catch (e) { fail(e); } finally { busy.value = false; } }
</script>
