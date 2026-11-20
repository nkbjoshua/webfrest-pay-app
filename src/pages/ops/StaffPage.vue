<template>
  <div>
    <PageHeader title="Staff" subtitle="Webfrest team members with access to this console.">
      <button class="btn primary" @click="openAdd"><q-icon name="person_add" />Add staff</button>
    </PageHeader>
    <DataTable :columns="cols" :rows="rows" :loading="loading" empty-title="No staff">
      <template #cell-name="{ row }"><div class="font-semibold">{{ row.name }}<span v-if="row.id === auth.user.id" class="text-muted font-normal"> (you)</span></div><div class="text-[12.5px] text-muted">{{ row.email }}</div></template>
      <template #cell-role="{ row }">{{ ROLES[row.role] }}</template>
      <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
      <template #cell-twoFactor="{ row }"><span :class="row.twoFactor ? 'font-semibold' : 'text-muted'">{{ row.twoFactor ? 'On' : 'Off' }}</span></template>
      <template #cell-lastLoginAt="{ row }">{{ row.lastLoginAt ? ago(row.lastLoginAt) : 'Never' }}</template>
      <template #cell-actions="{ row }"><div v-if="row.id !== auth.user.id" class="flex gap-1.5 justify-end"><button v-if="row.twoFactor" class="btn s-sm" :disabled="busy" title="For someone who lost their phone and recovery codes" @click="resetTf(row)">Reset 2FA</button><button class="btn s-sm" @click="openEdit(row)">Edit</button></div></template>
    </DataTable>
    <div class="card card-pad mt-6 text-[13.5px]"><b>Roles.</b> <b>Support</b> can look but not change. <b>Approver</b> reviews merchants, bank accounts and payouts. <b>Admin</b> also controls providers, routing, fees and staff. Nobody can approve a payout they created.</div>
    <Modal v-model="add.open" title="Add staff member">
      <div><label class="field-label">Full name</label><input v-model.trim="add.fullName" class="field" /></div><div><label class="field-label">Email</label><input v-model.trim="add.email" class="field" type="email" /></div>
      <div><label class="field-label">Role</label><select v-model="add.role" class="field"><option v-for="(l, k) in ROLES" :key="k" :value="k">{{ l }}</option></select></div>
      <div><label class="field-label">Temporary password</label><input v-model="add.password" class="field" autocomplete="off" /><p class="field-hint">They'll be asked to change it at first sign-in.</p></div>
      <template #footer><button class="btn" @click="add.open = false">Cancel</button><button class="btn primary" :disabled="busy" @click="doAdd">Add</button></template>
    </Modal>
    <Modal v-model="edit.open" :title="`Edit ${edit.row?.name}`">
      <div><label class="field-label">Role</label><select v-model="edit.role" class="field"><option v-for="(l, k) in ROLES" :key="k" :value="k">{{ l }}</option></select></div>
      <div><label class="field-label">Access</label><select v-model="edit.status" class="field"><option>Active</option><option>Disabled</option></select></div>
      <template #footer><button class="btn" @click="edit.open = false">Cancel</button><button class="btn primary" :disabled="busy" @click="doEdit">Save</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { confirmDialog, promptDialog } from 'src/utils/confirm';
import { onMounted, reactive, ref } from 'vue';
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue'; import StatusBadge from 'src/components/StatusBadge.vue'; import Modal from 'src/components/Modal.vue';
import { get, post, patch, fail, ok } from 'src/services/api'; import { ago } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth();
const ROLES: Record<string, string> = { OpsAdmin: 'Admin', OpsApprover: 'Approver', OpsSupport: 'Support' };
const cols = [{ key: 'name', label: 'Member' }, { key: 'role', label: 'Role' }, { key: 'status', label: 'Access' }, { key: 'twoFactor', label: '2FA' }, { key: 'lastLoginAt', label: 'Last sign-in' }, { key: 'actions', label: '' }];
const rows = ref<any[]>([]); const loading = ref(true); const busy = ref(false);
const add = reactive({ open: false, fullName: '', email: '', role: 'OpsSupport', password: '' }); const edit = reactive<any>({ open: false, row: null, role: '', status: '' });
async function load() { try { rows.value = (await get('/ops/staff')).data; } catch (e) { fail(e); } finally { loading.value = false; } }
function openAdd() { Object.assign(add, { open: true, fullName: '', email: '', role: 'OpsSupport', password: '' }); }
async function doAdd() { busy.value = true; try { const r = await post('/ops/staff', { fullName: add.fullName, email: add.email, role: add.role, password: add.password }); add.open = false; ok(r.message); load(); } catch (e) { fail(e); } finally { busy.value = false; } }
function openEdit(row: any) { Object.assign(edit, { open: true, row, role: row.role, status: row.status }); }
async function doEdit() { if (edit.status === 'Disabled' && edit.row?.status !== 'Disabled' && !(await confirmDialog({ title: `Disable ${edit.row.name}?`, message: 'They will not be able to sign in any more.', confirmText: 'Disable access', danger: true }))) return; busy.value = true; try { await patch(`/ops/staff/${edit.row.id}`, { role: edit.role, status: edit.status }); edit.open = false; ok('Saved'); load(); } catch (e) { fail(e); } finally { busy.value = false; } }
async function resetTf(row: any) { if (!(await confirmDialog({ title: `Reset two-factor for ${row.name}?`, message: 'They will be able to sign in with just their password until they set it up again. Only do this once you are sure it is really them asking.', confirmText: 'Reset 2FA', danger: true }))) return; busy.value = true; try { const r = await post(`/ops/users/${row.id}/reset-2fa`); ok(r.message); load(); } catch (e) { fail(e); } finally { busy.value = false; } }
onMounted(load);
</script>
