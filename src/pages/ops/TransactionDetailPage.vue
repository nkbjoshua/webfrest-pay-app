<template>
  <div>
    <div class="flex justify-end -mt-1 mb-3"><router-link to="/ops/transactions" class="text-[13.5px] font-semibold inline-flex items-center gap-1.5 text-muted"><q-icon name="arrow_back" size="17px" />Back to transactions</router-link></div>
    <div v-if="loading" class="skeleton" style="height: 300px"></div>
    <template v-else-if="t">
      <div class="card head">
        <div class="flex items-center gap-4 min-w-0">
          <span class="head-icon"><q-icon name="swap_horiz" size="34px" /></span>
          <div class="min-w-0">
            <div class="text-[13.5px] text-muted">Transaction</div>
            <div class="flex items-center gap-2"><span class="text-[30px] font-extrabold leading-tight nowrap">{{ ghs(t.chargeAmount) }}</span><button class="icon-btn" title="Copy amount" @click="copyText(String(t.chargeAmount / 100))"><q-icon name="content_copy" size="17px" /></button></div>
            <div class="text-[13px] text-muted truncate">{{ t.reference }} · <span class="mono">{{ t.id }}</span></div>
            <div class="flex gap-2 mt-2"><span class="pill" :class="t.mode === 'live' ? 'live' : 'test'"><span class="d"></span>{{ t.mode === 'live' ? 'Live' : 'Test' }}</span><StatusBadge :status="t.status" /></div>
          </div>
        </div>
        <div class="head-people">
          <div class="who"><span class="avatar" :style="{ background: tint(t.merchant) }">{{ (t.merchant || '?')[0] }}</span><div class="min-w-0"><div class="font-semibold truncate">{{ t.merchant }}</div><div class="text-[12px] text-muted">Merchant<span v-if="t.subaccount"> · school <span class="mono">{{ t.subaccount }}</span></span></div></div></div>
          <div class="who"><span class="avatar plain"><q-icon name="person_outline" size="20px" /></span><div class="min-w-0"><div class="font-semibold truncate">{{ t.customer.name || 'Customer' }}</div><div class="text-[12px] text-muted">Customer</div><div class="text-[12px] text-muted truncate">{{ t.customer.email }}</div><div class="text-[12px] text-muted">{{ t.customer.phone }}</div></div></div>
        </div>
        <div class="flex gap-2.5 items-start">
          <button class="btn ok" @click="copyText(t.reference)"><q-icon name="content_copy" />Copy reference</button>
          <button class="btn"><q-icon name="more_horiz" />More<q-icon name="expand_more" size="18px" />
            <q-menu anchor="bottom right" self="top right" :offset="[0, 6]"><q-list style="min-width: 230px">
              <q-item v-if="auth.opsDecider && ['pending', 'processing', 'failed', 'abandoned'].includes(t.status)" v-close-popup clickable :disable="busy" @click="verify"><q-item-section avatar><q-icon name="sync" /></q-item-section><q-item-section>Re-check with provider</q-item-section></q-item>
              <q-item v-close-popup clickable @click="copyText(t.id)"><q-item-section avatar><q-icon name="tag" /></q-item-section><q-item-section>Copy transaction ID</q-item-section></q-item>
              <q-item v-if="t.providerReference" v-close-popup clickable @click="copyText(t.providerReference)"><q-item-section avatar><q-icon name="link" /></q-item-section><q-item-section>Copy bank reference</q-item-section></q-item>
              <q-item v-if="t.merchantId" v-close-popup clickable @click="$router.push(`/ops/merchants/${t.merchantId}`)"><q-item-section avatar><q-icon name="storefront" /></q-item-section><q-item-section>Open merchant</q-item-section></q-item>
            </q-list></q-menu></button>
        </div>
      </div>

      <div v-if="t.riskFlagged || flags.length" class="mt-4 card card-pad" style="border-color: rgb(var(--warn) / 0.5)"><b>Risk flags</b><div v-for="f in flags" :key="f.id" class="text-[13.5px] mt-1">• {{ f.detail }} <span class="text-muted">({{ f.action }}{{ f.resolved ? ', reviewed' : '' }})</span></div></div>

      <div class="grid gap-4 mt-4" style="grid-template-columns: repeat(auto-fit, minmax(230px, 1fr))">
        <KpiCard compact icon="account_balance_wallet" tone="green" label="Payment amount" :value="ghs(t.amount)" />
        <KpiCard compact icon="savings" tone="blue" label="Processing fee" :value="ghs(t.fees)" />
        <KpiCard compact icon="percent" tone="orange" label="Commission" :value="ghs(t.commission)" />
        <KpiCard compact icon="north_east" tone="green" label="Net to receiver" :value="ghs(t.receiverNet)" />
      </div>

      <div class="grid gap-4 mt-4 max-lg:!grid-cols-1" style="grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr)">
        <div class="grid gap-4 content-start">
          <SectionCard icon="description" title="Details">
            <dl class="rows">
              <div class="row"><dt>Transaction</dt><dd><CopyText :text="t.id" /></dd></div>
              <div class="row"><dt>Merchant</dt><dd>{{ t.merchant }}<span v-if="t.subaccount" class="text-muted"> → <span class="mono">{{ t.subaccount }}</span></span></dd></div>
              <div class="row"><dt>Customer</dt><dd>{{ t.customer.name || '-' }}<div class="text-muted text-[12.5px]">{{ t.customer.email }} {{ t.customer.phone }}</div></dd></div>
              <div class="row"><dt>Method</dt><dd>{{ channelLabel(t.channel) }}<span v-if="t.network"> · {{ t.network }}</span></dd></div>
              <div class="row"><dt>Provider</dt><dd>{{ t.provider || '-' }}<span v-if="t.providerReference" class="mono text-muted"> · {{ t.providerReference }}</span></dd></div>
              <div class="row"><dt>Description</dt><dd>{{ t.description || '-' }}</dd></div>
              <div class="row"><dt>Created</dt><dd>{{ dt(t.createdAt) }}</dd></div>
              <div class="row"><dt>Paid</dt><dd>{{ t.paidAt ? dt(t.paidAt) : '-' }}</dd></div>
              <div class="row"><dt>Clears</dt><dd>{{ t.clearedAt ? 'Cleared ' + dt(t.clearedAt) : t.clearsAt ? dt(t.clearsAt) : '-' }}</dd></div>
              <div v-if="t.failureReason" class="row"><dt>Failure</dt><dd style="color: rgb(var(--bad))">{{ t.failureReason }}</dd></div>
            </dl>
          </SectionCard>
          <SectionCard icon="menu_book" title="Ledger entries">
            <div v-if="!ledger.length" class="text-muted text-[14px] py-2">Nothing posted - the payment hasn't succeeded.</div>
            <div v-else class="tbl-wrap"><table class="tbl"><thead><tr><th>Journal</th><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>
              <tr v-for="(e, i) in ledger" :key="i"><td>{{ e.journal }}</td><td>{{ e.account }} <span class="text-muted text-[12px]">({{ e.owner }})</span></td><td class="num">{{ e.debit ? ghs(e.debit) : '-' }}</td><td class="num">{{ e.credit ? ghs(e.credit) : '-' }}</td></tr></tbody></table></div>
          </SectionCard>
          <SectionCard icon="link" title="Provider events">
            <div v-if="!provEvents.length" class="text-center py-6"><span class="empty-ic"><q-icon name="description" size="26px" /></span><div class="font-semibold mt-3">No callbacks received</div><div class="text-[13px] text-muted">No provider events or callbacks for this transaction yet.</div></div>
            <details v-for="e in provEvents" :key="e.id" class="py-2 hairline first:border-0"><summary class="cursor-pointer text-[13.5px]"><b>{{ e.providerCode }}</b> {{ e.eventType }} · {{ dt(e.at) }} <StatusBadge :status="e.signatureValid ? (e.processed ? 'Processed' : 'Pending') : 'Rejected'" :text="e.signatureValid ? (e.error ? 'Error' : e.processed ? 'Processed' : 'Pending') : 'Bad signature'" /></summary><div v-if="e.error" class="text-[12.5px] mt-1" style="color: rgb(var(--bad))">{{ e.error }}</div><div class="code-block mt-2">{{ pretty(e.payload) }}</div></details>
          </SectionCard>
        </div>
        <div class="grid gap-4 content-start">
          <SectionCard icon="payments" title="Money">
            <dl class="rows end"><div class="row"><dt>Payment amount</dt><dd>{{ ghs(t.amount) }}</dd></div><div class="row"><dt>Processing fee</dt><dd>{{ ghs(t.fees) }}</dd></div><div class="row"><dt>Commission</dt><dd>{{ ghs(t.commission) }}</dd></div>
              <div class="row"><dt>Fee paid by</dt><dd>{{ t.feeBearer }}</dd></div><div v-if="t.providerFee != null" class="row"><dt>Bank's fee</dt><dd>{{ ghs(t.providerFee) }}</dd></div><div class="row"><dt>Net to receiver</dt><dd><b>{{ ghs(t.receiverNet) }}</b></dd></div>
              <div v-if="t.refunded" class="row"><dt>Refunded</dt><dd>{{ ghs(t.refunded) }}</dd></div></dl>
          </SectionCard>
          <SectionCard icon="schedule" title="Timeline"><TimelineList :events="events" /></SectionCard>
          <SectionCard v-if="refunds.length" icon="undo" title="Refunds">
            <div v-for="r in refunds" :key="r.id" class="flex items-center justify-between gap-3 py-2.5 hairline first:border-0 text-[14px]"><span>{{ ghs(r.amount) }} · {{ r.reason || 'No reason' }}<span class="mono text-muted" style="font-size: 11.5px"> · {{ r.id }}</span></span><StatusBadge :status="r.status" /></div>
          </SectionCard>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'; import { useRoute } from 'vue-router';
