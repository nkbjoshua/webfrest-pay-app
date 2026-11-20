<template>
  <div>
    <PageHeader title="Business" subtitle="Your profile, payout account and how payments are priced." />
    <div v-if="loading" class="skeleton" style="height: 300px"></div>
    <div v-else class="grid gap-6 max-lg:!grid-cols-1" style="grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr)">
      <div class="grid gap-6 content-start">
        <div class="card card-pad">
          <div class="flex items-center justify-between mb-4"><h3 class="font-bold">Profile</h3><StatusBadge :status="m.status" /></div>
          <div v-if="m.reviewNote" class="mb-4 p-3 rounded-xl text-[13.5px]" style="background: rgb(var(--warn) / 0.12)"><b>Note from Webfrest:</b> {{ m.reviewNote }}</div>
          <dl class="kv mb-5"><dt>Legal name</dt><dd>{{ m.name }}</dd><dt>Merchant code</dt><dd><CopyText :text="m.code" /></dd><dt>Account type</dt><dd>{{ m.type }}</dd><dt>Email</dt><dd>{{ m.email }}</dd></dl>
          <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div><label class="field-label">Trading name</label><input v-model.trim="f.tradingName" class="field" :disabled="!auth.canManage" /></div>
            <div><label class="field-label">Phone</label><input v-model.trim="f.phone" class="field" :disabled="!auth.canManage" /></div>
            <div><label class="field-label">Website</label><input v-model.trim="f.website" class="field" :disabled="!auth.canManage" /></div>
            <div><label class="field-label">Industry</label><input v-model.trim="f.industry" class="field" :disabled="!auth.canManage" /></div>
            <div><label class="field-label">Registration number</label><input v-model.trim="f.registrationNumber" class="field" :disabled="!auth.canManage" /></div>
            <div><label class="field-label">Tax ID (TIN)</label><input v-model.trim="f.taxId" class="field" :disabled="!auth.canManage" /></div>
            <div class="col-span-2 max-sm:col-span-1"><label class="field-label">Address</label><input v-model.trim="f.address" class="field" :disabled="!auth.canManage" /></div>
          </div>
          <div v-if="auth.canManage" class="mt-5 flex justify-end"><button class="btn primary" :disabled="busy" @click="save">{{ busy ? 'Saving…' : 'Save changes' }}</button></div>
        </div>
        <div v-if="auth.role === 'MerchantOwner'" class="card card-pad">
          <h3 class="font-bold mb-1">Payout approval</h3>
          <p class="text-muted text-[13.5px] mb-4">Every payout is checked by Webfrest Operations. You can also require one of your own admins to approve first.</p>
          <select v-model="approval" class="field" style="max-width: 360px" @change="saveApproval"><option value="Ops">Webfrest Operations only</option><option value="Both">Your admin and Webfrest Operations</option></select>
        </div>
      </div>
      <div class="grid gap-6 content-start">
        <div class="card card-pad">
          <div class="flex items-center justify-between mb-4"><h3 class="font-bold">Payout bank accounts</h3><button v-if="auth.canManage" class="btn s-sm" @click="bank.open = true"><q-icon name="add" />Add</button></div>
          <div v-if="!banks.length" class="text-muted text-[14px]">No bank account yet. Add one to receive payouts.</div>
          <div v-for="b in banks" :key="b.id" class="py-3 hairline first:border-0">
            <div class="flex items-center justify-between gap-3"><div><div class="font-semibold">{{ b.bankName }} ····{{ b.last4 }}</div><div class="text-[12.5px] text-muted">{{ b.accountName }}</div></div><div class="text-right"><StatusBadge :status="b.status" /><div v-if="b.isPrimary" class="text-[11.5px] text-muted mt-1">Primary</div></div></div>
            <div v-if="b.note" class="text-[12.5px] text-muted mt-1.5">{{ b.note }}</div>
          </div>
        </div>
        <div class="card card-pad">
          <h3 class="font-bold mb-3">Processing fees</h3>
          <div v-for="r in fees" :key="r.channel" class="flex justify-between py-2 hairline first:border-0 text-[14px]"><span>{{ r.channel ? channelLabel(r.channel) : 'Other methods' }}</span><b>{{ (r.percentBps / 100).toFixed(2) }}%{{ r.flatMinor ? ' + ' + ghs(r.flatMinor) : '' }}</b></div>
          <p class="field-hint mt-3">Charged per successful payment. Need different pricing? Contact Webfrest.</p>
        </div>
      </div>
    </div>
    <Modal v-model="bank.open" title="Add payout bank account">
      <div><label class="field-label">Bank / network</label><select v-model="bank.bankCode" class="field"><option value="">Select…</option><option v-for="b in bankList" :key="b.code" :value="b.code">{{ b.name }}</option></select></div>
      <div><label class="field-label">Account number</label><input v-model.trim="bank.accountNumber" class="field" inputmode="numeric" /></div>
      <div><label class="field-label">Account name</label><input v-model.trim="bank.accountName" class="field" /></div>
      <p class="field-hint">Webfrest Operations verifies new accounts before the first payout.</p>
      <template #footer><button class="btn" @click="bank.open = false">Cancel</button><button class="btn primary" :disabled="busy || !bank.bankCode || !bank.accountNumber || !bank.accountName" @click="addBank">Save account</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue'; import CopyText from 'src/components/CopyText.vue';
import { get, post, patch, fail, ok } from 'src/services/api'; import { ghs, channelLabel } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth();
const m = ref<any>({}); const banks = ref<any[]>([]); const fees = ref<any[]>([]); const bankList = ref<any[]>([]); const loading = ref(true); const busy = ref(false); const approval = ref('Ops');
const f = reactive({ tradingName: '', phone: '', website: '', industry: '', address: '', registrationNumber: '', taxId: '' });
const bank = reactive({ open: false, bankCode: '', accountNumber: '', accountName: '' });
async function load() {
  try { const r = (await get('/dashboard/profile')).data; m.value = r.merchant; banks.value = r.bankAccounts; fees.value = r.fees; approval.value = r.merchant.payoutApprovalMode === 'Both' ? 'Both' : 'Ops';
    Object.assign(f, { tradingName: m.value.tradingName || '', phone: m.value.phone || '', website: m.value.website || '', industry: m.value.industry || '', address: m.value.address || '', registrationNumber: m.value.registrationNumber || '', taxId: m.value.taxId || '' });
    bankList.value = (await get('/dashboard/banks')).data; } catch (e) { fail(e); } finally { loading.value = false; }
}
async function save() { busy.value = true; try { await patch('/dashboard/profile', f); ok('Saved'); load(); } catch (e) { fail(e); } finally { busy.value = false; } }
async function saveApproval() { try { await patch('/dashboard/profile', { payoutApprovalMode: approval.value }); ok('Payout approval updated'); } catch (e) { fail(e); load(); } }
async function addBank() { busy.value = true; try { const r = await post('/dashboard/bank-account', { bankCode: bank.bankCode, accountNumber: bank.accountNumber, accountName: bank.accountName }); bank.open = false; Object.assign(bank, { bankCode: '', accountNumber: '', accountName: '' }); ok(r.message); load(); } catch (e) { fail(e); } finally { busy.value = false; } }
onMounted(load);
</script>
