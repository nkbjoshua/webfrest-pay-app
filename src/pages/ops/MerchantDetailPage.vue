<template>
  <div>
    <router-link to="/ops/merchants" class="text-[13.5px] font-semibold inline-flex items-center gap-1 mb-3"><q-icon name="arrow_back" size="16px" />Merchants</router-link>
    <div v-if="loading" class="skeleton" style="height: 300px"></div>
    <template v-else-if="m">
      <PageHeader :title="m.name" :subtitle="`${m.code} · ${m.type}${m.parent ? ' under ' + m.parent : ''}`">
        <StatusBadge :status="m.status" />
        <router-link v-if="m.type === 'Platform'" :to="`/ops/merchants/${m.id}/subaccounts`" class="btn s-sm"><q-icon name="hub" />Subaccounts ({{ d.subaccountCount }})</router-link>
        <template v-if="auth.opsDecider">
          <button v-if="m.status === 'Pending'" class="btn s-sm ok" @click="decide('approve')">Approve</button>
          <button v-if="m.status === 'Pending'" class="btn s-sm danger" @click="decide('reject')">Reject</button>
          <button v-if="m.status === 'Active'" class="btn s-sm danger" @click="decide('suspend')">Suspend</button>
          <button v-if="['Suspended', 'Rejected'].includes(m.status)" class="btn s-sm ok" @click="decide('reinstate')">Reinstate</button>
          <button class="btn s-sm" @click="openSettings">Settings</button>
        </template>
      </PageHeader>
      <div class="grid gap-6 max-lg:!grid-cols-1" style="grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr)">
        <div class="grid gap-6 content-start">
          <div class="card card-pad"><h3 class="font-bold mb-4">Business</h3>
            <dl class="kv"><dt>Email</dt><dd>{{ m.email }}</dd><dt>Phone</dt><dd>{{ m.phone || '-' }}</dd><dt>Website</dt><dd>{{ m.website || '-' }}</dd><dt>Industry</dt><dd>{{ m.industry || '-' }}</dd><dt>Registration</dt><dd>{{ m.registrationNumber || '-' }}</dd><dt>TIN</dt><dd>{{ m.taxId || '-' }}</dd><dt>Address</dt><dd>{{ m.address || '-' }}</dd><dt>Joined</dt><dd>{{ dt(m.createdAt) }}</dd>
              <dt v-if="m.reviewedBy">Last review</dt><dd v-if="m.reviewedBy">{{ m.reviewedBy }} · {{ dt(m.reviewedAt) }}<div v-if="m.reviewNote" class="text-muted">{{ m.reviewNote }}</div></dd></dl></div>
          <div class="card card-pad"><h3 class="font-bold mb-4">Terms</h3>
            <dl class="kv"><dt>Fee plan</dt><dd>{{ planName }}</dd><dt>Commission</dt><dd>{{ (m.commissionBps / 100).toFixed(2) }}%{{ m.commissionFlatMinor ? ' + ' + ghs(m.commissionFlatMinor) : '' }}</dd><dt>Fees paid by</dt><dd>{{ m.feeBearer }}</dd><dt>Settlement</dt><dd>{{ m.settlementMode }} · {{ m.settlementDelayDays }} day(s)</dd><dt>Payout approval</dt><dd>{{ m.payoutApprovalMode }}</dd><dt>Per-payment limit</dt><dd>{{ m.maxTransactionMinor ? ghs(m.maxTransactionMinor) : 'Platform default' }}</dd><dt>Live payments</dt><dd>{{ m.liveEnabled ? 'Enabled' : 'Locked' }}</dd></dl></div>
          <div class="card overflow-hidden"><div class="p-5 pb-3 font-bold">Recent transactions</div>
            <DataTable :columns="tcols" :rows="d.recent" clickable empty-title="No transactions" @row="(r: any) => $router.push(`/ops/transactions/${r.id}`)">
              <template #cell-amount="{ row }"><b>{{ ghs(row.chargeAmount) }}</b></template><template #cell-status="{ row }"><StatusBadge :status="row.status" /></template><template #cell-createdAt="{ row }">{{ ago(row.createdAt) }}</template>
            </DataTable></div>
        </div>
        <div class="grid gap-6 content-start">
          <div class="card card-pad"><h3 class="font-bold mb-4">Balances</h3>
            <div class="grid gap-3"><div v-for="md in ['live', 'test']" :key="md" class="flex justify-between text-[14px]"><span class="chip" :class="md">{{ md }}</span><span><b>{{ ghs(d.balances[md].available) }}</b> available · {{ ghs(d.balances[md].pending) }} pending</span></div></div></div>
          <div class="card card-pad"><h3 class="font-bold mb-3">Bank accounts</h3>
            <div v-if="!d.bankAccounts.length" class="text-muted text-[14px]">None added.</div>
            <div v-for="b in d.bankAccounts" :key="b.id" class="py-3 hairline first:border-0"><div class="flex justify-between gap-3"><div><div class="font-semibold">{{ b.bankName }} ····{{ b.last4 }}</div><div class="text-[12.5px] text-muted">{{ b.accountName }}</div></div><StatusBadge :status="b.status" /></div>
              <div v-if="auth.opsDecider" class="flex gap-1.5 mt-2"><button v-if="b.status === 'PendingVerification'" class="btn s-sm ok" @click="bankDecision(b, true)">Verify</button><button v-if="b.status === 'PendingVerification'" class="btn s-sm danger" @click="bankDecision(b, false)">Reject</button><button class="btn s-sm" @click="reveal(b)"><q-icon name="visibility" />Show number</button></div></div></div>
          <div class="card card-pad"><h3 class="font-bold mb-3">Users</h3><div v-for="u in d.users" :key="u.id" class="flex justify-between py-2 text-[14px]"><div><div class="font-semibold">{{ u.name }}</div><div class="text-[12.5px] text-muted">{{ u.email }}</div></div><div class="text-right text-[12.5px] text-muted">{{ u.role.replace('Merchant', '') }}<br />{{ u.status }}</div></div></div>
          <div class="card card-pad" v-if="d.routes.length"><h3 class="font-bold mb-3">Provider overrides</h3><div v-for="r in d.routes" :key="r.id" class="text-[14px] py-1">{{ r.channel ? channelLabel(r.channel) : 'All methods' }} → <b>{{ r.provider }}</b></div><router-link to="/ops/providers" class="text-[13px] font-semibold">Manage routing</router-link></div>
        </div>
      </div>

      <Modal v-model="dec.open" :title="`${dec.label} ${m.name}`">
        <div><label class="field-label">Note {{ dec.required ? '(required - the merchant will see it)' : '(optional)' }}</label><textarea v-model.trim="dec.note" class="field"></textarea></div>
        <template #footer><button class="btn" @click="dec.open = false">Cancel</button><button class="btn" :class="dec.tone" :disabled="busy || (dec.required && !dec.note)" @click="doDecide">{{ dec.label }}</button></template>
      </Modal>
      <Modal v-model="set.open" title="Merchant settings">
        <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <div v-if="m.type !== 'Subaccount'"><label class="field-label">Account type</label><select v-model="set.type" class="field" :disabled="!auth.opsAdmin"><option>Standard</option><option>Platform</option></select></div>
          <div><label class="field-label">Fee plan</label><select v-model="set.feePlanId" class="field"><option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}{{ p.isDefault ? ' (default)' : '' }}</option></select></div>
          <div><label class="field-label">Commission (%)</label><input v-model.number="set.pct" class="field" type="number" step="0.01" min="0" max="50" /></div>
          <div><label class="field-label">Fee paid by</label><select v-model="set.feeBearer" class="field"><option>Subaccount</option><option>Customer</option><option>Platform</option></select></div>
          <div><label class="field-label">Settlement</label><select v-model="set.settlementMode" class="field"><option value="Manual">Manual - the school requests payouts</option><option value="Auto">Daily (T+1) - one bulk payout a day</option><option value="Instant">Instant - paid within minutes, no approval needed</option></select></div>
          <div><label class="field-label">Clearing days</label><input v-model.number="set.days" class="field" type="number" min="0" max="30" /></div>
          <div><label class="field-label">Payout approval</label><select v-model="set.approval" class="field" :disabled="!auth.opsAdmin"><option>Ops</option><option>Both</option><option>Merchant</option></select></div>
          <div><label class="field-label">Per-payment limit (GHS)</label><input v-model="set.limit" class="field" inputmode="decimal" placeholder="Platform default" /></div>
        </div>
        <template #footer><button class="btn" @click="set.open = false">Cancel</button><button class="btn primary" :disabled="busy" @click="saveSettings">Save</button></template>
      </Modal>
      <Modal v-model="rev.open" title="Account number"><dl class="kv"><dt>Bank</dt><dd>{{ rev.bankName }}</dd><dt>Account name</dt><dd>{{ rev.accountName }}</dd><dt>Number</dt><dd class="mono text-[16px]">{{ rev.accountNumber }}</dd></dl><p class="field-hint">This view was recorded in the audit log.</p></Modal>
    </template>
  </div>
