<template>
  <div>
    <PageHeader :title="`Hello, ${first}`" :subtitle="d ? `${d.merchant.name} · ${mode.mode} mode` : ''">
      <router-link v-if="auth.merchant?.type !== 'Subaccount'" to="/dashboard/links" class="btn primary"><q-icon name="add_link" />New payment link</router-link>
      <router-link v-else to="/dashboard/payouts" class="btn primary"><q-icon name="north_east" />Request payout</router-link>
    </PageHeader>

    <div v-if="loading && !d" class="grid-stats"><div v-for="n in 4" :key="n" class="skeleton" style="height: 120px"></div></div>
    <template v-else-if="d">
      <div v-if="d.pendingApprovals" class="mb-5 card card-pad flex items-center gap-3" style="border-color: rgb(var(--warn) / 0.5)">
        <q-icon name="pending_actions" size="26px" style="color: rgb(var(--warn))" />
        <div class="flex-1"><b>{{ d.pendingApprovals }} payout{{ d.pendingApprovals > 1 ? 's' : '' }} waiting for your approval.</b></div>
        <router-link to="/dashboard/payouts" class="btn s-sm">Review</router-link>
      </div>

      <div class="grid-stats mb-6" v-if="d.balance">
        <div class="balance-card"><div class="text-[13px] opacity-80">Available balance</div><div class="text-[30px] font-extrabold mt-1.5 tracking-tight">{{ ghs(d.balance.available) }}</div><div class="text-[12.5px] opacity-75 mt-1">Ready to pay out</div></div>
        <div class="balance-card alt"><div class="text-[13px] opacity-80">Pending clearance</div><div class="text-[30px] font-extrabold mt-1.5 tracking-tight">{{ ghs(d.balance.pending) }}</div><div class="text-[12.5px] opacity-75 mt-1">Settles after the clearing period</div></div>
        <div v-if="d.platformOwed" class="balance-card mint"><div class="text-[13px] opacity-80">Held for subaccounts</div><div class="text-[30px] font-extrabold mt-1.5 tracking-tight">{{ ghs(d.platformOwed.available + d.platformOwed.pending) }}</div><div class="text-[12.5px] opacity-75 mt-1">Across {{ d.platformOwed.subaccounts }} subaccount{{ d.platformOwed.subaccounts === 1 ? '' : 's' }}</div></div>
      </div>

      <div class="grid-stats mb-6">
        <StatCard label="Today" :value="ghs(d.stats.volumeToday)" icon="today" hint="Collected so far today" />
        <StatCard label="Last 30 days" :value="ghs(d.stats.volume30)" icon="trending_up" :hint="`${d.stats.paidCount30} successful payments`" />
        <StatCard label="Success rate" :value="d.stats.successRate == null ? '-' : d.stats.successRate + '%'" icon="verified" hint="Last 30 days" />
        <StatCard label="Open payments" :value="d.stats.openPayments" icon="hourglass_empty" hint="Waiting for the payer" />
      </div>

      <div class="grid gap-6" style="grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr)" :class="{ 'max-lg:!grid-cols-1': true }">
        <div class="card card-pad"><div class="font-bold mb-3">Collections - last 14 days</div><BarChart :data="d.series" /></div>
        <div v-if="auth.merchant?.type === 'Subaccount'" class="card card-pad">
          <div class="font-bold mb-3">Your money</div>
          <ul class="grid gap-3 text-[14px]">
            <li class="flex gap-3"><q-icon name="payments" class="text-brand" /><span>Fees paid online land here, then clear to <b>Available</b> after the settlement period.</span></li>
            <li class="flex gap-3"><q-icon name="account_balance" class="text-brand" /><span>Add your <router-link to="/dashboard/settings">bank account</router-link>; Webfrest verifies it before the first payout.</span></li>
            <li class="flex gap-3"><q-icon name="north_east" class="text-brand" /><span><router-link to="/dashboard/payouts">Request a payout</router-link> any time. Webfrest approves it, then it's sent to your bank.</span></li>
            <li class="flex gap-3"><q-icon name="group" class="text-brand" /><span>Add colleagues under <router-link to="/dashboard/team">Team</router-link>.</span></li>
          </ul>
        </div>
        <div v-else class="card card-pad">
          <div class="font-bold mb-3">Get started</div>
          <ul class="grid gap-3 text-[14px]">
            <li class="flex gap-3"><q-icon name="key" class="text-brand" /><span>Create a <router-link to="/dashboard/api-keys">secret key</router-link> and call <span class="mono">POST /v1/transactions/initialize</span>.</span></li>
            <li class="flex gap-3"><q-icon name="link" class="text-brand" /><span>Or share a <router-link to="/dashboard/links">payment link</router-link> - no code needed.</span></li>
            <li class="flex gap-3"><q-icon name="webhook" class="text-brand" /><span>Add a <router-link to="/dashboard/webhooks">webhook</router-link> so your system hears about every payment.</span></li>
            <li class="flex gap-3"><q-icon name="account_balance" class="text-brand" /><span>Add your <router-link to="/dashboard/settings">bank account</router-link> to receive payouts.</span></li>
          </ul>
        </div>
      </div>

      <div class="mt-6">
        <div class="flex items-center justify-between mb-3"><h2 class="text-[17px] font-bold">Recent transactions</h2><router-link to="/dashboard/transactions" class="text-[13.5px] font-semibold">View all</router-link></div>
        <DataTable :columns="cols" :rows="d.recent" clickable empty-title="No payments yet" empty-text="They'll appear here the moment someone pays." @row="(r: any) => $router.push(`/dashboard/transactions/${r.id}`)">
          <template #cell-amount="{ row }"><b>{{ ghs(row.chargeAmount) }}</b></template>
          <template #cell-customer="{ row }">{{ row.customer.name || row.customer.email || '-' }}</template>
          <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
          <template #cell-createdAt="{ row }">{{ ago(row.createdAt) }}</template>
        </DataTable>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import StatCard from 'src/components/StatCard.vue'; import BarChart from 'src/components/BarChart.vue';
import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue';
import { get, fail } from 'src/services/api'; import { ghs, ago } from 'src/utils/format';
import { useAuth } from 'src/stores/auth'; import { useMode } from 'src/stores/mode';
const auth = useAuth(); const mode = useMode();
const d = ref<any>(null); const loading = ref(true);
const first = computed(() => (auth.user?.name || '').split(' ')[0]);
const cols = [{ key: 'reference', label: 'Reference' }, { key: 'customer', label: 'Customer' }, { key: 'amount', label: 'Amount', num: true }, { key: 'status', label: 'Status' }, { key: 'createdAt', label: 'When' }];
async function load() { loading.value = true; try { d.value = (await get('/dashboard/overview')).data; } catch (e) { fail(e); } finally { loading.value = false; } }
onMounted(load); watch(() => mode.tick, load);
</script>
