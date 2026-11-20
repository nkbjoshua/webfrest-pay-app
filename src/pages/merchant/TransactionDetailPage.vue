<template>
  <div>
    <div class="flex justify-end -mt-1 mb-3"><router-link to="/dashboard/transactions" class="text-[13.5px] font-semibold inline-flex items-center gap-1.5 text-muted"><q-icon name="arrow_back" size="17px" />Back to transactions</router-link></div>
    <div v-if="loading" class="skeleton" style="height: 300px"></div>
    <template v-else-if="t">
      <div class="card head">
        <div class="flex items-center gap-4 min-w-0">
          <span class="head-icon"><q-icon name="swap_horiz" size="34px" /></span>
          <div class="min-w-0">
            <div class="text-[13.5px] text-muted">Transaction</div>
            <div class="text-[30px] font-extrabold leading-tight nowrap">{{ ghs(t.chargeAmount) }}</div>
            <div class="text-[13px] text-muted truncate">{{ t.reference }} · <span class="mono">{{ t.id }}</span></div>
            <div class="flex gap-2 mt-2"><span class="pill" :class="t.mode === 'live' ? 'live' : 'test'"><span class="d"></span>{{ t.mode === 'live' ? 'Live' : 'Test' }}</span><StatusBadge :status="t.status" /></div>
          </div>
        </div>
        <div class="who"><span class="avatar plain"><q-icon name="person_outline" size="20px" /></span><div class="min-w-0"><div class="font-semibold truncate">{{ t.customer.name || 'Customer' }}</div><div class="text-[12px] text-muted">Customer</div><div class="text-[12px] text-muted truncate">{{ t.customer.email }}</div><div class="text-[12px] text-muted">{{ t.customer.phone }}</div></div></div>
        <div class="flex gap-2.5 items-start flex-wrap">
          <button class="btn ok" @click="copyText(t.reference)"><q-icon name="content_copy" />Copy reference</button>
          <button v-if="['pending', 'processing'].includes(t.status)" class="btn" :disabled="busy" @click="verify"><q-icon name="sync" />Check with bank</button>
          <button v-if="auth.canManage && auth.merchant?.type !== 'Subaccount' && ['success', 'partiallyrefunded'].includes(t.status)" class="btn danger" @click="refund = true"><q-icon name="undo" />Refund</button>
        </div>
      </div>

      <div class="grid gap-4 mt-4" style="grid-template-columns: repeat(auto-fit, minmax(230px, 1fr))">
        <KpiCard compact icon="account_balance_wallet" tone="green" label="Payment amount" :value="ghs(t.amount)" />
        <KpiCard compact icon="savings" tone="blue" label="Processing fee" :value="ghs(t.fees)" />
        <KpiCard v-if="t.commission" compact icon="percent" tone="orange" label="Platform commission" :value="ghs(t.commission)" />
        <KpiCard compact icon="north_east" tone="green" label="Net to receiver" :value="ghs(t.receiverNet)" />
      </div>

      <div class="grid gap-4 mt-4 max-lg:!grid-cols-1" style="grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr)">
        <div class="grid gap-4 content-start">
          <SectionCard icon="description" title="Details">
            <dl class="rows">
              <div class="row"><dt>Transaction ID</dt><dd><CopyText :text="t.id" /></dd></div>
              <div class="row"><dt>Customer</dt><dd>{{ t.customer.name || '-' }}<div class="text-muted text-[12.5px]">{{ t.customer.email }} {{ t.customer.phone }}</div></dd></div>
              <div class="row"><dt>Method</dt><dd>{{ channelLabel(t.channel) }}</dd></div>
              <div class="row"><dt>Description</dt><dd>{{ t.description || '-' }}</dd></div>
              <div class="row"><dt>Subaccount</dt><dd><span class="mono">{{ t.subaccount || '-' }}</span></dd></div>
              <div class="row"><dt>Created</dt><dd>{{ dt(t.createdAt) }}</dd></div>
              <div class="row"><dt>Paid</dt><dd>{{ t.paidAt ? dt(t.paidAt) : '-' }}</dd></div>
              <div v-if="t.failureReason" class="row"><dt>Note</dt><dd style="color: rgb(var(--bad))">{{ t.failureReason }}</dd></div>
              <div v-if="t.metadata" class="row"><dt>Metadata</dt><dd><pre class="mono" style="margin: 0; white-space: pre-wrap">{{ JSON.stringify(t.metadata, null, 2) }}</pre></dd></div>
            </dl>
          </SectionCard>
          <SectionCard v-if="refunds.length" icon="undo" title="Refunds">
            <div v-for="r in refunds" :key="r.id" class="flex items-center justify-between py-2.5 hairline first:border-0 text-[14px]"><div><b>{{ ghs(r.amount) }}</b><div class="text-[12.5px] text-muted">{{ r.reason || 'No reason given' }} · {{ dt(r.createdAt) }}</div></div><StatusBadge :status="r.status" /></div>
          </SectionCard>
        </div>
        <div class="grid gap-4 content-start">
          <SectionCard icon="payments" title="Money">
            <dl class="rows end">
              <div class="row"><dt>Payment amount</dt><dd>{{ ghs(t.amount) }}</dd></div>
              <div class="row"><dt>Processing fee</dt><dd>{{ ghs(t.fees) }}</dd></div>
              <div v-if="t.commission" class="row"><dt>Platform commission</dt><dd>{{ ghs(t.commission) }}</dd></div>
              <div class="row"><dt>Fee paid by</dt><dd>{{ t.feeBearer }}</dd></div>
              <div class="row"><dt>Net to receiver</dt><dd><b>{{ ghs(t.receiverNet) }}</b></dd></div>
              <div v-if="t.refunded" class="row"><dt>Refunded</dt><dd>{{ ghs(t.refunded) }}</dd></div>
              <div v-if="t.clearsAt" class="row"><dt>Clears</dt><dd>{{ dt(t.clearsAt) }}</dd></div>
            </dl>
          </SectionCard>
          <SectionCard icon="schedule" title="Timeline"><TimelineList :events="events" /></SectionCard>
        </div>
      </div>
      <Modal v-model="refund" title="Refund this payment">
        <p class="text-muted text-[14px]">Up to {{ ghs(t.chargeAmount - t.refunded) }} can be refunded. Fees and commission are not returned.</p>
        <div><label class="field-label">Amount (GHS) - leave blank for the full amount</label><input v-model="refundAmount" class="field" inputmode="decimal" :placeholder="((t.chargeAmount - t.refunded) / 100).toFixed(2)" /></div>
        <div><label class="field-label">Reason</label><input v-model.trim="refundReason" class="field" placeholder="e.g. Customer request" /></div>
        <template #footer><button class="btn" @click="refund = false">Cancel</button><button class="btn danger" :disabled="busy" @click="doRefund">{{ busy ? 'Refunding…' : 'Refund' }}</button></template>
      </Modal>
    </template>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'; import { useRoute } from 'vue-router';
