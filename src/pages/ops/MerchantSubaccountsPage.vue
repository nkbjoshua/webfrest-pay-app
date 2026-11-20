<template>
  <div>
    <router-link :to="`/ops/merchants/${id}`" class="text-[13.5px] font-semibold inline-flex items-center gap-1 mb-3"><q-icon name="arrow_back" size="16px" />{{ parent?.name || 'Merchant' }}</router-link>
    <PageHeader :title="`${parent?.name || 'Merchant'} · Subaccounts`" subtitle="The schools (or businesses) this platform collects for. Each has its own balance, bank account and payouts.">
      <router-link v-if="parent" :to="`/ops/merchants/${id}`" class="btn"><q-icon name="storefront" />Platform details</router-link>
    </PageHeader>
    <div class="grid-stats mb-5">
      <div class="card card-pad"><div class="text-[12.5px] text-muted">Subaccounts</div><div class="text-[22px] font-extrabold">{{ total }}</div></div>
      <div class="card card-pad"><div class="text-[12.5px] text-muted">Held on this page (live)</div><div class="text-[22px] font-extrabold">{{ ghs(sum('available')) }}</div><div class="text-[12px] text-muted">{{ ghs(sum('pending')) }} still clearing</div></div>
      <div class="card card-pad"><div class="text-[12.5px] text-muted">Paid in, last 30 days (this page)</div><div class="text-[22px] font-extrabold">{{ ghs(rows.reduce((n: number, r: any) => n + r.activity.volume30, 0)) }}</div></div>
      <div class="card card-pad"><div class="text-[12.5px] text-muted">Bank accounts waiting</div><div class="text-[22px] font-extrabold">{{ rows.filter((r: any) => r.bank?.status === 'PendingVerification').length }}</div></div>
    </div>
    <DataTable :columns="cols" :rows="rows" :loading="loading" :total="total" :page="page" :per-page="perPage" clickable empty-title="No subaccounts yet" empty-text="Schools appear here as the platform creates them." empty-icon="hub" @update:page="page = $event" @row="(r: any) => $router.push(`/ops/merchants/${r.id}`)">
      <template #toolbar>
        <input v-model="filters.q" class="field s-sm" style="max-width: 280px" placeholder="Search school, email, code or reference…" aria-label="Search" />
        <select v-model="filters.status" class="field s-sm" style="max-width: 170px" aria-label="Status"><option value="">All statuses</option><option>Pending</option><option>Active</option><option>Rejected</option><option>Suspended</option></select>
      </template>
      <template #cell-name="{ row }"><div class="font-semibold">{{ row.name }}</div><div class="text-[12.5px] text-muted">{{ row.email }}<span v-if="row.phone"> · {{ row.phone }}</span></div><div class="mono text-muted" style="font-size: 11.5px">{{ row.code }}<span v-if="row.externalRef"> · ref {{ row.externalRef }}</span></div></template>
      <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
      <template #cell-bank="{ row }"><template v-if="row.bank"><div>{{ row.bank.bank }} ····{{ row.bank.last4 }}</div><div class="text-[12px] text-muted">{{ row.bank.accountName }}</div><StatusBadge :status="row.bank.status" class="mt-1" /></template><span v-else class="text-muted">No bank account</span></template>
      <template #cell-settlement="{ row }"><div>{{ row.settlementMode === 'Auto' ? 'Daily' : row.settlementMode }}</div><div class="text-[12px] text-muted">{{ row.payoutApprovalMode === 'Ops' ? 'Ops approves' : row.payoutApprovalMode === 'Both' ? 'Merchant + Ops' : 'Merchant approves' }}</div></template>
      <template #cell-balance="{ row }"><b>{{ ghs(row.balance.available) }}</b><div class="text-[12px] text-muted">{{ ghs(row.balance.pending) }} clearing</div></template>
      <template #cell-activity="{ row }"><div>{{ ghs(row.activity.volume30) }}</div><div class="text-[12px] text-muted">{{ row.activity.last30 }} payment{{ row.activity.last30 === 1 ? '' : 's' }} · {{ row.activity.total }} all-time<span v-if="row.activity.lastPaidAt"> · last {{ ago(row.activity.lastPaidAt) }}</span></div></template>
      <template #cell-createdAt="{ row }">{{ day(row.createdAt) }}</template>
    </DataTable>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'; import { useRoute } from 'vue-router';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue';
import { useList } from 'src/composables/useList'; import { get } from 'src/services/api'; import { ghs, day, ago } from 'src/utils/format';
const route = useRoute(); const id = route.params.id as string; const parent = ref<any>(null);
const cols = [{ key: 'name', label: 'School' }, { key: 'status', label: 'Status' }, { key: 'bank', label: 'Bank account' }, { key: 'settlement', label: 'Settlement' }, { key: 'balance', label: 'Balance (live)', num: true }, { key: 'activity', label: 'Last 30 days' }, { key: 'createdAt', label: 'Joined' }];
const { filters, rows, total, page, perPage, loading } = useList(`/ops/merchants/${id}/subaccounts`, { q: '', status: '' }, { modeAware: false });
const sum = (k: 'available' | 'pending') => rows.value.reduce((n: number, r: any) => n + (r.balance?.[k] || 0), 0);
onMounted(async () => { try { parent.value = (await get(`/ops/merchants/${id}`)).data.merchant; } catch { /* the list reports errors */ } });
</script>
