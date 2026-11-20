<template>
  <div>
    <PageHeader title="Email" subtitle="Receipts and notices, delivered through PingFrest. Use the built-in designs, or paste your own HTML and make each email look the way you want.">
      <button class="btn" @click="tab = tab === 'templates' ? 'log' : 'templates'"><q-icon :name="tab === 'templates' ? 'history' : 'edit_note'" />{{ tab === 'templates' ? 'Sent emails' : 'Designs' }}</button>
    </PageHeader>

    <div v-if="status" class="card card-pad flex items-center gap-4 flex-wrap mb-5" :style="status.configured ? '' : 'border-color: rgb(var(--warn) / 0.6)'">
      <span class="stat-ic" :style="status.configured ? 'background: rgb(var(--ok) / 0.12); color: rgb(var(--ok))' : 'background: rgb(var(--warn) / 0.15); color: rgb(var(--warn))'"><q-icon :name="status.configured ? 'mark_email_read' : 'unsubscribe'" size="24px" /></span>
      <div class="flex-1 min-w-0">
        <div class="font-semibold">{{ status.configured ? 'Connected to PingFrest' : 'PingFrest isn\'t connected yet' }}</div>
        <div class="text-[13.5px] text-muted">{{ status.configured ? `Emails are written here (design, merchant, payer) and delivered by PingFrest, under the name "${status.fromName}". Which provider carries them, and whether a message was delivered, is shown in the PingFrest console.` : status.problem + ' Add it to the API settings (see below), then restart the API.' }}</div>
      </div>
    </div>
    <div v-if="status && !status.configured" class="hint-box mb-5">
      <b>To connect PingFrest:</b> in the API settings (<span class="mono">appsettings.Development.json</span> or the production environment) set <span class="mono">PingFrest:BaseUrl</span>, <span class="mono">PingFrest:LiveKey</span> (real messages) and <span class="mono">PingFrest:TestKey</span> (test-mode payments, which PingFrest only simulates). Both keys come from PingFrest → Clients &amp; keys → Webfrest Pay.
    </div>

    <template v-if="tab === 'templates'">
      <div class="grid gap-5 max-lg:!grid-cols-1" style="grid-template-columns: 270px minmax(0, 1fr)">
        <div class="grid gap-2 content-start">
          <button v-for="k in kinds" :key="k.key" class="kind" :class="{ on: sel === k.key }" @click="select(k.key)">
            <span class="font-semibold text-[14px]">{{ k.name }}</span>
            <span class="text-[12.5px] text-muted">{{ k.description }}</span>
            <span class="flex items-center gap-2 mt-1.5"><span class="badge plain" :class="k.source === 'built-in' ? '' : 'ok'">{{ k.source === 'built-in' ? 'Built-in design' : k.source === 'merchant' ? 'Merchant\'s own' : 'Your design' }}</span><span class="text-[11.5px] text-muted">to {{ k.audience.toLowerCase() }}</span></span>
          </button>
        </div>

        <div v-if="loading" class="skeleton" style="height: 420px"></div>
        <div v-else-if="ed.key" class="grid gap-4 content-start">
          <div class="card card-pad grid gap-4">
            <div class="flex items-center gap-3 flex-wrap"><h3 class="font-bold text-[16px]">{{ ed.name }}</h3><span class="badge plain" :class="ed.source === 'built-in' ? '' : 'ok'">{{ ed.source === 'built-in' ? 'Using the built-in design' : 'Using your design' }}</span><div class="flex-1"></div>
              <button class="btn s-sm" @click="restore" :title="'Replace what is in the editor with the built-in design (not saved until you save)'"><q-icon name="restart_alt" />Start from built-in</button></div>
            <div><label class="field-label">Subject</label><input v-model="ed.subject" class="field" :disabled="!canEdit" /></div>
            <div>
              <div class="flex items-center justify-between mb-1.5"><label class="field-label" style="margin: 0">HTML</label><span class="text-[12px] text-muted">Paste or write your own. Inline styles work best in email.</span></div>
              <textarea ref="htmlBox" v-model="ed.html" class="field mono" rows="16" spellcheck="false" :disabled="!canEdit" style="font-size: 12.5px; line-height: 1.55; white-space: pre; overflow: auto"></textarea>
              <div class="flex flex-wrap gap-1.5 mt-2"><span class="text-[12px] text-muted mr-1 pt-1">Insert a value:</span><button v-for="v in ed.variables" :key="v" class="var-chip" :disabled="!canEdit" @click="insert(v)" v-text="'{{' + v + '}}'"></button></div>
              <p class="field-hint">Values are filled in when the email is sent, and made safe automatically. Show a block only when a value exists with <span class="mono" v-pre>{{#if retry_url}}…{{/if}}</span>.</p>
            </div>
            <div><label class="field-label">Plain text version (optional, for email apps that can't show HTML)</label><textarea v-model="ed.text" class="field mono" rows="5" spellcheck="false" :disabled="!canEdit" style="font-size: 12.5px"></textarea></div>
            <div v-if="canEdit" class="flex gap-2 flex-wrap justify-end">
              <button v-if="ed.source !== 'built-in'" class="btn danger" :disabled="busy" @click="reset"><q-icon name="undo" />Go back to the built-in design</button>
              <button class="btn" :disabled="busy || !status?.configured" :title="status?.configured ? '' : 'Connect PingFrest first'" @click="testOpen = true"><q-icon name="send" />Send a test</button>
              <button class="btn primary" :disabled="busy || !dirty" @click="save"><q-icon name="save" />{{ busy ? 'Saving…' : dirty ? 'Save design' : 'Saved' }}</button>
            </div>
          </div>

          <div class="card card-pad">
            <div class="flex items-center gap-3 mb-3"><h3 class="font-bold text-[16px]">Preview</h3><span class="text-[12.5px] text-muted">with sample values</span><div class="flex-1"></div>
              <div class="seg"><button :class="{ on: width === 'desk' }" @click="width = 'desk'"><q-icon name="desktop_windows" size="18px" /></button><button :class="{ on: width === 'phone' }" @click="width = 'phone'"><q-icon name="smartphone" size="18px" /></button></div></div>
            <div class="text-[13px] mb-2"><span class="text-muted">Subject:</span> <b>{{ prev.subject }}</b></div>
            <div class="preview-frame" :class="width"><iframe :srcdoc="prev.html" sandbox="" title="Email preview" referrerpolicy="no-referrer"></iframe></div>
          </div>
        </div>
      </div>
    </template>

    <DataTable v-else :columns="cols" :rows="rows" :loading="logLoading" :total="total" :page="page" :per-page="perPage" :page-sizes="[25, 50, 100]" noun="emails" empty-title="No emails sent yet" empty-text="Emails you send, or that Webfrest sends, are listed here." empty-icon="mail" @update:page="page = $event" @update:per-page="perPage = $event">
      <template #toolbar>
        <div class="filters-row">
          <input v-model="filters.q" class="field s-sm" style="max-width: 280px" placeholder="Address, subject or message id…" aria-label="Search" />
          <select v-model="filters.status" class="field s-sm" style="max-width: 150px" aria-label="Status"><option value="">All</option><option>Sent</option><option>Failed</option></select>
          <select v-model="filters.key" class="field s-sm" style="max-width: 200px" aria-label="Kind"><option value="">Every kind</option><option v-for="k in kinds" :key="k.key" :value="k.key">{{ k.name }}</option></select>
        </div>
      </template>
      <template #cell-at="{ row }">{{ dt(row.at) }}</template>
      <template #cell-to="{ row }"><div class="font-semibold">{{ row.to }}</div><div class="text-[12px] text-muted">{{ row.sentBy ? 'by ' + row.sentBy : 'automatic' }}</div></template>
      <template #cell-subject="{ row }"><div class="truncate" style="max-width: 360px" :title="row.subject">{{ row.subject }}</div><div v-if="row.error" class="text-[12px]" style="color: rgb(var(--bad))">{{ row.error }}</div></template>
      <template #cell-key="{ row }"><span class="mono">{{ row.key || '-' }}</span></template>
      <template #cell-status="{ row }"><StatusBadge :status="row.status" /><div class="text-[12px] text-muted mt-1">{{ row.mode === 'test' ? 'test mode (simulated)' : row.messageId }}</div></template>
    </DataTable>

    <Modal v-model="testOpen" title="Send a test email" :width="460" :persistent="testing">
      <p class="text-[13.5px] text-muted">Sends what is in the editor right now (even if it isn't saved), with sample values, to the address below (it goes through PingFrest, live mode).</p>
      <div><label class="field-label">Send to</label><input v-model.trim="testTo" class="field" type="email" placeholder="you@example.com" @keyup.enter="sendTest" /></div>
      <div v-if="testError" class="text-[13.5px]" style="color: rgb(var(--bad))" role="alert">{{ testError }}</div>
      <template #footer><button class="btn" :disabled="testing" @click="testOpen = false">Cancel</button><button class="btn primary" :disabled="testing || !testTo" @click="sendTest">{{ testing ? 'Sending…' : 'Send test' }}</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue';
import { useList } from 'src/composables/useList'; import { get, post, put, del, fail, ok } from 'src/services/api'; import { dt } from 'src/utils/format'; import { useAuth } from 'src/stores/auth'; import { confirmDialog } from 'src/utils/confirm';
const auth = useAuth(); const canEdit = computed(() => auth.opsAdmin);
const tab = ref<'templates' | 'log'>('templates'); const status = ref<any>(null); const kinds = ref<any[]>([]); const sel = ref(''); const loading = ref(true); const busy = ref(false);
const ed = reactive<any>({ key: '', name: '', source: 'built-in', subject: '', html: '', text: '', variables: [], builtIn: null }); const orig = ref('');
const prev = reactive({ subject: '', html: '' }); const width = ref<'desk' | 'phone'>('desk'); const htmlBox = ref<HTMLTextAreaElement | null>(null);
const snapshot = () => JSON.stringify([ed.subject, ed.html, ed.text]);
const dirty = computed(() => snapshot() !== orig.value);

async function loadKinds() { kinds.value = (await get('/ops/email/templates')).data; }
async function select(key: string) {
  if (dirty.value && sel.value && !(await confirmDialog({ title: 'Leave without saving?', message: 'You changed this design and haven\'t saved it.', confirmText: 'Leave', danger: true }))) return;
  sel.value = key; loading.value = true;
  try { const r = (await get(`/ops/email/templates/${key}`)).data; Object.assign(ed, { key: r.key, name: r.name, source: r.source, subject: r.subject, html: r.html, text: r.text || '', variables: r.variables, builtIn: r.builtIn }); orig.value = snapshot(); refreshPreview(); }
  catch (e) { fail(e); } finally { loading.value = false; }
}
let t: any;
async function refreshPreview() { try { const r = (await post(`/ops/email/preview?key=${ed.key}`, { subject: ed.subject, html: ed.html, text: ed.text })).data; prev.subject = r.subject; prev.html = r.html; } catch { /* the preview is a nicety */ } }
watch(() => [ed.subject, ed.html], () => { clearTimeout(t); t = setTimeout(refreshPreview, 350); });
function insert(v: string) {
  const el = htmlBox.value; const tag = `{{${v}}}`;
  if (!el) { ed.html += tag; return; }
  const a = el.selectionStart ?? ed.html.length, b = el.selectionEnd ?? a; ed.html = ed.html.slice(0, a) + tag + ed.html.slice(b);
  nextTick(() => { el.focus(); el.selectionStart = el.selectionEnd = a + tag.length; });
}
function restore() { ed.subject = ed.builtIn.subject; ed.html = ed.builtIn.html; ed.text = ed.builtIn.text || ''; }
async function save() { busy.value = true; try { await put(`/ops/email/templates/${ed.key}`, { subject: ed.subject, html: ed.html, text: ed.text }); ok('Saved. New emails use this design.'); ed.source = 'platform'; orig.value = snapshot(); await loadKinds(); } catch (e) { fail(e); } finally { busy.value = false; } }
async function reset() {
  if (!(await confirmDialog({ title: 'Go back to the built-in design?', message: 'Your own HTML for this email will be deleted.', confirmText: 'Go back', danger: true }))) return;
  busy.value = true; try { await del(`/ops/email/templates/${ed.key}`); ok('Back to the built-in design'); const k = ed.key; orig.value = ''; sel.value = ''; await loadKinds(); await select(k); } catch (e) { fail(e); } finally { busy.value = false; }
}
const testOpen = ref(false); const testing = ref(false); const testTo = ref(auth.user?.email || ''); const testError = ref('');
async function sendTest() {
  testing.value = true; testError.value = '';
  try { const r = await post('/ops/email/test', { to: testTo.value, key: ed.key, subject: ed.subject, html: ed.html, text: ed.text }); testOpen.value = false; ok(r.message); reloadLog(); } catch (e: any) { testError.value = e.message; } finally { testing.value = false; }
}

// sent log
const cols = [{ key: 'at', label: 'When' }, { key: 'to', label: 'To' }, { key: 'subject', label: 'Subject' }, { key: 'key', label: 'Kind' }, { key: 'status', label: 'Result' }];
const { filters, rows, total, page, perPage, loading: logLoading, reload: reloadLog } = useList('/ops/email/log', { q: '', status: '', key: '' }, { modeAware: false });
onMounted(async () => { try { status.value = (await get('/ops/email/status')).data; await loadKinds(); await select(kinds.value[0]?.key); } catch (e) { fail(e); } finally { loading.value = false; } });
</script>
<style scoped>
.stat-ic { width: 46px; height: 46px; border-radius: 13px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.kind { display: flex; flex-direction: column; gap: 2px; text-align: left; padding: 13px 14px; border-radius: 14px; border: 1.5px solid rgb(var(--line)); background: rgb(var(--surface)); color: rgb(var(--ink)); cursor: pointer; font-family: Inter, sans-serif; }
.kind:hover { border-color: rgb(var(--brand) / 0.5); } .kind.on { border-color: rgb(var(--brand)); background: rgb(var(--brand) / 0.06); box-shadow: 0 0 0 3px rgb(var(--brand) / 0.12); }
.var-chip { font: 600 11.5px ui-monospace, Menlo, monospace; padding: 3px 8px; border-radius: 7px; border: 1px solid rgb(var(--line)); background: rgb(var(--sunken)); color: rgb(var(--ink)); cursor: pointer; }
.var-chip:hover:not(:disabled) { border-color: rgb(var(--brand) / 0.6); color: rgb(var(--brand)); } .var-chip:disabled { opacity: 0.5; cursor: default; }
.seg { display: inline-flex; background: rgb(var(--sunken)); border-radius: 10px; padding: 3px; } .seg button { border: 0; background: none; padding: 5px 10px; border-radius: 8px; cursor: pointer; color: rgb(var(--muted)); } .seg button.on { background: rgb(var(--surface)); color: rgb(var(--brand)); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }
.preview-frame { border: 1px solid rgb(var(--line)); border-radius: 12px; background: #f4f7f5; overflow: hidden; margin: 0 auto; transition: width 0.2s; } .preview-frame.desk { width: 100%; } .preview-frame.phone { width: 380px; max-width: 100%; }
.preview-frame iframe { width: 100%; height: 640px; border: 0; display: block; background: #f4f7f5; }
</style>
