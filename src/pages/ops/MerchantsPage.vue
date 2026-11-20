<template>
  <div>
    <PageHeader title="Merchants" subtitle="Businesses on Webfrest Pay. A platform's schools (subaccounts) sit under it – open them with the Subaccounts button.">
      <button class="btn s-lg" @click="help = true"><q-icon name="help_outline" />What do types mean?</button>
      <button v-if="auth.opsAdmin" class="btn primary s-lg" @click="openAdd"><q-icon name="add" />Add merchant</button>
    </PageHeader>

    <div class="grid gap-4 mb-5" style="grid-template-columns: repeat(auto-fit, minmax(235px, 1fr))">
      <KpiCard icon="storefront" tone="green" label="Total merchants" :value="num(sum.total)" note="All registered businesses" />
      <KpiCard icon="check_circle_outline" tone="green" label="Active merchants" :value="num(sum.active)" :note="sum.pending ? `${sum.pending} waiting for review` : 'Live and processing payments'" />
      <KpiCard icon="pause_circle_outline" tone="red" label="Suspended merchants" :value="num(sum.suspended)" note="Temporarily disabled" />
      <KpiCard icon="layers" tone="blue" label="Platform merchants" :value="num(sum.platforms)" :note="`${sum.subaccounts} subaccounts (schools)`" />
    </div>

    <DataTable :columns="cols" :rows="rows" :loading="loading" :total="total" :page="page" :per-page="perPage" :sort="sort" :dir="dir" :page-sizes="[10, 25, 50, 100]" noun="results" clickable empty-title="No merchants found" empty-icon="storefront"
      @update:page="page = $event" @update:per-page="perPage = $event" @update:sort="setSort" @row="(r: any) => $router.push(`/ops/merchants/${r.id}`)">
      <template #toolbar>
        <div class="filters-row">
          <div class="fld-icon" style="flex: 1 1 260px; max-width: 360px"><q-icon name="search" size="19px" /><input v-model="filters.q" class="field" placeholder="Search name, email or code…" aria-label="Search" /></div>
          <select v-model="filters.status" class="field" style="width: 160px" aria-label="Status"><option value="">All statuses</option><option>Pending</option><option>Active</option><option>Rejected</option><option>Suspended</option></select>
          <select v-model="filters.type" class="field" style="width: 190px" aria-label="Type"><option value="">Standard + Platform</option><option value="Standard">Standard only</option><option value="Platform">Platform only</option><option value="Subaccount">Subaccounts only</option></select>
          <button class="btn" @click="more = !more"><q-icon name="tune" />More filters<span v-if="activeMore" class="count-dot">{{ activeMore }}</span></button>
          <button v-if="activeAny" class="btn ghost" @click="clear">Clear</button>
        </div>
        <div v-if="more" class="filters-more">
          <select v-model="filters.settlement" class="field s-sm" aria-label="Settlement"><option value="">Any settlement</option><option value="Manual">Manual</option><option value="Auto">Daily</option><option value="Instant">Instant</option></select>
          <select v-model="filters.live" class="field s-sm" aria-label="Live payments"><option value="">Live or test only</option><option value="yes">Live payments on</option><option value="no">Test only</option></select>
          <input v-model="filters.from" type="date" class="field s-sm" aria-label="Joined from" title="Joined from" /><input v-model="filters.to" type="date" class="field s-sm" aria-label="Joined to" title="Joined to" />
        </div>
      </template>
      <template #cell-name="{ row }"><div class="flex items-center gap-3 no-wrap"><span class="tile">{{ (row.name || '?')[0] }}</span><div class="min-w-0"><div class="font-semibold">{{ row.name }}</div><div class="text-[12.5px] text-muted">{{ row.email }}</div><div v-if="row.phone" class="text-[12.5px] text-muted">{{ row.phone }}</div><div v-if="row.parent" class="text-[12px] text-muted">under {{ row.parent }}</div></div></div></template>
      <template #cell-code="{ row }"><span class="mono">{{ row.code }}</span><div v-if="row.externalRef" class="text-[12px] text-muted">ref {{ row.externalRef }}</div></template>
      <template #cell-type="{ row }"><span class="chip">{{ row.type }}</span></template>
      <template #cell-status="{ row }"><StatusBadge :status="row.status" /><div class="text-[12px] text-muted mt-1">{{ row.liveEnabled ? 'Live payments on' : 'Test only' }}</div></template>
      <template #cell-settlement="{ row }"><div>{{ row.settlementMode === 'Auto' ? 'Daily' : row.settlementMode }}</div><div class="text-[12px] text-muted">{{ row.payoutApprovalMode === 'Ops' ? 'Ops approves' : row.payoutApprovalMode === 'Both' ? 'Merchant + Ops' : 'Merchant approves' }}</div></template>
      <template #cell-team="{ row }"><div>{{ row.teamCount }} user{{ row.teamCount === 1 ? '' : 's' }}</div><div v-if="row.type === 'Platform'" class="text-[12px] text-muted">{{ row.subaccountCount }} subaccount{{ row.subaccountCount === 1 ? '' : 's' }}</div></template>
      <template #cell-joined="{ row }">{{ day(row.createdAt) }}</template>
      <template #cell-actions="{ row }">
        <div class="flex items-center gap-2 justify-end no-wrap">
          <button v-if="row.type === 'Platform'" class="btn s-sm sub-btn" @click.stop="$router.push(`/ops/merchants/${row.id}/subaccounts`)"><q-icon name="hub" />Subaccounts ({{ row.subaccountCount }})</button>
          <button class="btn s-sm kebab" aria-label="Actions" @click.stop><q-icon name="more_vert" />
            <q-menu anchor="bottom right" self="top right" :offset="[0, 4]"><q-list style="min-width: 200px">
              <q-item v-close-popup clickable @click="$router.push(`/ops/merchants/${row.id}`)"><q-item-section avatar><q-icon name="visibility" /></q-item-section><q-item-section>View details</q-item-section></q-item>
              <q-item v-if="row.type === 'Platform'" v-close-popup clickable @click="$router.push(`/ops/merchants/${row.id}/subaccounts`)"><q-item-section avatar><q-icon name="hub" /></q-item-section><q-item-section>View subaccounts</q-item-section></q-item>
              <q-item v-close-popup clickable @click="$router.push({ path: '/ops/transactions', query: { merchant: row.name } })"><q-item-section avatar><q-icon name="receipt_long" /></q-item-section><q-item-section>View transactions</q-item-section></q-item>
              <q-item v-close-popup clickable @click="copyCode(row.code)"><q-item-section avatar><q-icon name="content_copy" /></q-item-section><q-item-section>Copy code</q-item-section></q-item>
            </q-list></q-menu></button>
        </div>
      </template>
    </DataTable>

    <Modal v-model="help" title="Merchant types" :width="600">
      <div class="grid gap-4 text-[13.5px]">
        <div><span class="chip">Standard</span><p class="mt-1.5">An ordinary business that collects its own payments and gets paid out to its own bank account. One business, one balance. Example: a shop using Webfrest Pay on its website.</p></div>
        <div><span class="chip">Platform</span><p class="mt-1.5">A software company that collects money <b>on behalf of many other businesses</b> and has them paid separately. It owns the API keys and sees all its subaccounts. Example: <b>Cleverchap</b>, which collects school fees for every school.</p></div>
        <div><span class="chip">Subaccount</span><p class="mt-1.5">One of a platform's customers - for Cleverchap, <b>a school</b>. It has its own balance, bank account and payouts, but payments are made through the platform's keys. A school's bursar can get a login to see only their own school. You see these under their platform (Subaccounts button), not in the main list.</p></div>
        <div class="hint-box">The filter's default, <b>Standard + Platform</b>, hides subaccounts to keep this list short. Pick <b>Subaccounts only</b> to search every school across all platforms.</div>
      </div>
      <template #footer><button class="btn primary" @click="help = false">Got it</button></template>
    </Modal>

    <Modal v-model="add.open" :title="add.done ? 'Merchant added' : 'Add a merchant'" :width="620" :persistent="busy">
      <template v-if="!add.done">
        <p class="text-[13.5px] text-muted">Create a business on its behalf. The owner gets a login with a temporary password and is asked to change it when they first sign in.</p>
        <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <div><label class="field-label">Business name</label><input v-model.trim="add.businessName" class="field" /></div>
          <div><label class="field-label">Business email</label><input v-model.trim="add.email" class="field" type="email" /></div>
          <div><label class="field-label">Owner's full name</label><input v-model.trim="add.ownerName" class="field" /></div>
          <div><label class="field-label">Phone (optional)</label><input v-model.trim="add.phone" class="field" /></div>
          <div><label class="field-label">Website (optional)</label><input v-model.trim="add.website" class="field" /></div>
          <div><label class="field-label">Industry (optional)</label><input v-model.trim="add.industry" class="field" /></div>
        </div>
        <label class="flex items-center gap-2 text-[13.5px]"><input v-model="add.approve" type="checkbox" /> Approve straight away (live payments still need a verified bank account)</label>
        <div v-if="add.error" class="text-[13.5px]" style="color: rgb(var(--bad))" role="alert">{{ add.error }}</div>
      </template>
      <template v-else>
        <div class="hint-box"><b>{{ add.businessName }}</b> was added as <span class="mono">{{ add.code }}</span>. Give the owner this to sign in with (it is not shown again):</div>
        <dl class="kv"><dt>Email</dt><dd>{{ add.ownerEmail }}</dd><dt>Temporary password</dt><dd><CopyText :text="add.temp" /></dd></dl>
      </template>
      <template #footer>
        <template v-if="!add.done"><button class="btn" :disabled="busy" @click="add.open = false">Cancel</button><button class="btn primary" :disabled="busy || !add.businessName || !add.email || !add.ownerName" @click="doAdd">{{ busy ? 'Adding…' : 'Add merchant' }}</button></template>
        <button v-else class="btn primary" @click="add.open = false">Done</button>
      </template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'; import { useRoute } from 'vue-router';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue'; import KpiCard from 'src/components/KpiCard.vue'; import CopyText from 'src/components/CopyText.vue';
