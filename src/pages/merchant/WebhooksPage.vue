<template>
  <div>
    <PageHeader title="Webhooks" subtitle="We notify your server the moment something happens - and retry until it lands.">
      <button class="btn primary" @click="openCreate"><q-icon name="add" />Add endpoint</button>
    </PageHeader>
    <div class="tabs mb-5"><button :class="{ on: tab === 'endpoints' }" @click="tab = 'endpoints'">Endpoints</button><button :class="{ on: tab === 'deliveries' }" @click="tab = 'deliveries'">Delivery log</button></div>

    <template v-if="tab === 'endpoints'">
      <DataTable :columns="epCols" :rows="endpoints" :loading="epLoading" empty-title="No endpoints yet" empty-text="Add the URL on your server that should receive events." empty-icon="webhook">
        <template #cell-url="{ row }"><div class="font-semibold" style="word-break: break-all">{{ row.url }}</div><div class="text-[12.5px] text-muted">{{ row.description }}</div></template>
        <template #cell-events="{ row }"><span class="text-[12.5px]">{{ row.events === '*' ? 'All events' : row.events.split(',').length + ' events' }}</span></template>
        <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
        <template #cell-actions="{ row }"><div class="flex gap-1.5 justify-end"><button class="btn s-sm" :disabled="testing === row.id" @click="test(row)"><q-icon name="send" />{{ testing === row.id ? 'Sending…' : 'Send test' }}</button><button class="btn s-sm" @click="toggle(row)">{{ row.status === 'Active' ? 'Disable' : 'Enable' }}</button><button class="btn s-sm danger" @click="remove(row)">Delete</button></div></template>
      </DataTable>
      <div class="card card-pad mt-6">
        <h3 class="font-bold mb-2">Verifying signatures</h3>
        <p class="text-muted text-[14px] mb-3">Each request has an <span class="mono">X-Webfrest-Signature: t=TIMESTAMP,v1=HEX</span> header. Compute <span class="mono">HMAC_SHA256(signing_secret, TIMESTAMP + "." + raw_body)</span> and compare. Reject anything older than 5 minutes.</p>
        <div class="code-block">const sig = req.headers['x-webfrest-signature'];            // "t=1727000000,v1=ab12…"
const [t, v1] = sig.split(',').map(p =&gt; p.split('=')[1]);
const expected = crypto.createHmac('sha256', SIGNING_SECRET).update(`${t}.${rawBody}`).digest('hex');
if (!crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected))) return res.sendStatus(400);</div>
      </div>
    </template>

    <DataTable v-else :columns="dCols" :rows="dl.rows.value" :loading="dl.loading.value" :total="dl.total.value" :page="dl.page.value" :per-page="dl.perPage" clickable empty-title="No deliveries yet" empty-text="Events appear here as they're sent." empty-icon="outbox" @update:page="dl.page.value = $event" @row="(r: any) => (view = r)">
      <template #toolbar><select v-model="dl.filters.status" class="field s-sm" style="max-width: 180px" aria-label="Status"><option value="">All</option><option>Delivered</option><option>Pending</option><option>Failed</option></select></template>
      <template #cell-eventType="{ row }"><div class="font-semibold">{{ row.eventType }}</div><div class="text-[12px] text-muted mono">{{ row.eventId }}</div></template>
      <template #cell-url="{ row }"><span class="text-[12.5px]" style="word-break: break-all">{{ row.url }}</span></template>
      <template #cell-status="{ row }"><StatusBadge :status="row.status" /><div class="text-[12px] text-muted mt-1">{{ row.responseCode ? 'HTTP ' + row.responseCode : row.error }}</div></template>
      <template #cell-createdAt="{ row }">{{ dt(row.createdAt) }}</template>
    </DataTable>

    <Modal v-model="create.open" title="Add webhook endpoint">
      <div><label class="field-label">Endpoint URL</label><input v-model.trim="create.url" class="field" placeholder="https://yourserver.com/webhooks/webfrest" /></div>
      <div><label class="field-label">Description (optional)</label><input v-model.trim="create.description" class="field" /></div>
      <div><label class="field-label">Events</label>
        <label class="flex items-center gap-2 text-[14px] mb-2"><input type="checkbox" v-model="create.all" /> All events</label>
        <div v-if="!create.all" class="grid grid-cols-2 gap-1.5 max-sm:grid-cols-1"><label v-for="e in eventTypes" :key="e" class="flex items-center gap-2 text-[13.5px]"><input type="checkbox" :value="e" v-model="create.events" /><span class="mono">{{ e }}</span></label></div></div>
      <template #footer><button class="btn" @click="create.open = false">Cancel</button><button class="btn primary" :disabled="busy || !create.url" @click="doCreate">{{ busy ? 'Adding…' : 'Add endpoint' }}</button></template>
    </Modal>
    <Modal v-model="secret.open" title="Signing secret" persistent>
      <p class="text-[14px]" style="color: rgb(var(--warn))"><b>Copy it now - it won't be shown again.</b></p>
      <div class="code-block flex items-center justify-between gap-3"><span style="white-space: normal; word-break: break-all">{{ secret.value }}</span><button class="btn s-sm" @click="doCopy"><q-icon name="content_copy" />Copy</button></div>
      <template #footer><button class="btn primary" @click="secret.open = false">Done</button></template>
    </Modal>
    <Modal v-model="viewOpen" :title="view?.eventType || ''" :width="680">
      <dl class="kv"><dt>Status</dt><dd><StatusBadge :status="view?.status" /> <span v-if="view?.responseCode" class="text-muted">HTTP {{ view.responseCode }}</span></dd><dt>Attempts</dt><dd>{{ view?.attempt }}</dd><dt v-if="view?.error">Error</dt><dd v-if="view?.error">{{ view.error }}</dd><dt v-if="view?.nextAttemptAt">Next attempt</dt><dd v-if="view?.nextAttemptAt">{{ dt(view.nextAttemptAt) }}</dd></dl>
      <div class="code-block">{{ pretty(view?.payload) }}</div>
      <template #footer><button class="btn" @click="replay"><q-icon name="replay" />Send again</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { confirmDialog, promptDialog } from 'src/utils/confirm';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue';
