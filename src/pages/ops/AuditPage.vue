<template>
  <div>
    <PageHeader title="Audit log" subtitle="Every sensitive action: who did it, from where, to what, and when. Click a row for the full entry.">
      <button class="btn" :disabled="!rows.length" @click="exportCsv"><q-icon name="download" />Export this page</button>
    </PageHeader>
    <DataTable :columns="cols" :rows="rows" :loading="loading" :total="total" :page="page" :per-page="perPage" clickable empty-title="No entries" empty-text="Nothing matches these filters." empty-icon="history" @update:page="page = $event" @row="openDetails">
      <template #toolbar>
        <div class="filters-row">
          <input v-model="filters.q" class="field s-sm" style="max-width: 250px" placeholder="Search anything…" aria-label="Search" />
          <input v-model="filters.actor" class="field s-sm" style="max-width: 220px" placeholder="User (email)" aria-label="User" list="audit-users" />
          <datalist id="audit-users"><option v-for="u in knownUsers" :key="u" :value="u" /></datalist>
          <select v-model="filters.action" class="field s-sm" style="max-width: 220px" aria-label="Action"><option value="">All actions</option><optgroup label="Areas"><option v-for="a in areas" :key="'a' + a" :value="a + '.'">{{ a }} (all)</option></optgroup><optgroup label="Exact action"><option v-for="a in facets.actions" :key="a" :value="a">{{ a }}</option></optgroup></select>
          <input v-model="filters.from" type="date" class="field s-sm" style="max-width: 150px" aria-label="From" title="From" /><input v-model="filters.to" type="date" class="field s-sm" style="max-width: 150px" aria-label="To" title="To" />
          <button class="btn s-sm" @click="more = !more"><q-icon name="tune" />{{ more ? 'Fewer filters' : 'More filters' }}</button>
          <button v-if="anyFilter" class="btn ghost s-sm" @click="clear">Clear</button>
        </div>
        <div v-if="more" class="filters-more">
          <select v-model="filters.actorType" class="field s-sm" aria-label="Who kind"><option value="">Any kind of actor</option><option v-for="a in facets.actorTypes" :key="a" :value="a">{{ actorLabel(a) }}</option></select>
          <select v-model="filters.entityType" class="field s-sm" aria-label="Entity"><option value="">Any entity</option><option v-for="a in facets.entityTypes" :key="a">{{ a }}</option></select>
          <input v-model="filters.entityId" class="field s-sm" placeholder="Entity id (e.g. pay_…)" aria-label="Entity id" />
          <input v-model="filters.ip" class="field s-sm" placeholder="IP address" aria-label="IP address" />
        </div>
      </template>
      <template #cell-at="{ row }"><span class="whitespace-nowrap">{{ dt(row.at) }}</span></template>
      <template #cell-actor="{ row }"><div class="font-semibold">{{ row.actor }}</div><div class="text-[12px] text-muted">{{ actorLabel(row.actorType) }}{{ row.ip ? ' · ' + row.ip : '' }}</div></template>
      <template #cell-action="{ row }"><span class="mono">{{ row.action }}</span></template>
      <template #cell-entity="{ row }"><div class="text-[12.5px]">{{ row.entityType || '-' }}</div><div class="mono text-muted" style="font-size: 11.5px">{{ row.entityId }}</div></template>
      <template #cell-merchant="{ row }"><template v-if="row.merchant"><div class="text-[12.5px]">{{ row.merchant }}</div><div class="mono text-muted" style="font-size: 11.5px">{{ row.merchantCode }}</div></template><span v-else class="text-muted">-</span></template>
      <template #cell-detail="{ row }"><div class="text-[12.5px] truncate" style="max-width: 280px" :title="row.detail">{{ row.detail || '-' }}</div></template>
    </DataTable>

    <Modal v-model="det.open" title="Audit entry" :width="620">
      <template v-if="det.row">
        <div class="dsec"><h4>What happened</h4>
          <div class="text-[18px] font-extrabold mb-2">{{ nice(det.row.action) }}</div>
          <dl class="kv"><dt>Action</dt><dd class="mono">{{ det.row.action }}</dd><dt>When</dt><dd>{{ dt(det.row.at) }} <span class="text-muted">({{ ago(det.row.at) }})</span></dd><dt>Entry no.</dt><dd class="mono">#{{ det.row.id }}</dd></dl></div>
        <div class="dsec"><h4><q-icon name="person" size="15px" />Who</h4>
          <dl class="kv"><dt>User</dt><dd>{{ det.row.actor }}</dd><dt>Kind</dt><dd>{{ actorLabel(det.row.actorType) }}</dd><dt v-if="det.row.actorId">User id</dt><dd v-if="det.row.actorId" class="mono">{{ det.row.actorId }}</dd><dt>IP address</dt><dd class="mono">{{ det.row.ip || '-' }}</dd></dl>
          <button v-if="det.row.actor?.includes('@')" class="btn s-sm mt-3" @click="filterBy('actor', det.row.actor)">Show everything by this user</button></div>
        <div class="dsec"><h4><q-icon name="category" size="15px" />What it touched</h4>
          <dl class="kv"><dt>Entity</dt><dd>{{ det.row.entityType || '-' }}</dd><dt>Entity id</dt><dd class="mono">{{ det.row.entityId || '-' }}</dd><dt>Merchant</dt><dd><router-link v-if="det.row.merchantId" :to="`/ops/merchants/${det.row.merchantId}`" @click="det.open = false">{{ det.row.merchant }}</router-link><span v-else class="text-muted">-</span></dd></dl>
          <button v-if="det.row.entityId" class="btn s-sm mt-3" @click="filterBy('entityId', det.row.entityId)">Show everything about this {{ (det.row.entityType || 'entity').toLowerCase() }}</button></div>
        <div class="dsec"><h4><q-icon name="notes" size="15px" />Detail</h4><pre class="mono" style="white-space: pre-wrap; word-break: break-word; margin: 0">{{ det.row.detail || 'No extra detail was recorded.' }}</pre></div>
      </template>
      <template #footer><button class="btn primary" @click="det.open = false">Close</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import Modal from 'src/components/Modal.vue';
