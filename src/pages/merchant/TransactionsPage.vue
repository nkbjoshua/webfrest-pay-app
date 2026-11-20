<template>
  <div>
    <PageHeader title="Transactions" subtitle="Every payment attempt, newest first. Click one for the full picture.">
      <DateRangeMenu v-model="range" @preset="preset = $event" />
      <button v-if="auth.canSeeMoney" class="btn primary s-lg" :disabled="exporting" @click="exportCsv"><q-icon name="download" />{{ exporting ? 'Preparing…' : 'Export' }}</button>
    </PageHeader>

    <div v-if="auth.canSeeMoney" class="grid gap-4 mb-5" style="grid-template-columns: repeat(auto-fit, minmax(235px, 1fr))">
      <KpiCard icon="swap_horiz" tone="green" label="Total transactions" :value="num(cur.total)" :delta="delta(cur.total, prev?.total)" :delta-label="vs" />
      <KpiCard icon="check_circle_outline" tone="green" label="Successful" :value="num(cur.successful)" :delta="delta(cur.successful, prev?.successful)" :delta-label="vs" />
      <KpiCard icon="schedule" tone="orange" label="Pending payout" :value="num(cur.pendingPayout)" :delta="delta(cur.pendingPayout, prev?.pendingPayout)" :delta-label="vs" lower-is-better />
      <KpiCard icon="savings" tone="blue" label="Total fees" :value="ghs(cur.fees)" :delta="delta(cur.fees, prev?.fees)" :delta-label="vs" />
    </div>

    <DataTable :columns="cols" :rows="rows" :loading="loading" :total="total" :page="page" :per-page="perPage" :sort="sort" :dir="dir" :page-sizes="[10, 25, 50, 100]" noun="transactions" clickable empty-title="No transactions found" empty-text="Nothing matches these filters. Try a wider date range, or create a payment link to get your first payment." empty-icon="receipt_long"
      @update:page="page = $event" @update:per-page="perPage = $event" @update:sort="setSort" @row="openDetails">
      <template #toolbar>
        <div class="filters-row">
          <div class="fld-icon" style="flex: 1 1 230px; max-width: 290px"><q-icon name="search" size="19px" /><input v-model="filters.q" class="field" placeholder="Reference, email, name…" aria-label="Search" /></div>
          <div v-if="auth.canSeeMoney" class="fld-icon" style="flex: 1 1 250px; max-width: 300px"><q-icon name="account_balance_wallet" size="19px" /><input v-model="filters.account" class="field" inputmode="numeric" placeholder="Account or wallet no. (or last 4)" aria-label="Account or wallet number" title="A payer's wallet number, or the account the money is paid out to. Full number or just the last 4 digits." /></div>
          <div v-if="isPlatform" class="fld-icon" style="flex: 1 1 200px; max-width: 250px"><q-icon name="school" size="19px" /><input v-model="filters.subaccountName" class="field" placeholder="School…" aria-label="School" /></div>
          <select v-model="filters.status" class="field" style="width: 150px" aria-label="Status"><option value="">All statuses</option><option v-for="s in statuses" :key="s" :value="s">{{ s }}</option></select>
          <button class="btn" @click="more = !more"><q-icon name="tune" />More filters<span v-if="activeMore" class="count-dot">{{ activeMore }}</span></button>
          <button v-if="activeAny" class="btn ghost" @click="clear">Clear</button>
        </div>
        <div v-if="more" class="filters-more">
          <select v-model="filters.channel" class="field s-sm" aria-label="Method"><option value="">Any method</option><option value="momo">Mobile money</option><option value="card">Card</option><option value="bank">Bank transfer</option></select>
          <select v-model="filters.network" class="field s-sm" aria-label="Network"><option value="">Any network</option><option>MTN</option><option>TELECEL</option><option>AIRTELTIGO</option></select>
          <select v-if="auth.canSeeMoney" v-model="filters.settled" class="field s-sm" aria-label="Paid out"><option value="">Paid out or not</option><option value="yes">Already paid out</option><option value="no">Not paid out yet</option></select>
          <input v-model="filters.minAmount" class="field s-sm" inputmode="decimal" placeholder="Min amount (GHS)" aria-label="Minimum amount" />
          <input v-model="filters.maxAmount" class="field s-sm" inputmode="decimal" placeholder="Max amount (GHS)" aria-label="Maximum amount" />
        </div>
      </template>
      <template #cell-reference="{ row }"><div class="font-semibold">{{ row.reference }}</div><div class="idbox"><CopyText :text="row.id" class="id-copy" /></div></template>
      <template #cell-customer="{ row }"><div>{{ row.customer.name || row.customer.email || '-' }}</div>
        <Reveal v-if="row.customer.hasPhone" :masked="row.customer.phone" :enabled="auth.canSeeMoney" :load="() => reveal(row.id).then((r) => r.payerPhone)" />
        <div v-if="row.customer.name && row.customer.email" class="text-[12px] text-muted">{{ row.customer.email }}</div></template>
      <template #cell-channel="{ row }">{{ channelLabel(row.channel) }}<div v-if="row.network" class="text-[12px] text-muted">{{ row.network }}</div></template>
      <template #cell-subaccount="{ row }"><div class="flex items-center gap-2.5"><template v-if="row.subaccount"><span class="avatar">S</span><span class="mono">{{ row.subaccount }}</span></template><span v-else class="text-muted">-</span></div></template>
      <template #cell-receiver="{ row }"><template v-if="row.receiver"><div class="flex items-center gap-1.5 text-[12.5px]"><q-icon name="account_balance" size="16px" class="text-muted" />{{ row.receiver.bank }}</div><Reveal :masked="`•••• ${row.receiver.last4}`" :enabled="auth.canManage" :load="() => reveal(row.id).then((r) => r.account?.number)" /><div class="text-[12px] text-muted">{{ row.receiver.accountName }}</div></template><span v-else class="text-muted">-</span></template>
      <template #cell-amount="{ row }"><b class="nowrap">{{ ghs(row.chargeAmount) }}</b><div v-if="auth.canSeeMoney" class="text-[12px] text-muted">fee {{ ghs(row.fees) }} · net {{ ghs(row.receiverNet) }}</div></template>
      <template #cell-status="{ row }"><StatusBadge :status="row.status" /><div v-if="auth.canSeeMoney" class="text-[12px] text-muted mt-1">{{ row.payout ? `paid out in ${row.payout}` : (['success', 'partiallyrefunded', 'refunded'].includes(row.status) ? 'not paid out yet' : '') }}</div></template>
      <template #cell-createdAt="{ row }">{{ dt(row.createdAt) }}</template>
      <template #cell-actions="{ row }">
        <button class="btn ghost s-sm" style="padding: 0 6px" aria-label="Actions" @click.stop><q-icon name="more_vert" />
          <q-menu anchor="bottom right" self="top right" :offset="[0, 4]"><q-list style="min-width: 210px">
            <q-item v-close-popup clickable @click="openDetails(row)"><q-item-section avatar><q-icon name="visibility" /></q-item-section><q-item-section>View details</q-item-section></q-item>
            <q-item v-close-popup clickable @click="$router.push(`/dashboard/transactions/${row.id}`)"><q-item-section avatar><q-icon name="open_in_new" /></q-item-section><q-item-section>Open full page</q-item-section></q-item>
            <q-item v-close-popup clickable @click="copyId(row.id)"><q-item-section avatar><q-icon name="content_copy" /></q-item-section><q-item-section>Copy transaction ID</q-item-section></q-item>
            <q-item v-close-popup clickable @click="copyId(row.reference)"><q-item-section avatar><q-icon name="tag" /></q-item-section><q-item-section>Copy your reference</q-item-section></q-item>
          </q-list></q-menu></button>
      </template>
    </DataTable>
    <TxnDetailsModal v-model="det.open" :row="det.row" :reveal="reveal" :can-reveal-payer="auth.canSeeMoney" :can-reveal-account="auth.canManage" full-page="/dashboard/transactions" />
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Reveal from 'src/components/Reveal.vue'; import TxnDetailsModal from 'src/components/TxnDetailsModal.vue';
import KpiCard from 'src/components/KpiCard.vue'; import DateRangeMenu from 'src/components/DateRangeMenu.vue'; import CopyText from 'src/components/CopyText.vue';
import { useList } from 'src/composables/useList'; import { download, get, fail, ok } from 'src/services/api'; import { ghs, dt, channelLabel, copy } from 'src/utils/format'; import { useAuth } from 'src/stores/auth'; import { useMode } from 'src/stores/mode';
const auth = useAuth(); const mode = useMode();
const isPlatform = computed(() => auth.merchant?.type === 'Platform');
const statuses = ['Success', 'Pending', 'Processing', 'Failed', 'Abandoned', 'PartiallyRefunded', 'Refunded'];
const cols = computed(() => [{ key: 'reference', label: 'Reference', sortable: true }, { key: 'customer', label: 'Payer' }, { key: 'channel', label: 'Method', sortable: true },
  ...(isPlatform.value ? [{ key: 'subaccount', label: 'School' }] : []), ...(auth.canSeeMoney ? [{ key: 'receiver', label: 'Paid to' }] : []),
  { key: 'amount', label: 'Amount', num: true, sortable: true }, { key: 'status', label: 'Status', sortable: true }, { key: 'createdAt', label: 'Date', sortable: true }, { key: 'actions', label: '' }]);