</template>
<script setup lang="ts">
import { confirmDialog, promptDialog } from 'src/utils/confirm';
import { computed, onMounted, reactive, ref } from 'vue'; import { useRoute } from 'vue-router';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue';
import { get, post, patch, fail, ok } from 'src/services/api'; import { ghs, dt, ago, channelLabel, toMinor } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth(); const id = useRoute().params.id as string;
const d = ref<any>(null); const m = computed(() => d.value?.merchant); const plans = ref<any[]>([]); const loading = ref(true); const busy = ref(false);
const planName = computed(() => plans.value.find((p) => p.id === m.value?.feePlanId)?.name || 'Default');
const tcols = [{ key: 'reference', label: 'Reference' }, { key: 'amount', label: 'Amount', num: true }, { key: 'status', label: 'Status' }, { key: 'createdAt', label: 'When' }];
const dec = reactive<any>({ open: false, kind: '', label: '', tone: 'primary', required: false, note: '' });
const set = reactive<any>({ open: false, type: 'Standard', feePlanId: '', pct: 0, feeBearer: 'Subaccount', settlementMode: 'Manual', days: 1, approval: 'Ops', limit: '' });
const rev = reactive<any>({ open: false, bankName: '', accountName: '', accountNumber: '' });
async function load() { try { d.value = (await get(`/ops/merchants/${id}`)).data; plans.value = (await get('/ops/fee-plans')).data; } catch (e) { fail(e); } finally { loading.value = false; } }
function decide(kind: string) { const M: any = { approve: ['Approve', 'ok', false], reject: ['Reject', 'danger', true], suspend: ['Suspend', 'danger', true], reinstate: ['Reinstate', 'ok', false] }; Object.assign(dec, { open: true, kind, label: M[kind][0], tone: M[kind][1], required: M[kind][2], note: '' }); }
async function doDecide() { busy.value = true; try { await post(`/ops/merchants/${id}/decision`, { decision: dec.kind, note: dec.note || undefined }); dec.open = false; ok('Done'); load(); } catch (e) { fail(e); } finally { busy.value = false; } }
function openSettings() { const x = m.value; Object.assign(set, { open: true, type: x.type === 'Subaccount' ? undefined : x.type, feePlanId: x.feePlanId || plans.value.find((p) => p.isDefault)?.id, pct: x.commissionBps / 100, feeBearer: x.feeBearer, settlementMode: x.settlementMode, days: x.settlementDelayDays, approval: x.payoutApprovalMode, limit: x.maxTransactionMinor ? (x.maxTransactionMinor / 100).toString() : '' }); }
async function saveSettings() {
  busy.value = true;
  try { await patch(`/ops/merchants/${id}/settings`, { type: set.type !== m.value.type ? set.type : undefined, feePlanId: set.feePlanId, commissionBps: Math.round(set.pct * 100), feeBearer: set.feeBearer, settlementMode: set.settlementMode, settlementDelayDays: set.days, payoutApprovalMode: set.approval, maxTransactionMinor: set.limit ? toMinor(set.limit) : undefined, clearMaxTransaction: !set.limit && m.value.maxTransactionMinor ? true : undefined }); set.open = false; ok('Saved'); load(); }
  catch (e) { fail(e); } finally { busy.value = false; }
}
async function bankDecision(b: any, approve: boolean) { let note: string | null | undefined; if (!approve) { note = await promptDialog({ title: 'Reject this bank account', message: 'The merchant will see your reason.', label: 'Reason', required: true, confirmText: 'Reject', danger: true }); if (!note) return; } else if (!(await confirmDialog({ title: 'Verify this bank account?', message: `${b.bankName} ····${b.last4} · ${b.accountName}`, confirmText: 'Verify' }))) return; try { await post(`/ops/bank-accounts/${b.id}/decision`, { approve, note }); ok(approve ? 'Verified' : 'Rejected'); load(); } catch (e) { fail(e); } }
async function reveal(b: any) { try { const r = (await get(`/ops/bank-accounts/${b.id}/reveal`)).data; Object.assign(rev, { open: true, bankName: r.bankName, accountName: r.accountName, accountNumber: r.accountNumber }); } catch (e) { fail(e); } }
onMounted(load);
</script>