import { useList } from 'src/composables/useList'; import { get } from 'src/services/api'; import { dt, ago } from 'src/utils/format';
const areas = ['payout', 'merchant', 'route', 'provider', 'bank_account', 'fee_plan', 'risk_rule', 'reconciliation', 'staff', 'team', 'settings', 'auth', 'api_key', 'webhook', 'transaction'];
const cols = [{ key: 'at', label: 'When' }, { key: 'actor', label: 'Who' }, { key: 'action', label: 'Action' }, { key: 'entity', label: 'Entity' }, { key: 'merchant', label: 'Merchant' }, { key: 'detail', label: 'Detail' }];
const blank = { q: '', action: '', actor: '', actorType: '', entityType: '', entityId: '', ip: '', from: '', to: '' };
const { filters, rows, total, page, perPage, loading } = useList('/ops/audit', { ...blank }, { modeAware: false, perPage: 50 });
const facets = reactive<any>({ actions: [], entityTypes: [], actorTypes: [] }); const more = ref(false); const det = reactive<any>({ open: false, row: null });
const anyFilter = computed(() => Object.values(filters).some((v) => v));
const knownUsers = computed(() => [...new Set(rows.value.map((r: any) => r.actor).filter((a: string) => a?.includes('@')))]);
const actorLabel = (t: string) => ({ user: 'Signed-in user', apikey: 'API key', system: 'System (automatic)' } as any)[t] || t;
const nice = (a: string) => { const [area, ...rest] = (a || '').split('.'); const w = (s: string) => s.replace(/_/g, ' '); return `${w(area).replace(/^./, (c) => c.toUpperCase())}: ${w(rest.join(' ')) || 'event'}`; };
const clear = () => Object.assign(filters, blank);
function openDetails(row: any) { Object.assign(det, { open: true, row }); }
function filterBy(k: string, v: string) { clear(); filters[k] = v; det.open = false; more.value = k === 'entityId'; }
function exportCsv() {
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['When,Who,Kind,IP,Action,Entity,Entity id,Merchant,Detail', ...rows.value.map((r: any) => [r.at, r.actor, r.actorType, r.ip, r.action, r.entityType, r.entityId, r.merchant, r.detail].map(esc).join(','))].join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'audit-log.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
onMounted(async () => { try { Object.assign(facets, (await get('/ops/audit/facets')).data); } catch { /* filters still work by typing */ } });
</script>
