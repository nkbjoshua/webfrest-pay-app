<template>
  <div>
    <PageHeader title="Payouts" subtitle="Move your available balance to your bank account.">
      <button v-if="auth.canSeeMoney" class="btn primary" @click="open = true"><q-icon name="north_east" />Request payout</button>
    </PageHeader>
    <div class="grid-stats mb-6" v-if="bal">
      <div class="balance-card"><div class="text-[13px] opacity-80">Available</div><div class="text-[28px] font-extrabold mt-1">{{ ghs(bal.available) }}</div></div>
      <div class="balance-card alt"><div class="text-[13px] opacity-80">Pending clearance</div><div class="text-[28px] font-extrabold mt-1">{{ ghs(bal.pending) }}</div></div>
    </div>
    <div class="mb-4 card card-pad text-[13.5px] flex gap-3 items-start"><q-icon name="verified_user" class="text-brand" size="22px" /><span>Payouts are approved before money leaves. {{ approvalText }} The person who requests a payout can't approve it.</span></div>
    <DataTable :columns="cols" :rows="rows" :loading="loading" :total="total" :page="page" :per-page="perPage" clickable empty-title="No payouts yet" empty-text="Request one when you have an available balance." empty-icon="account_balance" @update:page="page = $event" @row="openDetails">
      <template #toolbar>
        <input v-model="filters.q" class="field s-sm" style="max-width: 240px" placeholder="Payout code, bank reference or school…" aria-label="Search" />
        <input v-model="filters.account" class="field s-sm" style="max-width: 220px" inputmode="numeric" placeholder="Account number (or last 4)" aria-label="Account number" />
        <select v-model="filters.kind" class="field s-sm" style="max-width: 160px" aria-label="Type"><option value="">All types</option><option value="Request">Requested</option><option value="Batch">Daily batch</option><option value="Instant">Instant</option></select>
        <select v-model="filters.status" class="field s-sm" style="max-width: 190px" aria-label="Status"><option value="">All statuses</option><option v-for="s in ['PendingApproval', 'Approved', 'Processing', 'Paid', 'Failed', 'Rejected', 'Cancelled']" :key="s" :value="s">{{ s.replace(/([A-Z])/g, ' $1').trim() }}</option></select>
        <input v-model="filters.from" type="date" class="field s-sm" style="max-width: 150px" aria-label="From" title="From" /><input v-model="filters.to" type="date" class="field s-sm" style="max-width: 150px" aria-label="To" title="To" />
      </template>
      <template #cell-payout="{ row }"><div class="mono font-semibold">{{ row.payout.id }}</div><div class="text-[12px] text-muted mt-0.5">{{ row.payout.kind === 'Request' ? 'Requested' : row.payout.kind === 'Instant' ? 'Instant settlement' : 'Daily settlement' }}</div></template>
      <template #cell-to="{ row }"><div class="font-semibold">{{ row.payout.merchant }}</div><div class="text-[12.5px]">{{ row.payout.bank }}</div>
        <Reveal :masked="`····${row.payout.accountLast4}`" :enabled="auth.canManage" :load="() => revealAccount(row.bankAccountId)" /><div class="text-[12px] text-muted">{{ row.payout.accountName }}</div></template>
      <template #cell-amount="{ row }"><b class="nowrap">{{ ghs(row.payout.amount) }}</b><div v-if="row.payout.kind !== 'Request'" class="text-[12px] text-muted">{{ row.payout.kind === 'Instant' ? 'Instant' : 'Daily' }} settlement · {{ row.payout.payments }} payment{{ row.payout.payments === 1 ? '' : 's' }}<span v-if="row.payout.fee"> · fee {{ ghs(row.payout.fee) }}</span></div></template>
      <template #cell-status="{ row }">
        <StatusBadge :status="row.payout.status" />
        <div v-if="row.payout.failureReason" class="text-[12px] text-muted mt-1" style="max-width: 220px">{{ row.payout.failureReason }}</div>
        <div v-if="row.payout.status === 'PendingApproval'" class="text-[12px] text-muted mt-1">{{ row.approvals.map((a: any) => a.stage + ' ✓').join(' · ') || 'No approvals yet' }}</div>
      </template>
      <template #cell-createdAt="{ row }">{{ dt(row.payout.createdAt) }}<div v-if="row.payout.paidAt" class="text-[12px] text-muted">paid {{ dt(row.payout.paidAt) }}</div><div v-if="row.providerReference" class="mono text-muted truncate" style="font-size: 11px; max-width: 150px" :title="row.providerReference">ref {{ row.providerReference }}</div></template>
      <template #cell-actions="{ row }">
        <div class="flex gap-1.5 justify-end flex-wrap"><button class="btn s-sm" @click.stop="openDetails(row)"><q-icon name="open_in_new" />Details</button><button v-if="row.payout.kind !== 'Request'" class="btn s-sm" @click.stop="statement = row.payout.id">Statement</button></div>
        <div v-if="row.payout.status === 'PendingApproval'" class="flex gap-1.5 justify-end mt-1.5">
          <template v-if="needsMine(row)"><button class="btn s-sm ok" :disabled="row.payout.createdByUserId === auth.user.id" :title="row.payout.createdByUserId === auth.user.id ? 'You requested this payout' : ''" @click.stop="decide(row, true)">Approve</button><button class="btn s-sm danger" @click.stop="decide(row, false)">Reject</button></template>
          <button class="btn s-sm" @click.stop="cancel(row)">Cancel</button>
        </div>
      </template>
    </DataTable>

    <StatementModal :model-value="!!statement" :code="statement" base="/dashboard" @update:model-value="statement = null" />
    <PayoutDetailsModal v-model="det.open" :detail="det.d" :loading="det.loading" :reveal-account="revealAccount" :can-reveal="auth.canManage" base="/dashboard" @statement="(c: string) => (statement = c)" />
    <Modal v-model="open" title="Request a payout">
      <div v-if="auth.merchant?.type === 'Platform'"><label class="field-label">From</label>
        <select v-model="f.subaccount" class="field"><option value="">My own balance ({{ ghs(bal?.available) }})</option><option v-for="s in subs" :key="s.merchant.code" :value="s.merchant.code">{{ s.merchant.name }} ({{ ghs(s.available) }})</option></select></div>
      <div><label class="field-label">Amount (GHS)</label><input v-model="f.amount" class="field" inputmode="decimal" placeholder="0.00" /></div>
      <div><label class="field-label">Narration (optional)</label><input v-model.trim="f.narration" class="field" placeholder="Shown on the bank statement" /></div>
      <template #footer><button class="btn" @click="open = false">Cancel</button><button class="btn primary" :disabled="busy || !f.amount" @click="create">{{ busy ? 'Requesting…' : 'Request payout' }}</button></template>
    </Modal>
    <Modal v-model="note.open" :title="note.approve ? 'Approve payout' : 'Reject payout'">
      <p class="text-muted text-[14px]">{{ ghs(note.row?.payout.amount) }} to {{ note.row?.payout.merchant }}.</p>
      <div><label class="field-label">Note {{ note.approve ? '(optional)' : '' }}</label><input v-model.trim="note.text" class="field" /></div>
      <template #footer><button class="btn" @click="note.open = false">Back</button><button class="btn" :class="note.approve ? 'primary' : 'danger'" :disabled="busy || (!note.approve && !note.text)" @click="submitDecision">{{ note.approve ? 'Approve' : 'Reject' }}</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { confirmDialog, promptDialog } from 'src/utils/confirm';
