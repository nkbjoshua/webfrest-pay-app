<template>
  <div>
    <PageHeader title="Risk" subtitle="Rules that flag or block suspicious payments, and the flags waiting for review." />
    <div class="tabs mb-5"><button :class="{ on: tab === 'flags' }" @click="tab = 'flags'">Flags</button><button :class="{ on: tab === 'rules' }" @click="tab = 'rules'">Rules</button></div>

    <DataTable v-if="tab === 'flags'" :columns="fcols" :rows="fl.rows.value" :loading="fl.loading.value" :total="fl.total.value" :page="fl.page.value" :per-page="fl.perPage" empty-title="No flags" empty-text="Nothing needs review." empty-icon="shield" @update:page="fl.page.value = $event">
      <template #toolbar><select v-model="fl.filters.resolved" class="field s-sm" style="max-width: 180px" aria-label="State"><option :value="false">Needs review</option><option :value="true">Reviewed</option><option value="">All</option></select></template>
      <template #cell-transaction="{ row }"><router-link :to="`/ops/transactions/${row.transaction.id}`" class="font-semibold">{{ row.transaction.reference }}</router-link><div class="text-[12.5px] text-muted">{{ row.merchant }} · {{ ghs(row.transaction.amount) }}</div></template>
      <template #cell-detail="{ row }">{{ row.detail }}</template>
      <template #cell-action="{ row }"><StatusBadge :status="row.action" /></template>
      <template #cell-at="{ row }">{{ ago(row.at) }}</template>
      <template #cell-actions="{ row }"><button v-if="!row.resolved && auth.opsDecider" class="btn s-sm" @click="resolve(row)">Mark reviewed</button><span v-else-if="row.resolved" class="text-muted text-[12.5px]">{{ row.resolvedBy }}</span></template>
    </DataTable>

    <template v-else>
      <div class="flex justify-end mb-3"><button v-if="auth.opsAdmin" class="btn primary" @click="openRule"><q-icon name="add" />New rule</button></div>
      <DataTable :columns="rcols" :rows="rules" :loading="rulesLoading" empty-title="No rules" empty-icon="rule">
        <template #cell-name="{ row }"><div class="font-semibold">{{ row.name }}</div><div class="text-[12.5px] text-muted">{{ describe(row) }}</div></template>
        <template #cell-action="{ row }"><StatusBadge :status="row.action" /></template>
        <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
        <template #cell-actions="{ row }"><div v-if="auth.opsAdmin" class="flex gap-1.5 justify-end"><button class="btn s-sm" @click="ruleAction(row, row.status === 'Active' ? 'pause' : 'resume')">{{ row.status === 'Active' ? 'Pause' : 'Resume' }}</button><button class="btn s-sm danger" @click="ruleAction(row, 'delete')">Delete</button></div></template>
      </DataTable>
    </template>

    <Modal v-model="dlg.open" title="New risk rule">
      <div><label class="field-label">Name</label><input v-model.trim="dlg.name" class="field" placeholder="e.g. Large payment" /></div>
      <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1"><div><label class="field-label">Rule</label><select v-model="dlg.type" class="field"><option value="MaxAmount">Payment above an amount</option><option value="VelocityEmail">Many payments from one email</option><option value="VelocityIp">Many payments from one IP</option><option value="BlockEmail">Block an email</option><option value="BlockDomain">Block an email domain</option></select></div>
        <div><label class="field-label">When it matches</label><select v-model="dlg.action" class="field"><option value="Flag">Flag for review</option><option value="Block">Block the payment</option></select></div></div>
      <div v-if="dlg.type === 'MaxAmount'"><label class="field-label">Amount (GHS)</label><input v-model="dlg.max" class="field" inputmode="decimal" /></div>
      <div v-else-if="dlg.type.startsWith('Velocity')" class="grid grid-cols-2 gap-3"><div><label class="field-label">Payments</label><input v-model.number="dlg.count" class="field" type="number" min="2" /></div><div><label class="field-label">Within (minutes)</label><input v-model.number="dlg.window" class="field" type="number" min="1" /></div></div>
      <div v-else><label class="field-label">{{ dlg.type === 'BlockEmail' ? 'Email address' : 'Domain (e.g. mailinator.com)' }}</label><input v-model.trim="dlg.value" class="field" /></div>
      <template #footer><button class="btn" @click="dlg.open = false">Cancel</button><button class="btn primary" :disabled="busy || !dlg.name" @click="createRule">Create rule</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { confirmDialog, promptDialog } from 'src/utils/confirm';
