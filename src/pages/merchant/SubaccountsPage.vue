<template>
  <div>
    <PageHeader title="Subaccounts" subtitle="Each one is a business that receives its own payments, balance and payouts.">
      <button v-if="auth.canManage" class="btn primary" @click="openCreate"><q-icon name="add" />New subaccount</button>
    </PageHeader>
    <DataTable :columns="cols" :rows="rows" :loading="loading" :total="total" :page="page" :per-page="perPage" empty-title="No subaccounts yet" empty-text="Create one for each business you collect for." empty-icon="hub" @update:page="page = $event">
      <template #toolbar><input v-model="filters.q" class="field s-sm" style="max-width: 300px" placeholder="Search name, code or reference…" aria-label="Search" /></template>
      <template #cell-name="{ row }"><div class="font-semibold">{{ row.merchant.name }}</div><div class="text-[12.5px] text-muted mono">{{ row.merchant.code }}{{ row.merchant.externalRef ? ' · ' + row.merchant.externalRef : '' }}</div></template>
      <template #cell-terms="{ row }"><div class="text-[13px]">{{ (row.merchant.commissionBps / 100).toFixed(2) }}% commission</div><div class="text-[12px] text-muted">Fees paid by {{ row.merchant.feeBearer.toLowerCase() }} · {{ row.merchant.settlementDelayDays }}d settlement</div></template>
      <template #cell-balance="{ row }"><div v-if="row.available != null"><b>{{ ghs(row.available) }}</b><div class="text-[12px] text-muted">{{ ghs(row.pending) }} pending</div></div></template>
      <template #cell-bank="{ row }"><template v-if="row.bank"><div class="text-[13px]">{{ row.bank.bankName }} ····{{ row.bank.last4 }}</div><StatusBadge :status="row.bank.status" /></template><span v-else class="text-muted text-[13px]">None</span></template>
      <template #cell-status="{ row }"><StatusBadge :status="row.merchant.status" /></template>
      <template #cell-actions="{ row }"><div v-if="auth.canManage" class="flex gap-1.5 justify-end"><button class="btn s-sm" @click="openEdit(row)">Edit</button><button class="btn s-sm" @click="openBank(row)">Bank</button><button class="btn s-sm" @click="openLogin(row)">Portal login</button></div></template>
    </DataTable>

    <Modal v-model="create.open" title="New subaccount" :width="620">
      <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <div><label class="field-label">Business name</label><input v-model.trim="create.f.businessName" class="field" /></div>
        <div><label class="field-label">Contact email</label><input v-model.trim="create.f.email" class="field" type="email" /></div>
        <div><label class="field-label">Phone</label><input v-model.trim="create.f.phone" class="field" /></div>
        <div><label class="field-label">Your reference (optional)</label><input v-model.trim="create.f.externalRef" class="field" placeholder="e.g. your school id" /></div>
        <div><label class="field-label">Commission (%)</label><input v-model.number="create.f.pct" class="field" type="number" step="0.01" min="0" max="50" /></div>
        <div><label class="field-label">Who pays the processing fee?</label><select v-model="create.f.feeBearer" class="field"><option value="Subaccount">Subaccount</option><option value="Customer">Customer (added on top)</option><option value="Platform">Me (the platform)</option></select></div>
        <div><label class="field-label">Settlement</label><select v-model="create.f.settlementMode" class="field"><option value="Manual">Manual payouts</option><option value="Auto">Daily (T+1)</option><option value="Instant">Instant</option></select></div>
        <div><label class="field-label">Clearing period (days)</label><input v-model.number="create.f.settlementDelayDays" class="field" type="number" min="0" max="30" /></div>
      </div>
      <div class="hairline pt-4"><div class="font-semibold text-[14px] mb-2">Payout bank account (optional now)</div>
        <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <div><label class="field-label">Bank / network</label><select v-model="create.f.bankCode" class="field"><option value="">Select…</option><option v-for="b in banks" :key="b.code" :value="b.code">{{ b.name }}</option></select></div>
          <div><label class="field-label">Account number</label><input v-model.trim="create.f.accountNumber" class="field" inputmode="numeric" /></div>
          <div class="col-span-2 max-sm:col-span-1"><label class="field-label">Account name</label><input v-model.trim="create.f.accountName" class="field" /></div>
        </div></div>
      <template #footer><button class="btn" @click="create.open = false">Cancel</button><button class="btn primary" :disabled="busy || !create.f.businessName || !create.f.email" @click="doCreate">{{ busy ? 'Creating…' : 'Create subaccount' }}</button></template>
    </Modal>

    <Modal v-model="edit.open" title="Edit subaccount">
      <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <div><label class="field-label">Commission (%)</label><input v-model.number="edit.pct" class="field" type="number" step="0.01" min="0" max="50" /></div>
        <div><label class="field-label">Clearing period (days)</label><input v-model.number="edit.days" class="field" type="number" min="0" max="30" /></div>
        <div><label class="field-label">Fee paid by</label><select v-model="edit.feeBearer" class="field"><option value="Subaccount">Subaccount</option><option value="Customer">Customer</option><option value="Platform">Platform</option></select></div>
        <div><label class="field-label">Status</label><select v-model="edit.status" class="field"><option value="Active">Active</option><option value="Suspended">Suspended</option></select></div>
      </div>
      <p class="field-hint">Changes apply to new payments only.</p>
      <template #footer><button class="btn" @click="edit.open = false">Cancel</button><button class="btn primary" :disabled="busy" @click="doEdit">Save</button></template>
    </Modal>

    <Modal v-model="login.open" :title="`Portal login · ${login.row?.merchant.name}`">
      <template v-if="!login.password">
        <p class="text-muted text-[14px]">Gives this school its own Webfrest Pay login to see its payments, balance and payouts.</p>
        <div><label class="field-label">Full name</label><input v-model.trim="login.fullName" class="field" /></div>
        <div><label class="field-label">Email</label><input v-model.trim="login.email" class="field" type="email" /></div>
      </template>
      <template v-else>
        <p class="text-[14px]" style="color: rgb(var(--warn))"><b>Share this temporary password privately - it won't be shown again.</b> They'll be asked to change it at first sign-in.</p>
        <div class="code-block">{{ login.email }}
{{ login.password }}</div>
      </template>
      <template #footer><button class="btn" @click="login.open = false">{{ login.password ? 'Done' : 'Cancel' }}</button><button v-if="!login.password" class="btn primary" :disabled="busy || !login.email || !login.fullName" @click="doLogin">Create login</button></template>
    </Modal>

    <Modal v-model="bank.open" :title="`Bank account · ${bank.row?.merchant.name}`">
      <div><label class="field-label">Bank / network</label><select v-model="bank.f.bankCode" class="field"><option value="">Select…</option><option v-for="b in banks" :key="b.code" :value="b.code">{{ b.name }}</option></select></div>
      <div><label class="field-label">Account number</label><input v-model.trim="bank.f.accountNumber" class="field" inputmode="numeric" /></div>
      <div><label class="field-label">Account name</label><input v-model.trim="bank.f.accountName" class="field" /></div>
      <p class="field-hint">New accounts are verified by Webfrest Operations before the first payout.</p>
      <template #footer><button class="btn" @click="bank.open = false">Cancel</button><button class="btn primary" :disabled="busy || !bank.f.bankCode || !bank.f.accountNumber" @click="doBank">Save account</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue';