import { computed, onMounted, reactive, ref, watch } from 'vue'; import { useRoute } from 'vue-router';
import StatementModal from 'src/components/StatementModal.vue'; import Reveal from 'src/components/Reveal.vue'; import PayoutDetailsModal from 'src/components/PayoutDetailsModal.vue'; import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue';
import { useList } from 'src/composables/useList'; import { get, post, fail, ok } from 'src/services/api'; import { ghs, dt, toMinor } from 'src/utils/format'; import { useAuth } from 'src/stores/auth'; import { useMode } from 'src/stores/mode';
const auth = useAuth(); const mode = useMode();
const cols = [{ key: 'payout', label: 'Payout' }, { key: 'to', label: 'Paid to' }, { key: 'amount', label: 'Amount', num: true }, { key: 'status', label: 'Status' }, { key: 'createdAt', label: 'Requested' }, { key: 'actions', label: '' }];
const found = (useRoute().query.find as string) || '';
const { filters, rows, total, page, perPage, loading, reload } = useList('/dashboard/payouts', { status: '', q: found, account: '', kind: '', from: '', to: '' });
const det = reactive<any>({ open: false, loading: false, d: null });
const revealAccount = async (bankId: string) => (await get(`/dashboard/bank-account/${bankId}/reveal`)).data.accountNumber as string;
async function openDetails(row: any) {
  Object.assign(det, { open: true, loading: true, d: null });
  try { det.d = (await get(`/dashboard/payouts/${row.payout.id}`)).data; } catch (e) { fail(e); det.open = false; } finally { det.loading = false; }
}
const statement = ref<string | null>(null); const bal = ref<any>(null); const subs = ref<any[]>([]);
const open = ref(false); const busy = ref(false); const f = reactive({ amount: '', subaccount: '', narration: '' });
const note = reactive<any>({ open: false, approve: true, row: null, text: '' });
const approvalText = computed(() => 'Webfrest Operations reviews each payout.');
const needsMine = (row: any) => row.payout.approvalMode === 'Both' && !row.approvals.some((a: any) => a.stage === 'Merchant' && a.decision === 'Approved') && auth.canManage;
async function loadBal() {
  try { const o = (await get('/dashboard/overview')).data; bal.value = o.balance; } catch { /* page shows list errors */ }
  if (auth.merchant?.type === 'Platform') try { subs.value = (await get('/dashboard/subaccounts', { perPage: 100 })).data; } catch { /* ignore */ }
}
async function create() {
  busy.value = true;
  try { await post('/dashboard/payouts', { amount: toMinor(f.amount), subaccount: f.subaccount || undefined, narration: f.narration || undefined }); open.value = false; Object.assign(f, { amount: '', subaccount: '', narration: '' }); ok('Payout requested'); reload(); loadBal(); }
  catch (e) { fail(e); } finally { busy.value = false; }
}
function decide(row: any, approve: boolean) { Object.assign(note, { open: true, approve, row, text: '' }); }
async function submitDecision() {
  busy.value = true;
  try { await post(`/dashboard/payouts/${note.row.payout.id}/${note.approve ? 'approve' : 'reject'}`, { note: note.text || undefined }); note.open = false; ok(note.approve ? 'Approved' : 'Rejected'); reload(); loadBal(); }
  catch (e) { fail(e); } finally { busy.value = false; }
}
async function cancel(row: any) { if (!(await confirmDialog({ title: 'Cancel this payout?', message: `${ghs(row.payout.amount)} to ${row.payout.merchant} will not be sent. The money goes back to the available balance.`, confirmText: 'Cancel payout', cancelText: 'Keep it', danger: true }))) return; try { await post(`/dashboard/payouts/${row.payout.id}/cancel`); ok('Cancelled - funds returned to your balance'); reload(); loadBal(); } catch (e) { fail(e); } }
onMounted(loadBal); watch(() => mode.tick, loadBal);
</script>