import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue'; import CopyText from 'src/components/CopyText.vue'; import SectionCard from 'src/components/SectionCard.vue'; import KpiCard from 'src/components/KpiCard.vue'; import TimelineList from 'src/components/TimelineList.vue';
import { get, post, fail, ok } from 'src/services/api'; import { ghs, dt, channelLabel, toMinor, copy } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth(); const code = useRoute().params.code as string;
const t = ref<any>(null); const events = ref<any[]>([]); const refunds = ref<any[]>([]); const loading = ref(true); const busy = ref(false);
const refund = ref(false); const refundAmount = ref(''); const refundReason = ref('');
async function copyText(v: string) { if (await copy(v)) ok('Copied'); }
async function load() { try { const r = (await get(`/dashboard/transactions/${code}`)).data; t.value = r.transaction; events.value = r.events; refunds.value = r.refunds; } catch (e) { fail(e); } finally { loading.value = false; } }
async function verify() { busy.value = true; try { await post(`/dashboard/transactions/${code}/verify`); await load(); ok('Checked'); } catch (e) { fail(e); } finally { busy.value = false; } }
async function doRefund() {
  busy.value = true;
  try { await post('/dashboard/refunds', { transaction: t.value.id, amount: refundAmount.value ? toMinor(refundAmount.value) : undefined, reason: refundReason.value || undefined }); refund.value = false; ok('Refund submitted'); await load(); }
  catch (e) { fail(e); } finally { busy.value = false; }
}
onMounted(load);
</script>
<style scoped>
.head { display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: 18px 22px; flex-wrap: wrap; }
.head-icon { width: 80px; height: 80px; border-radius: 20px; background: rgb(var(--brand) / 0.12); color: rgb(var(--brand)); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.who { display: flex; gap: 12px; align-items: flex-start; min-width: 0; }
.avatar { width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; } .avatar.plain { background: rgb(var(--sunken)); color: rgb(var(--muted)); }
.pill { display: inline-flex; align-items: center; gap: 7px; height: 28px; padding: 0 12px; border-radius: 999px; font-weight: 600; font-size: 13px; } .pill .d { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.pill.live { background: rgb(var(--ok) / 0.12); color: rgb(var(--ok)); } .pill.test { background: rgb(var(--warn) / 0.14); color: rgb(var(--warn)); }
</style>
