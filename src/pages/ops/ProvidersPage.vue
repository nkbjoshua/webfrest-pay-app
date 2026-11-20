<template>
  <div>
    <PageHeader title="Providers & routing" subtitle="Choose which bank handles live payments. Switching takes effect on the very next payment." />
    <div v-if="loading" class="skeleton" style="height: 260px"></div>
    <template v-else>
      <div class="card card-pad mb-6" :style="isSim ? { borderColor: 'rgb(var(--warn) / 0.6)' } : {}">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="text-[12.5px] font-semibold text-muted uppercase tracking-wide">Live payments currently go through</div>
            <div class="text-[28px] font-extrabold mt-1">{{ g?.providerName || 'Nothing configured' }}</div>
            <div v-if="g?.fallback" class="text-[13.5px] text-muted mt-0.5">Fallback: {{ nameOf(g.fallback) }}</div>
            <div v-if="g" class="text-[12.5px] text-muted mt-1">Changed by {{ g.updatedBy || 'setup' }} · {{ dt(g.updatedAt) }}</div>
          </div>
          <div v-if="isSim" class="p-3 rounded-xl text-[13.5px] max-w-sm" style="background: rgb(var(--warn) / 0.12)"><b>Heads up:</b> this is the Simulator. Live payers will see a fake bank - no real money moves.</div>
        </div>
        <div v-if="auth.opsAdmin" class="hairline mt-5 pt-5 grid gap-3 items-end" style="grid-template-columns: repeat(auto-fit, minmax(210px, 1fr))">
          <div><label class="field-label">Switch live payments to</label><select v-model="sw.provider" class="field"><option value="">Choose provider…</option><option v-for="p in active" :key="p.code" :value="p.code">{{ p.name }}</option></select></div>
          <div><label class="field-label">Fallback if it's down (optional)</label><select v-model="sw.fallback" class="field"><option value="">No fallback</option><option v-for="p in active.filter((x: any) => x.code !== sw.provider)" :key="p.code" :value="p.code">{{ p.name }}</option></select></div>
          <button class="btn primary" style="height: 42px" :disabled="busy || !sw.provider || sw.provider === g?.provider && (sw.fallback || '') === (g?.fallback || '')" @click="confirmSwitch"><q-icon name="swap_horiz" />Switch provider</button>
        </div>
        <p v-else class="text-muted text-[13px] mt-4">Only an Ops admin can change routing.</p>
      </div>

      <h2 class="text-[17px] font-bold mb-3">Providers</h2>
      <div class="grid gap-4 mb-8" style="grid-template-columns: repeat(auto-fit, minmax(340px, 1fr))">
        <div v-for="p in providers" :key="p.code" class="card card-pad">
          <div class="flex items-start justify-between gap-3">
            <div><div class="text-[17px] font-bold">{{ p.name }}<span v-if="p.isSandbox" class="chip test ml-2">Sandbox</span><span v-if="g?.provider === p.code" class="chip ml-2">Live default</span></div>
              <div class="text-[12.5px] text-muted mt-0.5 mono">{{ p.code }} · {{ p.channels.join(', ') }}</div></div>
            <StatusBadge :status="p.status" />
          </div>
          <div class="flex items-center gap-2 mt-4 text-[13.5px]"><StatusBadge :status="p.healthStatus" /><span class="text-muted">{{ p.healthNote || 'Not checked yet' }}</span><span v-if="p.lastHealthAt" class="text-muted text-[12px] ml-auto">{{ ago(p.lastHealthAt) }}</span></div>
          <div v-if="!p.isSandbox" class="mt-4"><div class="field-label">Callback URL - give this to the bank</div><CopyText :text="p.callbackUrl" /></div>
          <div v-if="!p.implemented" class="mt-3 text-[12.5px]" style="color: rgb(var(--warn))">No adapter has been built for this provider yet.</div>
          <div class="flex gap-2 mt-4">
            <button class="btn s-sm" :disabled="checking === p.code || !p.implemented" @click="health(p)"><q-icon name="monitor_heart" />{{ checking === p.code ? 'Checking…' : 'Check health' }}</button>
            <button v-if="auth.opsAdmin && p.status !== 'Active'" class="btn s-sm ok" :disabled="!p.implemented" @click="toggle(p, true)">Enable</button>
            <button v-if="auth.opsAdmin && p.status === 'Active'" class="btn s-sm danger" @click="toggle(p, false)">Disable</button>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between mb-3"><h2 class="text-[17px] font-bold">Merchant overrides</h2><button v-if="auth.opsAdmin" class="btn s-sm" @click="ov.open = true"><q-icon name="add" />Add override</button></div>
      <DataTable :columns="rcols" :rows="merchantRoutes" empty-title="No overrides" empty-text="Every merchant follows the live default. Add an override to send one merchant through a different provider." empty-icon="alt_route">
        <template #cell-merchant="{ row }"><router-link :to="`/ops/merchants/${row.merchantId}`" class="font-semibold">{{ row.merchant }}</router-link></template>
        <template #cell-channel="{ row }">{{ row.channel ? channelLabel(row.channel) : 'All methods' }}</template>
        <template #cell-provider="{ row }"><b>{{ row.providerName }}</b><span v-if="row.fallback" class="text-muted text-[12.5px]"> · fallback {{ nameOf(row.fallback) }}</span></template>
        <template #cell-updatedAt="{ row }">{{ dt(row.updatedAt) }}<div class="text-[12px] text-muted">{{ row.updatedBy }}</div></template>
        <template #cell-actions="{ row }"><button v-if="auth.opsAdmin" class="btn s-sm danger" @click="removeRoute(row)">Remove</button></template>
      </DataTable>
    </template>

    <Modal v-model="ask.open" title="Switch live payments?">
      <p class="text-[14.5px]">All <b>new live payments</b> will go through <b>{{ nameOf(sw.provider) }}</b>{{ sw.fallback ? `, falling back to ${nameOf(sw.fallback)}` : '' }}. Payments already in progress finish with the provider that started them.</p>
      <div v-if="healthOf(sw.provider) && healthOf(sw.provider) !== 'Healthy'" class="p-3 rounded-xl text-[13.5px]" style="background: rgb(var(--warn) / 0.12)"><b>{{ nameOf(sw.provider) }} isn't reporting healthy</b> ({{ healthOf(sw.provider) }}). Run a health check first.</div>
      <template #footer><button class="btn" @click="ask.open = false">Cancel</button><button class="btn primary" :disabled="busy" @click="doSwitch">{{ busy ? 'Switching…' : 'Yes, switch' }}</button></template>
    </Modal>
    <Modal v-model="ov.open" title="Route a merchant differently">
      <div><label class="field-label">Merchant</label><input v-model.trim="ov.q" class="field" placeholder="Search by name or code…" @input="searchMerchants" /></div>
      <div v-if="ov.results.length" class="card" style="max-height: 180px; overflow: auto"><button v-for="r in ov.results" :key="r.id" class="w-full text-left px-3 py-2 hairline first:border-0" style="background: none; border-left: 0; border-right: 0; border-bottom: 0; cursor: pointer; color: inherit; font: inherit" :style="ov.merchantId === r.id ? { background: 'rgb(var(--brand) / 0.1)' } : {}" @click="ov.merchantId = r.id; ov.q = r.name">{{ r.name }} <span class="text-muted mono text-[12px]">{{ r.code }}</span></button></div>
      <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <div><label class="field-label">Provider</label><select v-model="ov.provider" class="field"><option value="">Choose…</option><option v-for="p in active" :key="p.code" :value="p.code">{{ p.name }}</option></select></div>
        <div><label class="field-label">Method</label><select v-model="ov.channel" class="field"><option value="">All methods</option><option value="card">Card</option><option value="momo">Mobile money</option><option value="bank">Bank transfer</option></select></div>
      </div>
      <template #footer><button class="btn" @click="ov.open = false">Cancel</button><button class="btn primary" :disabled="busy || !ov.merchantId || !ov.provider" @click="saveOverride">Save override</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { confirmDialog, promptDialog } from 'src/utils/confirm';
