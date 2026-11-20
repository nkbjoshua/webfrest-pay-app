<template>
  <div>
    <PageHeader title="Fee plans" subtitle="What Webfrest charges per successful payment. Changes apply to new payments only.">
      <button v-if="auth.opsAdmin" class="btn primary" @click="openNew"><q-icon name="add" />New plan</button>
    </PageHeader>
    <div class="hint-box mb-5"><b>What is a fee plan?</b> It is the price list Webfrest charges a merchant on each <b>successful payment</b> - for example 1.5% on mobile money and 1.95% on cards, with an optional flat amount and a cap. Each merchant is on one plan; merchants with no plan of their own use the <b>Default</b>. Give a big or special customer its own plan on its Merchants page. This is separate from the bank's transfer fee on payouts (see Platform settings) and from a platform's own commission on its schools.</div>
    <div v-if="loading" class="skeleton" style="height: 200px"></div>
    <div v-else class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(360px, 1fr))">
      <div v-for="p in plans" :key="p.id" class="card card-pad">
        <div class="flex items-start justify-between gap-3"><div><div class="text-[17px] font-bold">{{ p.name }}<span v-if="p.isDefault" class="chip ml-2">Default</span></div><div class="text-[13px] text-muted mt-0.5">{{ p.description || 'No description' }} · {{ p.merchants }} merchant{{ p.merchants === 1 ? '' : 's' }}</div></div></div>
        <div class="mt-4"><div v-for="r in p.rules" :key="r.channel" class="flex justify-between py-2 hairline first:border-0 text-[14px]"><span>{{ r.channel ? channelLabel(r.channel) : 'All other methods' }}</span><b>{{ (r.percentBps / 100).toFixed(2) }}%{{ r.flatMinor ? ' + ' + ghs(r.flatMinor) : '' }}<span v-if="r.capMinor" class="text-muted font-normal"> (cap {{ ghs(r.capMinor) }})</span></b></div></div>
        <div v-if="auth.opsAdmin" class="flex gap-2 mt-4"><button class="btn s-sm" @click="openEdit(p)">Edit</button><button v-if="!p.isDefault" class="btn s-sm" @click="makeDefault(p)">Make default</button></div>
      </div>
    </div>
    <Modal v-model="dlg.open" :title="dlg.id ? 'Edit fee plan' : 'New fee plan'" :width="620">
      <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1"><div><label class="field-label">Name</label><input v-model.trim="dlg.name" class="field" /></div><div><label class="field-label">Description</label><input v-model.trim="dlg.description" class="field" /></div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Method</th><th>Percent (%)</th><th>Flat (GHS)</th><th>Cap (GHS)</th><th></th></tr></thead><tbody>
        <tr v-for="(r, i) in dlg.rules" :key="i"><td><select v-model="r.channel" class="field s-sm"><option :value="null">All other</option><option value="card">Card</option><option value="momo">Mobile money</option><option value="bank">Bank transfer</option></select></td><td><input v-model.number="r.pct" class="field s-sm" type="number" step="0.01" min="0" max="20" /></td><td><input v-model="r.flat" class="field s-sm" inputmode="decimal" /></td><td><input v-model="r.cap" class="field s-sm" inputmode="decimal" placeholder="none" /></td><td><button class="btn ghost s-sm" @click="dlg.rules.splice(i, 1)" aria-label="Remove"><q-icon name="close" /></button></td></tr>
      </tbody></table></div>
      <button class="btn s-sm" style="justify-self: start" @click="dlg.rules.push({ channel: null, pct: 1.5, flat: '', cap: '' })"><q-icon name="add" />Add rule</button>
      <template #footer><button class="btn" @click="dlg.open = false">Cancel</button><button class="btn primary" :disabled="busy || !dlg.name || !dlg.rules.length" @click="save">{{ busy ? 'Saving…' : 'Save plan' }}</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { confirmDialog, promptDialog } from 'src/utils/confirm';
import { onMounted, reactive, ref } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import Modal from 'src/components/Modal.vue';
import { get, post, put, fail, ok } from 'src/services/api'; import { ghs, channelLabel, toMinor } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth();
const plans = ref<any[]>([]); const loading = ref(true); const busy = ref(false);
const dlg = reactive<any>({ open: false, id: '', name: '', description: '', rules: [] });
async function load() { try { plans.value = (await get('/ops/fee-plans')).data; } catch (e) { fail(e); } finally { loading.value = false; } }
function openNew() { Object.assign(dlg, { open: true, id: '', name: '', description: '', rules: [{ channel: 'momo', pct: 1.5, flat: '', cap: '' }, { channel: 'card', pct: 1.95, flat: '', cap: '' }, { channel: null, pct: 1.5, flat: '', cap: '' }] }); }
function openEdit(p: any) { Object.assign(dlg, { open: true, id: p.id, name: p.name, description: p.description || '', rules: p.rules.map((r: any) => ({ channel: r.channel, pct: r.percentBps / 100, flat: r.flatMinor ? (r.flatMinor / 100).toString() : '', cap: r.capMinor ? (r.capMinor / 100).toString() : '' })) }); }
async function save() {
  busy.value = true;
  const body = { name: dlg.name, description: dlg.description || undefined, rules: dlg.rules.map((r: any) => ({ channel: r.channel, percentBps: Math.round((r.pct || 0) * 100), flatMinor: r.flat ? toMinor(r.flat) : 0, capMinor: r.cap ? toMinor(r.cap) : undefined })) };
  try { dlg.id ? await put(`/ops/fee-plans/${dlg.id}`, body) : await post('/ops/fee-plans', body); dlg.open = false; ok('Fee plan saved'); load(); } catch (e) { fail(e); } finally { busy.value = false; }
}
async function makeDefault(p: any) { if (!(await confirmDialog({ title: 'Change the default fee plan?', message: `"${p.name}" becomes the plan for every merchant without a specific one. It applies to new payments only.`, confirmText: 'Make default' }))) return; try { await post(`/ops/fee-plans/${p.id}/default`); load(); } catch (e) { fail(e); } }
onMounted(load);
</script>