import { useList } from 'src/composables/useList'; import { get, post, patch, del, fail, ok } from 'src/services/api'; import { dt, copy } from 'src/utils/format'; import { useMode } from 'src/stores/mode';
const mode = useMode();
const tab = ref<'endpoints' | 'deliveries'>('endpoints');
const epCols = [{ key: 'url', label: 'Endpoint' }, { key: 'events', label: 'Events' }, { key: 'status', label: 'Status' }, { key: 'actions', label: '' }];
const dCols = [{ key: 'eventType', label: 'Event' }, { key: 'url', label: 'Endpoint' }, { key: 'status', label: 'Result' }, { key: 'createdAt', label: 'Sent' }];
const endpoints = ref<any[]>([]); const epLoading = ref(true); const eventTypes = ref<string[]>([]); const busy = ref(false); const testing = ref('');
const dl = useList('/dashboard/webhooks/deliveries', { status: '' });
const create = reactive({ open: false, url: '', description: '', all: true, events: [] as string[] }); const secret = reactive({ open: false, value: '' });
const view = ref<any>(null); const viewOpen = computed({ get: () => !!view.value, set: (v) => { if (!v) view.value = null; } });
const pretty = (s?: string) => { try { return JSON.stringify(JSON.parse(s || ''), null, 2); } catch { return s || ''; } };
async function load() { epLoading.value = true; try { endpoints.value = (await get('/dashboard/webhooks')).data; } catch (e) { fail(e); } finally { epLoading.value = false; } }
function openCreate() { Object.assign(create, { open: true, url: '', description: '', all: true, events: [] }); }
async function doCreate() {
  busy.value = true;
  try { const r = await post('/dashboard/webhooks', { url: create.url, description: create.description || undefined, events: create.all ? '*' : create.events.join(',') }); create.open = false; secret.value = r.data.secret; secret.open = true; load(); }
  catch (e) { fail(e); } finally { busy.value = false; }
}
async function test(row: any) { testing.value = row.id; try { const r = await post(`/dashboard/webhooks/${row.id}/test`); r.data.status === 'Delivered' ? ok('Your server accepted the test event') : fail({ message: `Your server didn't accept it (${r.data.responseCode || r.data.error || 'no response'})` }); dl.reload(); } catch (e) { fail(e); } finally { testing.value = ''; } }
async function toggle(row: any) { if (row.status === 'Active' && !(await confirmDialog({ title: 'Disable this endpoint?', message: 'No events will be sent to it until you enable it again.', confirmText: 'Disable', danger: true }))) return; try { await patch(`/dashboard/webhooks/${row.id}`, { status: row.status === 'Active' ? 'Disabled' : 'Active' }); load(); } catch (e) { fail(e); } }
async function remove(row: any) { if (!(await confirmDialog({ title: 'Delete this endpoint?', message: 'Pending deliveries to it are cancelled, and it cannot be brought back.', confirmText: 'Delete', danger: true }))) return; try { await del(`/dashboard/webhooks/${row.id}`); load(); } catch (e) { fail(e); } }
async function replay() { try { await post(`/dashboard/webhooks/deliveries/${view.value.id}/replay`); ok('Queued to send again'); view.value = null; dl.reload(); } catch (e) { fail(e); } }
async function doCopy() { if (await copy(secret.value)) ok('Copied'); }
onMounted(async () => { load(); try { eventTypes.value = (await get('/dashboard/webhooks/events')).data; } catch { /* ignore */ } });
watch(() => mode.tick, load);
</script>
