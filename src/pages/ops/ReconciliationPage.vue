<template>
  <div>
    <PageHeader title="Reconciliation" subtitle="Match the bank's settlement file against what Webfrest recorded.">
      <button v-if="auth.opsDecider" class="btn primary" :disabled="busy" title="Fetch the bank's own statement for a day and reconcile it" @click="pull.open = true"><q-icon name="cloud_download" />Pull bank statement</button>
      <button v-if="auth.opsDecider" class="btn" @click="dlg.open = true"><q-icon name="upload_file" />Upload a file</button>
    </PageHeader>
    <div class="grid gap-6 max-lg:!grid-cols-1" :style="{ gridTemplateColumns: sel ? 'minmax(0, 1fr) minmax(0, 1.3fr)' : '1fr' }">
      <DataTable :columns="cols" :rows="runs" :loading="loading" clickable empty-title="No runs yet" empty-text="Upload the bank's settlement CSV to start." empty-icon="fact_check" @row="open">
        <template #cell-run="{ row }"><div class="font-semibold">{{ row.provider }} · {{ row.date }}</div><div class="text-[12.5px] text-muted">{{ row.fileName }} · {{ row.totalRows }} rows</div></template>
        <template #cell-result="{ row }"><span class="badge ok plain">{{ row.matched }} matched</span> <span v-if="exc(row)" class="badge bad plain ml-1">{{ exc(row) }} to review</span></template>
        <template #cell-at="{ row }">{{ ago(row.at) }}<div class="text-[12px] text-muted">{{ row.by }}</div></template>
      </DataTable>
      <div v-if="sel" class="card overflow-hidden">
        <div class="p-4 flex items-center justify-between border-b border-line"><b>{{ sel.provider }} · {{ sel.date }}</b><label class="flex items-center gap-2 text-[13px]"><input type="checkbox" v-model="onlyExc" @change="open(sel)" /> Exceptions only</label></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Bank ref</th><th class="num">Bank</th><th class="num">Ours</th><th>Result</th><th></th></tr></thead><tbody>
          <tr v-for="i in items" :key="i.id"><td><div class="mono">{{ i.reference || '-' }}</div><div v-if="i.transaction" class="text-[12px]"><router-link :to="`/ops/transactions/${i.transaction}`">{{ i.transaction }}</router-link></div><div v-if="i.note" class="text-[12px] text-muted">{{ i.note }}</div></td>
            <td class="num">{{ i.providerAmount != null ? ghs(i.providerAmount) : '-' }}</td><td class="num">{{ i.internalAmount != null ? ghs(i.internalAmount) : '-' }}</td>
            <td><StatusBadge :status="i.resolved ? 'Resolved' : i.result" /></td>
            <td><button v-if="i.result !== 'Matched' && !i.resolved && auth.opsDecider" class="btn s-sm" @click="resolve(i)">Resolve</button></td></tr>
          <tr v-if="!items.length"><td colspan="5" class="text-center text-muted py-8">{{ onlyExc ? 'No exceptions - everything matched.' : 'No rows.' }}</td></tr></tbody></table></div>
      </div>
    </div>
    <Modal v-model="pull.open" title="Pull the bank's statement" :width="520">
      <p class="text-muted text-[14px]">Fetches the statement of our collection account for one day and matches every line against our payments, payouts and refunds. This also runs by itself each morning for the previous day.</p>
      <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1"><div><label class="field-label">Bank</label><select v-model="pull.provider" class="field"><option>fidelity</option></select></div><div><label class="field-label">Statement day</label><input v-model="pull.date" type="date" class="field" /></div></div>
      <template #footer><button class="btn" @click="pull.open = false">Cancel</button><button class="btn primary" :disabled="busy || !pull.date" @click="pullNow">{{ busy ? 'Fetching…' : 'Pull and reconcile' }}</button></template>
    </Modal>
    <Modal v-model="dlg.open" title="New reconciliation" :width="620">
      <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1"><div><label class="field-label">Provider</label><select v-model="dlg.provider" class="field"><option>fidelity</option><option>simulator</option></select></div><div><label class="field-label">Settlement date</label><input v-model="dlg.date" type="date" class="field" /></div></div>
      <div><label class="field-label">Settlement file (CSV)</label><input type="file" accept=".csv,text/csv" class="field" style="padding-top: 9px" @change="pick" /><p class="field-hint">Columns: <span class="mono">reference, amount, status</span> - amount in GHS (e.g. 25.50), status success or failed.</p></div>
      <div v-if="dlg.file" class="text-[13px] text-muted">{{ dlg.file }} · {{ dlg.csv.split('\n').length - 1 }} rows</div>
      <template #footer><button class="btn" @click="dlg.open = false">Cancel</button><button class="btn primary" :disabled="busy || !dlg.csv || !dlg.date" @click="run">{{ busy ? 'Matching…' : 'Run reconciliation' }}</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { confirmDialog, promptDialog } from 'src/utils/confirm';
import { onMounted, reactive, ref } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue';
import { get, post, fail, ok } from 'src/services/api'; import { ghs, ago } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth();
const cols = [{ key: 'run', label: 'Run' }, { key: 'result', label: 'Result' }, { key: 'at', label: 'When' }];
const runs = ref<any[]>([]); const loading = ref(true); const sel = ref<any>(null); const items = ref<any[]>([]); const onlyExc = ref(true); const busy = ref(false);
const dlg = reactive({ open: false, provider: 'fidelity', date: new Date().toISOString().slice(0, 10), file: '', csv: '' });
const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const pull = reactive({ open: false, provider: 'fidelity', date: yesterday });
async function pullNow() { busy.value = true; try { const r = await post('/ops/reconciliation/pull', { provider: pull.provider, date: pull.date }); pull.open = false; ok('Statement pulled and reconciled'); await load(); open(runs.value.find((x) => x.id === r.data.id)); } catch (e) { fail(e); } finally { busy.value = false; } }
const exc = (r: any) => r.mismatched + r.missingInternal + r.missingProvider;
async function load() { try { runs.value = (await get('/ops/reconciliation')).data; } catch (e) { fail(e); } finally { loading.value = false; } }
async function open(r: any) { sel.value = r; try { items.value = (await get(`/ops/reconciliation/${r.id}/items`, { exceptionsOnly: onlyExc.value })).data; } catch (e) { fail(e); } }
function pick(e: Event) { const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return; dlg.file = f.name; const rd = new FileReader(); rd.onload = () => (dlg.csv = String(rd.result)); rd.readAsText(f); }
async function run() { busy.value = true; try { const r = await post('/ops/reconciliation', { provider: dlg.provider, date: dlg.date, fileName: dlg.file, csv: dlg.csv }); dlg.open = false; dlg.csv = ''; dlg.file = ''; ok('Reconciliation complete'); await load(); open(runs.value.find((x) => x.id === r.data.id)); } catch (e) { fail(e); } finally { busy.value = false; } }
async function resolve(i: any) { const note = await promptDialog({ title: 'Resolve this item', message: 'Say what you found, so the next person knows why it was closed.', label: 'Note', required: true, confirmText: 'Resolve' }); if (!note) return; try { await post(`/ops/reconciliation/items/${i.id}/resolve`, { note }); open(sel.value); } catch (e) { fail(e); } }
onMounted(load);
</script>
