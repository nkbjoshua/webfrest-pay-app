<template>
  <div>
    <PageHeader title="Platform settings" subtitle="Limits, fees and timings that apply across Webfrest Pay. A change takes effect straight away for new payments and payouts.">
      <button class="btn primary" :disabled="busy || loading || !dirty" @click="save"><q-icon name="save" />{{ busy ? 'Saving…' : dirty ? 'Save changes' : 'No changes' }}</button>
    </PageHeader>
    <div v-if="loading" class="skeleton" style="height: 320px"></div>
    <div v-else class="grid gap-5" style="max-width: 900px">
      <section v-for="g in groups" :key="g.title" class="card card-pad">
        <div class="flex items-center gap-2.5"><q-icon :name="g.icon" size="22px" style="color: rgb(var(--brand))" /><h3 class="font-bold text-[16px]">{{ g.title }}</h3></div>
        <p class="text-[13px] text-muted mt-1 mb-2">{{ g.subtitle }}</p>
        <div v-for="s in g.items" :key="s.key" class="setting-row">
          <div><label class="s-label" :for="s.key">{{ s.meta.label }}</label><p class="s-hint">{{ s.meta.hint }}<span v-if="s.updatedBy" class="whitespace-nowrap"> · changed by {{ s.updatedBy }}</span></p></div>
          <div class="input-unit" :class="{ pre: s.meta.kind === 'money' }">
            <input :id="s.key" v-model="form[s.key]" class="field" :type="s.meta.kind === 'time' ? 'time' : 'text'" :inputmode="inputMode(s.meta.kind)" :placeholder="s.meta.placeholder" :style="s.meta.kind === 'text' ? 'text-align: left; padding-right: 13px' : ''" />
            <span v-if="unitOf(s.meta)" class="unit">{{ unitOf(s.meta) }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
<script setup lang="ts">
import { confirmDialog, promptDialog } from 'src/utils/confirm';
import { computed, onMounted, reactive, ref } from 'vue';
import PageHeader from 'src/components/PageHeader.vue';
import { get, put, fail, ok } from 'src/services/api'; import { toMinor } from 'src/utils/format';

type Kind = 'money' | 'int' | 'percent' | 'time' | 'text' | 'email' | 'url';
const META: Record<string, { label: string; hint: string; kind: Kind; unit?: string; placeholder?: string; group: string }> = {
  'payment.expiry_minutes': { label: 'Payment expiry', hint: 'How long a payer has to finish a payment before it expires.', kind: 'int', unit: 'min', group: 'payments' },
  'payment.max_amount_minor': { label: 'Default per-payment limit', hint: 'Payments above this are refused. A merchant can be given its own limit.', kind: 'money', group: 'payments' },
  'payout.min_amount_minor': { label: 'Minimum payout', hint: 'The smallest payout a merchant can request. Smaller daily batches roll into the next day.', kind: 'money', group: 'payouts' },
  'payout.max_amount_minor': { label: 'Largest single payout', hint: 'A payout above this is split into several transfers. The bank has its own ceiling too, and the lower one wins.', kind: 'money', group: 'payouts' },
  'payout.auto_approve_below_minor': { label: 'Approve small payouts automatically', hint: 'Payouts below this amount are approved without anyone clicking. 0 means every payout needs approval.', kind: 'money', group: 'payouts' },
  'payout.fee_flat_minor': { label: 'Flat payout fee', hint: 'Taken from the school on every payout, on top of the percentage below. 0 for none.', kind: 'money', group: 'fees' },
  'payout.fee_bps': { label: 'Payout fee, percentage', hint: "Fidelity charges 1% per bank transfer, so this passes it on to the school. 0 if Webfrest absorbs it.", kind: 'percent', unit: '%', group: 'fees' },
  'payout.fee_cap_minor': { label: 'Payout fee cap', hint: 'The most the percentage fee can be on one transfer (Fidelity caps its own fee at GH₵10).', kind: 'money', group: 'fees' },
  'settlement.batch_time': { label: 'Daily batch runs at', hint: 'When the daily payout batch is built for schools on daily settlement. Accra time. It runs every day, including weekends and holidays.', kind: 'time', group: 'settlement' },
  'settlement.instant_interval_minutes': { label: 'Instant payouts every', hint: 'For schools on Instant settlement, how often confirmed payments are paid out. 0 pays each payment on its own.', kind: 'int', unit: 'min', group: 'instant' },
  'instant.daily_limit_minor': { label: 'Instant payout limit per school, per day', hint: 'Above this, instant payouts wait for approval in the daily batch.', kind: 'money', group: 'instant' },
  'instant.min_account_age_days': { label: 'Bank account must be verified for', hint: 'A school only gets instant payouts once its bank account has been verified this long. A guard against changed account details.', kind: 'int', unit: 'days', group: 'instant' },
  'recon.statement_time': { label: 'Pull the bank statement at', hint: "When yesterday's statement is fetched from Fidelity and matched to our records. Accra time.", kind: 'time', group: 'recon' },
  'recon.fee_tolerance_minor': { label: 'Fee difference to ignore', hint: "A payment matches the bank's record if the bank's fee differs from our estimate by no more than this.", kind: 'money', group: 'recon' },
  'checkout.public_base_url': { label: 'Public checkout address', hint: 'Where payers land. Used when building payment links.', kind: 'url', placeholder: 'https://pay.example.com', group: 'general' },
  'support.email': { label: 'Support email', hint: 'Shown to merchants and payers when something goes wrong.', kind: 'email', placeholder: 'support@example.com', group: 'general' },
};
const GROUPS = [
  { id: 'payments', title: 'Payments', icon: 'receipt_long', subtitle: 'What payers can do at checkout.' },
  { id: 'payouts', title: 'Payouts', icon: 'account_balance', subtitle: 'How money leaves Webfrest Pay for schools and merchants.' },
  { id: 'fees', title: 'Payout fees', icon: 'percent', subtitle: 'The bank charges a fee for each transfer; this is what is passed on to the school.' },
  { id: 'settlement', title: 'Daily settlement', icon: 'event_repeat', subtitle: 'The once-a-day bulk payout.' },
  { id: 'instant', title: 'Instant settlement', icon: 'bolt', subtitle: 'For schools that choose to be paid as payments confirm.' },
  { id: 'recon', title: 'Reconciliation', icon: 'fact_check', subtitle: "Checking our records against the bank's statement." },
  { id: 'general', title: 'General', icon: 'tune', subtitle: '' },
];
const all = ref<any[]>([]); const loading = ref(true); const busy = ref(false); const form = reactive<Record<string, string>>({}); const original = reactive<Record<string, string>>({});
const metaOf = (key: string) => META[key] || { label: key, hint: 'No description yet.', kind: 'text' as Kind, group: 'general' };
const groups = computed(() => GROUPS.map((g) => ({ ...g, items: all.value.filter((s) => s.editable && metaOf(s.key).group === g.id).map((s) => ({ ...s, meta: metaOf(s.key) })) })).filter((g) => g.items.length));
const dirty = computed(() => Object.keys(form).some((k) => form[k] !== original[k]));
const unitOf = (m: any) => (m.kind === 'money' ? 'GH₵' : m.unit);
const inputMode = (k: Kind) => (k === 'money' || k === 'percent' ? 'decimal' : k === 'int' ? 'numeric' : undefined);
const show = (key: string, v: string | null) => { if (v == null || v === '') return ''; const k = metaOf(key).kind; return k === 'money' || k === 'percent' ? String(Number(v) / 100) : v; };
const toApi = (key: string, v: string) => { const k = metaOf(key).kind; return k === 'money' ? String(toMinor(v || '0')) : k === 'percent' ? String(Math.round(parseFloat(v || '0') * 100)) : v; };
async function load() {
  try { all.value = (await get('/ops/settings')).data; for (const s of all.value) { form[s.key] = show(s.key, s.value); original[s.key] = form[s.key]; } }
  catch (e) { fail(e); } finally { loading.value = false; }
}
async function save() {
  const n = all.value.filter((x) => x.editable && form[x.key] !== original[x.key]).length;
  if (!(await confirmDialog({ title: 'Save these settings?', message: `${n} setting${n === 1 ? '' : 's'} will change for the whole platform, straight away. Fees and limits apply to new payments and payouts.`, confirmText: 'Save changes', icon: 'save' }))) return;
  busy.value = true;
  const values: Record<string, string> = {};
  for (const s of all.value.filter((x) => x.editable)) if (form[s.key] !== original[s.key]) values[s.key] = toApi(s.key, form[s.key]);
  try { await put('/ops/settings', { values }); ok('Settings saved'); await load(); } catch (e) { fail(e); } finally { busy.value = false; }
}
onMounted(load);
</script>
