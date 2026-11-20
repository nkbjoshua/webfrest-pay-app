<template>
  <div>
    <PageHeader title="Bank accounts" subtitle="Verify where merchants get paid before the first payout." />
    <DataTable :columns="cols" :rows="rows" :loading="loading" :total="total" :page="page" :per-page="perPage" empty-title="Nothing to verify" empty-text="New payout accounts appear here." empty-icon="account_balance_wallet" @update:page="page = $event">
      <template #toolbar><select v-model="filters.status" class="field s-sm" style="max-width: 220px" aria-label="Status"><option value="">All</option><option value="PendingVerification">Awaiting verification</option><option>Verified</option><option>Rejected</option></select></template>
      <template #cell-merchant="{ row }"><router-link :to="`/ops/merchants/${row.merchant.id}`" class="font-semibold">{{ row.merchant.name }}</router-link><div class="text-[12.5px] text-muted">{{ row.merchant.type }}</div></template>
      <template #cell-account="{ row }"><div class="font-semibold">{{ row.account.bankName }} ····{{ row.account.last4 }}</div><div v-if="row.account.sortCode" class="text-[12.5px] text-muted">Sort code {{ row.account.sortCode }}</div><div class="text-[12.5px] text-muted">Given: {{ row.account.accountName }}</div>
        <div v-if="row.account.bankAccountName" class="text-[12.5px] mt-0.5" :style="{ color: row.account.nameMatch >= 60 ? 'rgb(var(--ok))' : 'rgb(var(--bad))' }">Bank says: {{ row.account.bankAccountName }} · {{ row.account.nameMatch }}% match</div>
        <div v-else class="text-[12.5px] text-muted mt-0.5">The bank hasn't confirmed the name yet</div></template>
      <template #cell-status="{ row }"><StatusBadge :status="row.account.status" /><div v-if="row.account.note" class="text-[12px] text-muted mt-1">{{ row.account.note }}</div></template>
      <template #cell-createdAt="{ row }">{{ dt(row.account.createdAt) }}</template>
      <template #cell-actions="{ row }"><div class="flex gap-1.5 justify-end"><button class="btn s-sm" @click="reveal(row.account)"><q-icon name="visibility" />Show</button><button v-if="auth.opsDecider" class="btn s-sm" title="Ask the bank who owns this account" @click="recheck(row.account)"><q-icon name="manage_search" />Check name</button><template v-if="auth.opsDecider && row.account.status === 'PendingVerification'"><button class="btn s-sm ok" @click="decide(row.account, true)">Verify</button><button class="btn s-sm danger" @click="decide(row.account, false)">Reject</button></template></div></template>
    </DataTable>
    <Modal v-model="rev.open" title="Account number"><dl class="kv"><dt>Bank</dt><dd>{{ rev.bankName }}</dd><dt>Account name</dt><dd>{{ rev.accountName }}</dd><dt>Number</dt><dd class="mono text-[16px]">{{ rev.accountNumber }}</dd></dl><p class="field-hint">This view was recorded in the audit log.</p></Modal>
  </div>
</template>
<script setup lang="ts">
import { confirmDialog, promptDialog } from 'src/utils/confirm';
import { reactive } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue';
import { useList } from 'src/composables/useList'; import { get, post, fail, ok } from 'src/services/api'; import { dt } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth();
const cols = [{ key: 'merchant', label: 'Merchant' }, { key: 'account', label: 'Account' }, { key: 'status', label: 'Status' }, { key: 'createdAt', label: 'Added' }, { key: 'actions', label: '' }];
const { filters, rows, total, page, perPage, loading, reload } = useList('/ops/bank-accounts', { status: 'PendingVerification' }, { modeAware: false });
const rev = reactive<any>({ open: false, bankName: '', accountName: '', accountNumber: '' });
async function recheck(a: any) { if (!(await confirmDialog({ title: 'Ask the bank again?', message: 'We will ask the bank who owns this account and update the name shown.', confirmText: 'Check now' }))) return; try { const r = await post(`/ops/bank-accounts/${a.id}/recheck-name`); ok(r.message); reload(); } catch (e) { fail(e); } }
async function decide(a: any, approve: boolean) {
  let note: string | null | undefined;
  if (!approve) { note = await promptDialog({ title: 'Reject this bank account', message: 'The merchant will see your reason.', label: 'Reason', required: true, confirmText: 'Reject', danger: true }); if (!note) return; }
  else if (!(a.nameMatch != null && a.nameMatch < 60) && !(await confirmDialog({ title: 'Verify this bank account?', message: `${a.bankName} ····${a.last4} · ${a.accountName}\nPayouts to this merchant will be sent here.`, confirmText: 'Verify', icon: 'verified' }))) return;
  // The bank's name doesn't look like the one given: say why it's still the right account.
  if (approve && a.nameMatch != null && a.nameMatch < 60) { note = await promptDialog({ title: 'The names don\'t match', message: `The bank calls this account "${a.bankAccountName}", which doesn't match "${a.accountName}" (${a.nameMatch}%).`, label: 'Why is it still the right account?', required: true, confirmText: 'Verify anyway' }); if (!note) return; } try { await post(`/ops/bank-accounts/${a.id}/decision`, { approve, note }); ok(approve ? 'Verified' : 'Rejected'); reload(); } catch (e) { fail(e); } }
async function reveal(a: any) { try { const r = (await get(`/ops/bank-accounts/${a.id}/reveal`)).data; Object.assign(rev, { open: true, bankName: r.bankName, accountName: r.accountName, accountNumber: r.accountNumber }); } catch (e) { fail(e); } }
</script>