import { onMounted, reactive, ref, watch } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue';
import { useList } from 'src/composables/useList'; import { get, post, fail, ok } from 'src/services/api'; import { ghs, ago, toMinor } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth();
const tab = ref<'flags' | 'rules'>('flags');
const fcols = [{ key: 'transaction', label: 'Payment' }, { key: 'detail', label: 'Why flagged' }, { key: 'action', label: 'Action' }, { key: 'at', label: 'When' }, { key: 'actions', label: '' }];
const rcols = [{ key: 'name', label: 'Rule' }, { key: 'action', label: 'Action' }, { key: 'status', label: 'Status' }, { key: 'actions', label: '' }];
const fl = useList('/ops/risk/flags', { resolved: false }, { modeAware: false });
const rules = ref<any[]>([]); const rulesLoading = ref(true); const busy = ref(false);
const dlg = reactive<any>({ open: false, name: '', type: 'MaxAmount', action: 'Flag', max: '', count: 5, window: 10, value: '' });
const describe = (r: any) => ({ MaxAmount: () => `Payment above ${ghs(r.params.maxMinor)}`, VelocityEmail: () => `${r.params.count}+ payments from one email within ${r.params.windowMinutes} min`, VelocityIp: () => `${r.params.count}+ payments from one IP within ${r.params.windowMinutes} min`, BlockEmail: () => `Email ${r.params.value}`, BlockDomain: () => `Domain ${r.params.value}` } as any)[r.ruleType]?.() || r.ruleType;
async function loadRules() { rulesLoading.value = true; try { rules.value = (await get('/ops/risk/rules')).data; } catch (e) { fail(e); } finally { rulesLoading.value = false; } }
function openRule() { Object.assign(dlg, { open: true, name: '', type: 'MaxAmount', action: 'Flag', max: '', count: 5, window: 10, value: '' }); }
async function createRule() {
  busy.value = true;
  const params = dlg.type === 'MaxAmount' ? { maxMinor: toMinor(dlg.max) } : dlg.type.startsWith('Velocity') ? { count: dlg.count, windowMinutes: dlg.window } : { value: dlg.value };
  try { await post('/ops/risk/rules', { name: dlg.name, ruleType: dlg.type, action: dlg.action, params }); dlg.open = false; ok('Rule created'); loadRules(); } catch (e) { fail(e); } finally { busy.value = false; }
}
async function ruleAction(r: any, a: string) { if (!(await confirmDialog({ title: `${a === 'delete' ? 'Delete' : a.replace(/^./, (c) => c.toUpperCase())} this rule?`, message: `"${r.name}"${a === 'delete' ? ' will be removed for good.' : ''}`, confirmText: a === 'delete' ? 'Delete' : 'Yes', danger: a === 'delete' }))) return; try { await post(`/ops/risk/rules/${r.id}/${a}`); loadRules(); } catch (e) { fail(e); } }
async function resolve(row: any) { if (!(await confirmDialog({ title: 'Mark this flag as resolved?', message: 'It will leave the open list. Make sure you have looked at the payment first.', confirmText: 'Resolve' }))) return; try { await post(`/ops/risk/flags/${row.id}/resolve`); fl.reload(); } catch (e) { fail(e); } }
onMounted(loadRules); watch(tab, () => tab.value === 'rules' && loadRules());
</script>