import StatusBadge from 'src/components/StatusBadge.vue'; import CopyText from 'src/components/CopyText.vue'; import SectionCard from 'src/components/SectionCard.vue'; import KpiCard from 'src/components/KpiCard.vue'; import TimelineList from 'src/components/TimelineList.vue';
import { get, post, fail, ok } from 'src/services/api'; import { ghs, dt, channelLabel, copy } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth(); const code = useRoute().params.code as string;
const t = ref<any>(null); const events = ref<any[]>([]); const provEvents = ref<any[]>([]); const flags = ref<any[]>([]); const refunds = ref<any[]>([]); const ledger = ref<any[]>([]); const loading = ref(true); const busy = ref(false);
const pretty = (s: string) => { try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; } };
const tint = (s?: string) => { const h = [...(s || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) % 4; return ['linear-gradient(135deg,#065f46,#10b981)', 'linear-gradient(135deg,#0f172a,#334155)', 'linear-gradient(135deg,#047857,#34d399)', 'linear-gradient(135deg,#1e3a5f,#3b82f6)'][h]; };
async function copyText(v: string) { if (await copy(v)) ok('Copied'); }
async function load() { try { const r = (await get(`/ops/transactions/${code}`)).data; t.value = r.transaction; events.value = r.events; provEvents.value = r.providerEvents; flags.value = r.flags; refunds.value = r.refunds; ledger.value = r.ledger; } catch (e) { fail(e); } finally { loading.value = false; } }
async function verify() { busy.value = true; try { await post(`/ops/transactions/${t.value.id}/verify`); ok('Checked'); load(); } catch (e) { fail(e); } finally { busy.value = false; } }
onMounted(load);
</script>
<style scoped>
.head { display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: 18px 22px; flex-wrap: wrap; }
.head-icon { width: 80px; height: 80px; border-radius: 20px; background: rgb(var(--brand) / 0.12); color: rgb(var(--brand)); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.head-people { display: flex; gap: 36px; flex-wrap: wrap; }
.who { display: flex; gap: 12px; align-items: flex-start; min-width: 0; }
.avatar { width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; flex-shrink: 0; } .avatar.plain { background: rgb(var(--sunken)); color: rgb(var(--muted)); }
.pill { display: inline-flex; align-items: center; gap: 7px; height: 28px; padding: 0 12px; border-radius: 999px; font-weight: 600; font-size: 13px; } .pill .d { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.pill.live { background: rgb(var(--ok) / 0.12); color: rgb(var(--ok)); } .pill.test { background: rgb(var(--warn) / 0.14); color: rgb(var(--warn)); }
.icon-btn { border: 0; background: none; color: rgb(var(--muted)); cursor: pointer; padding: 4px; border-radius: 6px; } .icon-btn:hover { background: rgb(var(--sunken)); }
.empty-ic { width: 52px; height: 52px; border-radius: 50%; background: rgb(var(--brand) / 0.12); color: rgb(var(--brand)); display: inline-flex; align-items: center; justify-content: center; }
</style>
