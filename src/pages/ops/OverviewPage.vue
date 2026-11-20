<template>
  <div>
    <PageHeader title="Operations overview" subtitle="Live mode, across all merchants." />
    <div v-if="loading && !d" class="grid-stats"><div v-for="n in 4" :key="n" class="skeleton" style="height: 110px"></div></div>
    <template v-else-if="d">
      <div v-if="d.liveRoute?.provider === 'simulator'" class="mb-5 card card-pad flex items-center gap-3" style="border-color: rgb(var(--warn) / 0.6); background: rgb(var(--warn) / 0.08)">
        <q-icon name="warning" size="26px" style="color: rgb(var(--warn))" /><div class="flex-1"><b>Live payments are going to the Simulator.</b> No real money moves. Switch to a real provider when you're ready.</div><router-link to="/ops/providers" class="btn s-sm">Providers</router-link>
      </div>
      <div v-if="gl" class="card card-pad mb-6">
        <div class="flex flex-wrap items-center gap-3 cursor-pointer" @click="glOpen = !glOpen">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" :style="{ background: gl.ready ? 'rgb(var(--ok) / 0.14)' : 'rgb(var(--warn) / 0.14)' }"><q-icon :name="gl.ready ? 'rocket_launch' : 'checklist'" size="24px" :style="{ color: gl.ready ? 'rgb(var(--ok))' : 'rgb(var(--warn))' }" /></div>
          <div class="flex-1 min-w-[200px]"><div class="font-bold text-[16px]">{{ gl.ready ? 'Ready for live payments' : 'Go-live checklist' }}</div><div class="text-[13px] text-muted">{{ gl.passed }} of {{ gl.total }} required checks passed</div></div>
          <div class="w-40 h-2 rounded-full bg-sunken overflow-hidden max-sm:hidden"><div class="h-full rounded-full" :style="{ width: (100 * gl.passed / Math.max(1, gl.total)) + '%', background: 'linear-gradient(90deg, rgb(var(--brand)), rgb(var(--cyan)))' }"></div></div>
          <q-icon :name="glOpen ? 'expand_less' : 'expand_more'" size="22px" class="text-muted" />
        </div>
        <div v-if="glOpen" class="mt-4">
          <div v-for="g in glGroups" :key="g.name" class="mb-3">
            <div class="text-[11.5px] font-bold uppercase tracking-wide text-muted mb-1">{{ g.name }}</div>
            <div v-for="c in g.items" :key="c.label" class="flex items-start gap-3 py-2 hairline first:border-0">
              <q-icon :name="c.ok ? 'check_circle' : c.severity === 'required' ? 'cancel' : 'error_outline'" size="20px" class="mt-0.5" :style="{ color: c.ok ? 'rgb(var(--ok))' : c.severity === 'required' ? 'rgb(var(--bad))' : 'rgb(var(--warn))' }" />
              <div class="flex-1 min-w-0"><div class="text-[14px] font-semibold">{{ c.label }}<span v-if="c.severity !== 'required'" class="text-muted font-normal"> · recommended</span></div><div class="text-[12.5px] text-muted">{{ c.detail }}</div></div>
              <router-link v-if="c.link && !c.ok" :to="c.link" class="btn s-sm">Fix</router-link>
            </div>
          </div>
        </div>
      </div>

      <div class="grid-stats mb-6">
        <div class="balance-card"><div class="text-[13px] opacity-80">Volume · 30 days</div><div class="text-[28px] font-extrabold mt-1.5">{{ ghs(d.volume30) }}</div><div class="text-[12.5px] opacity-75 mt-1">Today {{ ghs(d.volumeToday) }}</div></div>
        <div class="balance-card alt"><div class="text-[13px] opacity-80">Webfrest revenue · 30 days</div><div class="text-[28px] font-extrabold mt-1.5">{{ ghs(d.revenue30) }}</div><div class="text-[12.5px] opacity-75 mt-1">Processing + payout fees</div></div>
        <div class="balance-card mint"><div class="text-[13px] opacity-80">Owed to merchants</div><div class="text-[28px] font-extrabold mt-1.5">{{ ghs(owed) }}</div><div class="text-[12.5px] opacity-75 mt-1">Pending + available balances</div></div>
      </div>

      <div class="grid-stats mb-6">
        <router-link to="/ops/merchants?status=Pending" class="no-underline"><StatCard label="Merchants to review" :value="d.queues.merchantsPending" icon="storefront" hint="Awaiting approval" /></router-link>
        <router-link to="/ops/bank-accounts" class="no-underline"><StatCard label="Bank accounts" :value="d.queues.bankAccountsPending" icon="account_balance_wallet" hint="Awaiting verification" /></router-link>
        <router-link to="/ops/payouts" class="no-underline"><StatCard label="Payouts to approve" :value="d.queues.payoutsAwaitingOps" icon="payments" hint="Waiting for Ops" /></router-link>
        <router-link to="/ops/risk" class="no-underline"><StatCard label="Risk flags" :value="d.queues.riskFlagsOpen" icon="shield" hint="Open for review" /></router-link>
      </div>

      <div class="grid gap-6 max-lg:!grid-cols-1" style="grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr)">
        <div class="card card-pad"><div class="font-bold mb-3">Live collections - last 14 days</div><BarChart :data="d.series" /></div>
        <div class="card card-pad">
          <div class="font-bold mb-3">Providers</div>
          <div v-for="p in d.providers" :key="p.code" class="flex items-center gap-3 py-2.5 hairline first:border-0">
            <div class="flex-1"><div class="font-semibold text-[14px]">{{ p.name }}<span v-if="d.liveRoute?.provider === p.code" class="chip ml-2">Live default</span></div><div class="text-[12.5px] text-muted">{{ p.status }}</div></div>
            <StatusBadge :status="p.healthStatus" />
          </div>
          <router-link to="/ops/providers" class="btn block mt-4">Manage providers & routing</router-link>
        </div>
      </div>
      <div class="card card-pad mt-6">
        <div class="font-bold mb-3">Ledger (live) <span v-if="ledger" class="badge ml-2" :class="ledger.balanced ? 'ok' : 'bad'">{{ ledger.balanced ? 'Balanced' : 'OUT OF BALANCE' }}</span></div>
        <div class="grid-stats">
          <div v-for="(v, k) in d.platformLedger" :key="k"><div class="text-[12.5px] text-muted font-semibold uppercase tracking-wide">{{ LABEL[k as string] || k }}</div><div class="text-[20px] font-bold mt-1">{{ ghs(v as number) }}</div></div>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import StatCard from 'src/components/StatCard.vue'; import BarChart from 'src/components/BarChart.vue'; import StatusBadge from 'src/components/StatusBadge.vue';
import { get, fail } from 'src/services/api'; import { ghs } from 'src/utils/format';
const LABEL: Record<string, string> = { Collection: 'Held at the bank', FeeRevenue: 'Fee revenue', PayoutsInTransit: 'Payouts in transit' };
const d = ref<any>(null); const gl = ref<any>(null); const glOpen = ref(false);
const glGroups = computed(() => { const m = new Map<string, any[]>(); for (const c of gl.value?.checks || []) { if (!m.has(c.group)) m.set(c.group, []); m.get(c.group)!.push(c); } return [...m].map(([name, items]) => ({ name, items })); }); const ledger = ref<any>(null); const loading = ref(true); const owed = ref(0);
onMounted(async () => {
  try { gl.value = (await get('/ops/go-live')).data; glOpen.value = !gl.value.ready; } catch { /* the rest of the page still works */ }
  try { d.value = (await get('/ops/overview')).data; ledger.value = (await get('/ops/ledger', { mode: 'live' })).data; owed.value = (ledger.value.merchantsOwed || []).filter((x: any) => x.type === 'Pending' || x.type === 'Available').reduce((a: number, x: any) => a + x.balance, 0); }
  catch (e) { fail(e); } finally { loading.value = false; }
});
</script>
