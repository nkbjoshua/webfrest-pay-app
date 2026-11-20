<template>
  <div>
    <PageHeader title="API keys" subtitle="Use a secret key from your server. Never put it in a website or mobile app.">
      <button class="btn primary" @click="openCreate"><q-icon name="add" />Create secret key</button>
    </PageHeader>

    <div class="card card-pad mb-6">
      <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))">
        <div><div class="text-[12.5px] font-semibold text-muted uppercase tracking-wide">API base URL</div><CopyText :text="API_ORIGIN" class="mt-1.5" /></div>
        <div v-for="k in pub" :key="k.mode"><div class="text-[12.5px] font-semibold text-muted uppercase tracking-wide">Public key · {{ k.mode }}</div><CopyText :text="k.key" class="mt-1.5" /></div>
      </div>
    </div>

    <DataTable :columns="cols" :rows="rows" :loading="loading" empty-title="No active keys" empty-text="Create a secret key to call the API." empty-icon="key">
      <template #cell-key="{ row }"><div class="mono font-semibold">{{ row.display }}</div><div class="text-[12.5px] text-muted">{{ row.label || 'Unnamed' }}</div></template>
      <template #cell-mode="{ row }"><span class="chip" :class="row.mode">{{ row.mode }}</span></template>
      <template #cell-lastUsedAt="{ row }">{{ row.lastUsedAt ? ago(row.lastUsedAt) : 'Never' }}</template>
      <template #cell-createdAt="{ row }">{{ day(row.createdAt) }}</template>
      <template #cell-actions="{ row }"><button v-if="row.type === 'secret'" class="btn s-sm danger" @click="revoke(row)">Revoke</button></template>
    </DataTable>

    <div class="card card-pad mt-6">
      <h3 class="font-bold mb-2">Quick start</h3>
      <p class="text-muted text-[14px] mb-3">Create a payment, then send your customer to <span class="mono">authorizationUrl</span>.</p>
      <div class="code-block">curl {{ API_ORIGIN }}/v1/transactions/initialize \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Idempotency-Key: order-1001" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 15000, "email": "ama@example.com", "reference": "order-1001",
        "callbackUrl": "https://yoursite.com/thanks" }'</div>
      <p class="text-muted text-[13px] mt-3">Amounts are in pesewas (15000 = GH₵150.00). We send <span class="mono">charge.success</span> to your webhook when the payer completes the payment - always verify with <span class="mono">GET /v1/transactions/verify/:reference</span> before delivering value.</p>
    </div>

    <Modal v-model="create.open" title="Create secret key">
      <div><label class="field-label">Label</label><input v-model.trim="create.label" class="field" placeholder="e.g. Production server" /></div>
      <div><label class="field-label">Mode</label><select v-model="create.mode" class="field"><option value="test">Test</option><option value="live" :disabled="!auth.merchant?.liveEnabled">Live{{ auth.merchant?.liveEnabled ? '' : ' (locked until approved)' }}</option></select></div>
      <div><label class="field-label">Allowed IP addresses (optional)</label><input v-model.trim="create.ips" class="field" placeholder="203.0.113.5, 203.0.113.6" /><p class="field-hint">Comma-separated. Leave blank to allow any address.</p></div>
      <template #footer><button class="btn" @click="create.open = false">Cancel</button><button class="btn primary" :disabled="busy" @click="doCreate">{{ busy ? 'Creating…' : 'Create key' }}</button></template>
    </Modal>
    <Modal v-model="shown.open" title="Copy your new key" persistent>
      <p class="text-[14px]" style="color: rgb(var(--warn))"><b>This is the only time you'll see it.</b> Store it in your server's environment variables.</p>
      <div class="code-block flex items-center justify-between gap-3"><span style="white-space: normal; word-break: break-all">{{ shown.secret }}</span><button class="btn s-sm" @click="doCopy"><q-icon name="content_copy" />Copy</button></div>
      <template #footer><button class="btn primary" @click="shown.open = false">I've saved it</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { confirmDialog, promptDialog } from 'src/utils/confirm';
import { onMounted, reactive, ref, watch } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import Modal from 'src/components/Modal.vue'; import CopyText from 'src/components/CopyText.vue';
import { get, post, del, fail, ok } from 'src/services/api'; import { ago, day, copy, API_ORIGIN } from 'src/utils/format'; import { useAuth } from 'src/stores/auth'; import { useMode } from 'src/stores/mode';
const auth = useAuth(); const mode = useMode();
const cols = [{ key: 'key', label: 'Key' }, { key: 'mode', label: 'Mode' }, { key: 'lastUsedAt', label: 'Last used' }, { key: 'createdAt', label: 'Created' }, { key: 'actions', label: '' }];
const rows = ref<any[]>([]); const pub = ref<any[]>([]); const loading = ref(true); const busy = ref(false);
const create = reactive({ open: false, label: '', mode: 'test', ips: '' }); const shown = reactive({ open: false, secret: '' });
async function load() { try { rows.value = (await get('/dashboard/api-keys')).data.filter((k: any) => k.type === 'secret'); pub.value = (await get('/dashboard/public-keys')).data; } catch (e) { fail(e); } finally { loading.value = false; } }
function openCreate() { Object.assign(create, { open: true, label: '', mode: mode.mode, ips: '' }); }
async function doCreate() {
  busy.value = true;
  try { const r = await post('/dashboard/api-keys', { label: create.label || undefined, mode: create.mode, allowedIps: create.ips || undefined }); create.open = false; shown.secret = r.data.secret; shown.open = true; load(); }
  catch (e) { fail(e); } finally { busy.value = false; }
}
async function revoke(row: any) { if (!(await confirmDialog({ title: 'Revoke this key?', message: `${row.display}\nAnything using it will stop working immediately, and it cannot be restored.`, confirmText: 'Revoke key', danger: true }))) return; try { await del(`/dashboard/api-keys/${row.id}`); ok('Key revoked'); load(); } catch (e) { fail(e); } }
async function doCopy() { if (await copy(shown.secret)) ok('Copied'); }
onMounted(load); watch(() => mode.tick, () => {});
</script>