// Opens on the last 30 days (so early in a month it isn't empty); the menu has This month, All time and more.
const pad = (n: number) => String(n).padStart(2, '0'); const now = new Date();
const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
const range = ref({ from: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`, to: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` });
const preset = ref('30d');
const blank = { q: '', account: '', subaccountName: '', status: '', channel: '', network: '', settled: '', minAmount: '', maxAmount: '' };
const { filters, rows, total, page, perPage, loading, sort, dir, setSort } = useList('/dashboard/transactions', { ...blank, ...range.value }, { sort: 'createdAt', dir: 'desc' });
watch(range, (r) => { filters.from = r.from; filters.to = r.to; });
const more = ref(false); const det = reactive<any>({ open: false, row: null }); const exporting = ref(false);
const activeMore = computed(() => ['channel', 'network', 'settled', 'minAmount', 'maxAmount'].filter((k) => filters[k]).length);
const activeAny = computed(() => activeMore.value || filters.q || filters.account || filters.subaccountName || filters.status);
const clear = () => Object.assign(filters, blank);
function openDetails(row: any) { Object.assign(det, { open: true, row }); }
const reveal = async (id: string) => (await get(`/dashboard/transactions/${id}/reveal`)).data;
async function copyId(v: string) { if (await copy(v)) ok('Copied'); }
async function exportCsv() { exporting.value = true; try { await download('/dashboard/transactions/export', filters, 'transactions.csv'); } catch (e) { fail(e); } finally { exporting.value = false; } }

