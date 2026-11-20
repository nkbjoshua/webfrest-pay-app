<template>
  <div>
    <PageHeader title="Transactions" subtitle="Every payment on the platform. Click one for the full picture.">
      <DateRangeMenu v-model="range" @preset="preset = $event" />
      <button class="btn primary s-lg" :disabled="exporting" @click="exportCsv"><q-icon name="download" />{{ exporting ? 'Preparing…' : 'Export' }}</button>
    </PageHeader>

    <div class="grid gap-4 mb-5" style="grid-template-columns: repeat(auto-fit, minmax(235px, 1fr))">
      <KpiCard icon="swap_horiz" tone="green" label="Total transactions" :value="num(cur.total)" :delta="delta(cur.total, prev?.total)" :delta-label="vs" />
      <KpiCard icon="check_circle_outline" tone="green" label="Successful" :value="num(cur.successful)" :delta="delta(cur.successful, prev?.successful)" :delta-label="vs" />
      <KpiCard icon="schedule" tone="orange" label="Pending payout" :value="num(cur.pendingPayout)" :delta="delta(cur.pendingPayout, prev?.pendingPayout)" :delta-label="vs" lower-is-better />
      <KpiCard icon="savings" tone="blue" label="Total fees" :value="ghs(cur.fees)" :delta="delta(cur.fees, prev?.fees)" :delta-label="vs" />
    </div>

    <DataTable :columns="cols" :rows="rows" :loading="loading" :total="total" :page="page" :per-page="perPage" :sort="sort" :dir="dir" :page-sizes="[10, 25, 50, 100]" noun="transactions" clickable empty-title="No transactions found" empty-text="Nothing matches these filters. Try a wider date range." empty-icon="receipt_long"
      @update:page="page = $event" @update:per-page="perPage = $event" @update:sort="setSort" @row="openDetails">
      <template #toolbar>
        <div class="filters-row">
          <div class="fld-icon" style="flex: 1 1 230px; max-width: 290px"><q-icon name="search" size="19px" /><input v-model="filters.q" class="field" placeholder="Reference, bank ref, email…" aria-label="Search" /></div>
          <div class="fld-icon" style="flex: 1 1 250px; max-width: 300px"><q-icon name="account_balance_wallet" size="19px" /><input v-model="filters.account" class="field" inputmode="numeric" placeholder="Account or wallet no. (or last 4)" aria-label="Account or wallet number" title="A payer's wallet number, or the account the money is paid out to. Full number or just the last 4 digits." /></div>
          <div class="fld-icon" style="flex: 1 1 200px; max-width: 250px"><q-icon name="storefront" size="19px" /><input v-model="filters.merchantName" class="field" placeholder="Merchant or school…" aria-label="Merchant" /></div>
          <div class="fld-icon" style="width: 130px"><span class="dot" :class="filters.mode === 'live' ? 'live' : filters.mode === 'test' ? 'test' : 'both'"></span><select v-model="filters.mode" class="field" aria-label="Mode"><option value="live">Live</option><option value="test">Test</option><option value="">Both</option></select></div>
          <select v-model="filters.status" class="field" style="width: 150px" aria-label="Status"><option value="">All statuses</option><option v-for="s in ['Success', 'Pending', 'Processing', 'Failed', 'Abandoned', 'PartiallyRefunded', 'Refunded']" :key="s">{{ s }}</option></select>
          <button class="btn" @click="more = !more"><q-icon name="tune" />More filters<span v-if="activeMore" class="count-dot">{{ activeMore }}</span></button>
          <button v-if="activeAny" class="btn ghost" @click="clear">Clear</button>
        </div>
        <div v-if="more" class="filters-more">
          <select v-model="filters.channel" class="field s-sm" aria-label="Channel"><option value="">Any method</option><option value="momo">Mobile money</option><option value="card">Card</option><option value="bank">Bank transfer</option></select>
          <select v-model="filters.network" class="field s-sm" aria-label="Network"><option value="">Any network</option><option>MTN</option><option>TELECEL</option><option>AIRTELTIGO</option></select>
          <select v-model="filters.provider" class="field s-sm" aria-label="Provider"><option value="">All providers</option><option>simulator</option><option>fidelity</option></select>
          <select v-model="filters.settled" class="field s-sm" aria-label="Paid out"><option value="">Paid out or not</option><option value="yes">Already paid out</option><option value="no">Not paid out yet</option></select>
          <input v-model="filters.minAmount" class="field s-sm" inputmode="decimal" placeholder="Min amount (GHS)" aria-label="Minimum amount" />
          <input v-model="filters.maxAmount" class="field s-sm" inputmode="decimal" placeholder="Max amount (GHS)" aria-label="Maximum amount" />
          <label class="flex items-center gap-2 text-[13px]"><input type="checkbox" v-model="filters.flagged" /> Flagged only</label>
        </div>
      </template>
      <template #cell-reference="{ row }"><div class="font-semibold">{{ row.reference }} <q-icon v-if="row.riskFlagged" name="flag" size="16px" style="color: rgb(var(--warn))" /></div><div class="idbox"><CopyText :text="row.id" class="id-copy" /></div></template>
      <template #cell-merchant="{ row }"><div class="flex items-center gap-2.5"><span class="avatar" :style="{ background: tint(row.merchant) }">{{ (row.merchant || '?')[0] }}</span><div><div>{{ row.merchant }}</div><div v-if="row.subaccount" class="text-[12px] text-muted mono">school {{ row.subaccount }}</div></div></div></template>
      <template #cell-payer="{ row }"><div>{{ row.customer.name || row.customer.email || '-' }}</div>
        <Reveal v-if="row.customer.hasPhone" :masked="row.customer.phone" :enabled="auth.opsDecider" :load="() => reveal(row.id).then((r) => r.payerPhone)" />
        <div class="text-[12px] text-muted">{{ channelLabel(row.channel) }}<span v-if="row.network"> · {{ row.network }}</span></div></template>
      <template #cell-receiver="{ row }"><template v-if="row.receiver"><div class="flex items-center gap-1.5 text-[12.5px]"><q-icon name="account_balance" size="16px" class="text-muted" />{{ row.receiver.bank }}</div><Reveal :masked="`•••• ${row.receiver.last4}`" :enabled="auth.opsDecider" :load="() => reveal(row.id).then((r) => r.account?.number)" /><div class="text-[12px] text-muted">{{ row.receiver.accountName }}</div></template><span v-else class="text-muted">No bank account</span></template>
      <template #cell-provider="{ row }"><span class="mono">{{ row.provider || '-' }}</span><div v-if="row.providerReference" class="idbox"><CopyText :text="row.providerReference" class="id-copy" /></div></template>
      <template #cell-amount="{ row }"><b class="nowrap">{{ ghs(row.chargeAmount) }}</b><div class="text-[12px] text-muted">fee {{ ghs(row.fees) }} · net {{ ghs(row.receiverNet) }}</div></template>
      <template #cell-status="{ row }"><StatusBadge :status="row.status" /> <span class="chip" :class="row.mode">{{ row.mode }}</span><div class="text-[12px] text-muted mt-1">{{ row.payout ? `paid out in ${row.payout}` : (['success', 'partiallyrefunded', 'refunded'].includes(row.status) ? 'not paid out yet' : '') }}</div></template>
      <template #cell-createdAt="{ row }">{{ dt(row.createdAt) }}</template>
      <template #cell-actions="{ row }">
        <button class="btn ghost s-sm" style="padding: 0 6px" aria-label="Actions" @click.stop><q-icon name="more_vert" />
          <q-menu anchor="bottom right" self="top right" :offset="[0, 4]"><q-list style="min-width: 210px">
            <q-item v-close-popup clickable @click="openDetails(row)"><q-item-section avatar><q-icon name="visibility" /></q-item-section><q-item-section>View details</q-item-section></q-item>
            <q-item v-close-popup clickable @click="$router.push(`/ops/transactions/${row.id}`)"><q-item-section avatar><q-icon name="open_in_new" /></q-item-section><q-item-section>Open full page</q-item-section></q-item>
            <q-item v-close-popup clickable @click="copyId(row.id)"><q-item-section avatar><q-icon name="content_copy" /></q-item-section><q-item-section>Copy transaction ID</q-item-section></q-item>
            <q-item v-if="row.providerReference" v-close-popup clickable @click="copyId(row.providerReference)"><q-item-section avatar><q-icon name="tag" /></q-item-section><q-item-section>Copy bank reference</q-item-section></q-item>
            <q-item v-if="row.merchant" v-close-popup clickable @click="filters.merchantName = row.merchant"><q-item-section avatar><q-icon name="filter_alt" /></q-item-section><q-item-section>Only this merchant</q-item-section></q-item>
          </q-list></q-menu></button>
      </template>
    </DataTable>
    <TxnDetailsModal v-model="det.open" :row="det.row" :reveal="reveal" :can-reveal-payer="auth.opsDecider" :can-reveal-account="auth.opsDecider" internal full-page="/ops/transactions" />
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'; import { useRoute } from 'vue-router';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Reveal from 'src/components/Reveal.vue'; import TxnDetailsModal from 'src/components/TxnDetailsModal.vue';
import KpiCard from 'src/components/KpiCard.vue'; import DateRangeMenu from 'src/components/DateRangeMenu.vue'; import CopyText from 'src/components/CopyText.vue';
import { useList } from 'src/composables/useList'; import { download, get, fail, ok } from 'src/services/api'; import { ghs, dt, channelLabel, copy } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth();
const cols = [{ key: 'reference', label: 'Reference', sortable: true }, { key: 'merchant', label: 'Merchant', sortable: true }, { key: 'payer', label: 'Payer' }, { key: 'receiver', label: 'Paid to' }, { key: 'provider', label: 'Provider', sortable: true }, { key: 'amount', label: 'Amount', num: true, sortable: true }, { key: 'status', label: 'Status', sortable: true }, { key: 'createdAt', label: 'Date', sortable: true }, { key: 'actions', label: '' }];
// Opens on the last 30 days (so early in a month it isn't empty); the menu has This month, All time and more.
const pad = (n: number) => String(n).padStart(2, '0'); const now = new Date(); const askedFor = !!(useRoute().query.merchant);
const thirty = { from: `${new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29).getFullYear()}-${pad(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29).getMonth() + 1)}-${pad(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29).getDate())}`, to: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` };
const range = ref(askedFor ? { from: '', to: '' } : thirty);
const preset = ref(askedFor ? 'all' : '30d');
const blank = { q: '', account: '', merchantName: '', mode: 'live', status: '', channel: '', network: '', provider: '', settled: '', minAmount: '', maxAmount: '', flagged: false };
const asked = (useRoute().query.merchant as string) || '';
const { filters, rows, total, page, perPage, loading, sort, dir, setSort } = useList('/ops/transactions', { ...blank, merchantName: asked, ...(asked ? { from: '', to: '' } : range.value) }, { modeAware: false, sort: 'createdAt', dir: 'desc' });
watch(range, (r) => { filters.from = r.from; filters.to = r.to; });
const more = ref(false); const det = reactive<any>({ open: false, row: null }); const exporting = ref(false);
const activeMore = computed(() => ['channel', 'network', 'provider', 'settled', 'minAmount', 'maxAmount'].filter((k) => filters[k]).length + (filters.flagged ? 1 : 0));
const activeAny = computed(() => activeMore.value || filters.q || filters.account || filters.merchantName || filters.status || filters.mode !== 'live');
const clear = () => Object.assign(filters, blank);
function openDetails(row: any) { Object.assign(det, { open: true, row }); }
const reveal = async (id: string) => (await get(`/ops/transactions/${id}/reveal`)).data;
async function copyId(v: string) { if (await copy(v)) ok('Copied'); }
async function exportCsv() { exporting.value = true; try { await download('/ops/transactions/export', filters, 'webfrest-transactions.csv'); } catch (e) { fail(e); } finally { exporting.value = false; } }

// the four cards: this period vs the one just before it
const cur = reactive<any>({ total: 0, successful: 0, pendingPayout: 0, fees: 0 }); const prev = ref<any>(null);
const vs = computed(() => ({ month: 'from last month', lastmonth: 'from the month before', today: 'from yesterday', '7d': 'from the 7 days before', '30d': 'from the 30 days before', year: 'from last year' } as any)[preset.value] || 'vs previous period');
const num = (n: number) => (n ?? 0).toLocaleString();
const delta = (c: number, p?: number) => (p === undefined || p === null ? null : p === 0 ? (c === 0 ? 0 : 100) : Math.round(((c - p) / p) * 100));
let t: any; let seq = 0;
async function loadSummary() {
  const my = ++seq; const { status, ...rest } = filters;
  try { const r = (await get('/ops/transactions/summary', rest)).data; if (my !== seq) return; Object.assign(cur, r.current); prev.value = r.previous; } catch { /* cards are a nicety; the table reports errors */ }
}
watch(filters, () => { clearTimeout(t); t = setTimeout(loadSummary, 300); }); onMounted(loadSummary);
const tint = (s?: string) => { const h = [...(s || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) % 4; return ['linear-gradient(135deg,#065f46,#10b981)', 'linear-gradient(135deg,#0f172a,#334155)', 'linear-gradient(135deg,#047857,#34d399)', 'linear-gradient(135deg,#1e3a5f,#3b82f6)'][h]; };
</script>
<style scoped>
.count-dot { background: rgb(var(--brand)); color: #fff; border-radius: 999px; font-size: 11px; padding: 0 6px; margin-left: 2px; }
.fld-icon { position: relative; display: flex; align-items: center; }
.fld-icon > .q-icon, .fld-icon > .dot { position: absolute; left: 12px; color: rgb(var(--muted)); pointer-events: none; }
.fld-icon .field { padding-left: 38px; }
.dot { width: 10px; height: 10px; border-radius: 50%; } .dot.live { background: #10b981; } .dot.test { background: #d97706; } .dot.both { background: #94a3b8; }
.avatar { width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.id-copy { font-size: 11.5px; color: rgb(var(--muted)); display: flex; }
.idbox { width: 150px; max-width: 150px; overflow: hidden; }
</style>