import { computed, onMounted, reactive, ref } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue'; import CopyText from 'src/components/CopyText.vue';
import { get, post, put, del, fail, ok } from 'src/services/api'; import { dt, ago, channelLabel } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth();
const providers = ref<any[]>([]); const g = ref<any>(null); const routes = ref<any[]>([]); const loading = ref(true); const busy = ref(false); const checking = ref('');
const sw = reactive({ provider: '', fallback: '' }); const ask = reactive({ open: false });
const ov = reactive<any>({ open: false, q: '', results: [], merchantId: '', provider: '', channel: '' });
const rcols = [{ key: 'merchant', label: 'Merchant' }, { key: 'channel', label: 'Method' }, { key: 'provider', label: 'Provider' }, { key: 'updatedAt', label: 'Changed' }, { key: 'actions', label: '' }];
const active = computed(() => providers.value.filter((p) => p.status === 'Active' && p.implemented));
const merchantRoutes = computed(() => routes.value.filter((r) => r.scope === 'Merchant'));
const isSim = computed(() => g.value?.provider === 'simulator');
const nameOf = (code: string) => providers.value.find((p) => p.code === code)?.name || code;
const healthOf = (code: string) => providers.value.find((p) => p.code === code)?.healthStatus;
async function load() {
  try { const r = (await get('/ops/providers')).data; providers.value = r.providers; g.value = r.globalRoute; routes.value = r.routes; sw.provider = ''; sw.fallback = r.globalRoute?.fallback || ''; }
  catch (e) { fail(e); } finally { loading.value = false; }
}
function confirmSwitch() { ask.open = true; }
async function doSwitch() { busy.value = true; try { const r = await put('/ops/routes/global', { providerCode: sw.provider, fallbackCode: sw.fallback || undefined }); ask.open = false; ok(r.message); load(); } catch (e) { fail(e); } finally { busy.value = false; } }
async function health(p: any) { checking.value = p.code; try { await post(`/ops/providers/${p.code}/health`); await load(); } catch (e) { fail(e); } finally { checking.value = ''; } }
async function toggle(p: any, enabled: boolean) { if (!(await confirmDialog(enabled ? { title: `Enable ${p.name}?`, message: 'It can then be chosen for live payments.', confirmText: 'Enable' } : { title: `Disable ${p.name}?`, message: 'Payments cannot be routed to it while it is disabled. Make sure live payments are switched to another provider first.', confirmText: 'Disable', danger: true }))) return; try { await post(`/ops/providers/${p.code}/toggle`, { enabled }); ok(enabled ? 'Enabled' : 'Disabled'); load(); } catch (e) { fail(e); } }
let t: any;
function searchMerchants() { clearTimeout(t); ov.merchantId = ''; t = setTimeout(async () => { if (ov.q.length < 2) return (ov.results = []); try { ov.results = (await get('/ops/merchants', { q: ov.q, perPage: 8, status: 'Active' })).data; } catch { /* ignore */ } }, 300); }
async function saveOverride() { busy.value = true; try { const r = await put(`/ops/routes/merchant/${ov.merchantId}`, { providerCode: ov.provider, channel: ov.channel || undefined }); ov.open = false; Object.assign(ov, { q: '', results: [], merchantId: '', provider: '', channel: '' }); ok(r.message); load(); } catch (e) { fail(e); } finally { busy.value = false; } }
async function removeRoute(r: any) { if (!(await confirmDialog({ title: 'Remove this override?', message: `${r.merchant} will go back to the default provider.`, confirmText: 'Remove override' }))) return; try { await del(`/ops/routes/${r.id}`); ok('Override removed'); load(); } catch (e) { fail(e); } }
onMounted(load);
</script>