// the four cards: this period vs the one just before it
const cur = reactive<any>({ total: 0, successful: 0, pendingPayout: 0, fees: 0 }); const prev = ref<any>(null);
const vs = computed(() => ({ month: 'from last month', lastmonth: 'from the month before', today: 'from yesterday', '7d': 'from the 7 days before', '30d': 'from the 30 days before', year: 'from last year' } as any)[preset.value] || 'vs previous period');
const num = (n: number) => (n ?? 0).toLocaleString();
const delta = (c: number, p?: number) => (p === undefined || p === null ? null : p === 0 ? (c === 0 ? 0 : 100) : Math.round(((c - p) / p) * 100));
let t: any; let seq = 0;
async function loadSummary() {
  if (!auth.canSeeMoney) return;
  const my = ++seq; const { status, ...rest } = filters;
  try { const r = (await get('/dashboard/transactions/summary', rest)).data; if (my !== seq) return; Object.assign(cur, r.current); prev.value = r.previous; } catch { /* cards are a nicety; the table reports errors */ }
}
watch(filters, () => { clearTimeout(t); t = setTimeout(loadSummary, 300); }); watch(() => mode.tick, loadSummary); onMounted(loadSummary);
</script>
<style scoped>
.count-dot { background: rgb(var(--brand)); color: #fff; border-radius: 999px; font-size: 11px; padding: 0 6px; margin-left: 2px; }
.fld-icon { position: relative; display: flex; align-items: center; } .fld-icon > .q-icon { position: absolute; left: 12px; color: rgb(var(--muted)); pointer-events: none; } .fld-icon .field { padding-left: 38px; }
.avatar { width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12px; background: linear-gradient(135deg, #065f46, #10b981); flex-shrink: 0; }
.id-copy { font-size: 11.5px; color: rgb(var(--muted)); display: flex; } .idbox { width: 150px; max-width: 150px; overflow: hidden; }
</style>