import { useList } from 'src/composables/useList'; import { get, post, patch, fail, ok } from 'src/services/api'; import { ghs } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth();
const cols = [{ key: 'name', label: 'Subaccount' }, { key: 'terms', label: 'Terms' }, { key: 'balance', label: 'Available', num: true }, { key: 'bank', label: 'Bank' }, { key: 'status', label: 'Status' }, { key: 'actions', label: '' }];
const { filters, rows, total, page, perPage, loading, reload } = useList('/dashboard/subaccounts', { q: '' });
const banks = ref<any[]>([]); const busy = ref(false);
const blank = () => ({ businessName: '', email: '', phone: '', externalRef: '', pct: 0, feeBearer: 'Subaccount', settlementMode: 'Manual', settlementDelayDays: 1, bankCode: '', accountNumber: '', accountName: '' });
const create = reactive({ open: false, f: blank() });
const edit = reactive<any>({ open: false, row: null, pct: 0, days: 1, feeBearer: 'Subaccount', status: 'Active' });
const login = reactive<any>({ open: false, row: null, fullName: '', email: '', password: '' });
const bank = reactive<any>({ open: false, row: null, f: { bankCode: '', accountNumber: '', accountName: '' } });
onMounted(async () => { try { banks.value = (await get('/dashboard/banks')).data; } catch { /* ignore */ } });
function openCreate() { create.f = blank(); create.open = true; }
async function doCreate() {
  busy.value = true; const f = create.f;
  try { await post('/dashboard/subaccounts', { businessName: f.businessName, email: f.email, phone: f.phone || undefined, externalRef: f.externalRef || undefined, commissionBps: Math.round((f.pct || 0) * 100), feeBearer: f.feeBearer, settlementMode: f.settlementMode, settlementDelayDays: f.settlementDelayDays, bankCode: f.bankCode || undefined, accountNumber: f.accountNumber || undefined, accountName: f.accountName || undefined }); create.open = false; ok('Subaccount created'); reload(); }
  catch (e) { fail(e); } finally { busy.value = false; }
}
function openEdit(row: any) { Object.assign(edit, { open: true, row, pct: row.merchant.commissionBps / 100, days: row.merchant.settlementDelayDays, feeBearer: row.merchant.feeBearer, status: row.merchant.status === 'Suspended' ? 'Suspended' : 'Active' }); }
async function doEdit() {
  busy.value = true;
  try { await patch(`/dashboard/subaccounts/${edit.row.merchant.code}`, { commissionBps: Math.round(edit.pct * 100), settlementDelayDays: edit.days, feeBearer: edit.feeBearer, status: edit.status }); edit.open = false; ok('Saved'); reload(); }
  catch (e) { fail(e); } finally { busy.value = false; }
}
function openLogin(row: any) { Object.assign(login, { open: true, row, fullName: '', email: row.merchant.email || '', password: '' }); }
async function doLogin() {
  busy.value = true;
  try { const r = await post(`/dashboard/subaccounts/${login.row.merchant.code}/portal-user`, { email: login.email, fullName: login.fullName }); login.password = r.data.temporaryPassword; }
  catch (e) { fail(e); } finally { busy.value = false; }
}
function openBank(row: any) { Object.assign(bank, { open: true, row, f: { bankCode: '', accountNumber: '', accountName: row.merchant.name } }); }
async function doBank() {
  busy.value = true;
  try { await post(`/dashboard/subaccounts/${bank.row.merchant.code}/bank-account`, bank.f); bank.open = false; ok('Bank account saved'); reload(); }
  catch (e) { fail(e); } finally { busy.value = false; }
}
</script>