import { useList } from 'src/composables/useList'; import { get, post, fail, ok } from 'src/services/api'; import { day, copy } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth(); const route = useRoute(); const help = ref(false); const busy = ref(false); const more = ref(false);
const cols = [{ key: 'name', label: 'Business', sortable: true, width: '250px' }, { key: 'code', label: 'Code', sortable: true }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status', sortable: true }, { key: 'settlement', label: 'Settlement', sortable: true }, { key: 'team', label: 'Team', sortable: true }, { key: 'joined', label: 'Joined', sortable: true }, { key: 'actions', label: 'Actions', width: '190px' }];
const blank = { q: '', status: '', type: '', settlement: '', live: '', from: '', to: '' };
const { filters, rows, total, page, perPage, loading, reload, sort, dir, setSort } = useList('/ops/merchants', { ...blank, status: (route.query.status as string) || '' }, { modeAware: false });
const activeMore = computed(() => ['settlement', 'live', 'from', 'to'].filter((k) => filters[k]).length);
const activeAny = computed(() => activeMore.value || filters.q || filters.status || filters.type);
const clear = () => Object.assign(filters, blank);
const sum = reactive<any>({ total: 0, active: 0, suspended: 0, pending: 0, platforms: 0, subaccounts: 0 });
const num = (n: number) => (n ?? 0).toLocaleString();
async function loadSummary() { try { Object.assign(sum, (await get('/ops/merchants/summary')).data); } catch { /* the cards are a nicety */ } }
onMounted(loadSummary); watch(rows, loadSummary);
async function copyCode(c: string) { if (await copy(c)) ok('Copied'); }
const add = reactive<any>({ open: false, done: false, businessName: '', email: '', ownerName: '', phone: '', website: '', industry: '', approve: true, error: '', code: '', ownerEmail: '', temp: '' });
function openAdd() { Object.assign(add, { open: true, done: false, businessName: '', email: '', ownerName: '', phone: '', website: '', industry: '', approve: true, error: '', code: '', ownerEmail: '', temp: '' }); }
async function doAdd() {
  busy.value = true; add.error = '';
  try { const r = (await post('/ops/merchants', { businessName: add.businessName, email: add.email, ownerName: add.ownerName, phone: add.phone, website: add.website, industry: add.industry, approve: add.approve })).data; Object.assign(add, { done: true, code: r.code, ownerEmail: r.ownerEmail, temp: r.temporaryPassword }); reload(); loadSummary(); }
  catch (e: any) { add.error = e.message; } finally { busy.value = false; }
}
</script>
<style scoped>
.fld-icon { position: relative; display: flex; align-items: center; } .fld-icon > .q-icon { position: absolute; left: 12px; color: rgb(var(--muted)); pointer-events: none; } .fld-icon .field { padding-left: 38px; }
.count-dot { background: rgb(var(--brand)); color: #fff; border-radius: 999px; font-size: 11px; padding: 0 6px; margin-left: 2px; }
.tile { width: 44px; height: 44px; border-radius: 12px; background: rgb(var(--brand) / 0.12); color: rgb(var(--brand)); display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; flex-shrink: 0; }
.sub-btn { border-color: rgb(var(--brand) / 0.55); color: rgb(var(--ink)); } .kebab { width: 36px; padding: 0; } .no-wrap { flex-wrap: nowrap; }
</style>
