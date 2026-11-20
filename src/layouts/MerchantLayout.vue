<template>
  <AppShell area="Merchant dashboard" :groups="groups">
    <template #actions><ModeSwitch /></template>
    <template #banner>
      <div v-if="auth.merchant?.status === 'Pending'" class="px-7 py-3 text-[13.5px] flex items-center gap-2" style="background: rgb(var(--warn) / 0.12); color: rgb(var(--warn))"><q-icon name="hourglass_top" size="18px" /><span><b>Your business is under review.</b> You can build and test with your test keys now. Live payments unlock once Webfrest Operations approves you.</span></div>
      <div v-else-if="['Rejected', 'Suspended'].includes(auth.merchant?.status)" class="px-7 py-3 text-[13.5px] flex items-center gap-2" style="background: rgb(var(--bad) / 0.12); color: rgb(var(--bad))"><q-icon name="block" size="18px" /><span><b>Your account is {{ auth.merchant?.status.toLowerCase() }}.</b> {{ auth.merchant?.reviewNote }}</span></div>
      <div v-else-if="!mode.isLive" class="px-7 py-2 text-[13px] flex items-center gap-2" style="background: rgb(var(--warn) / 0.1); color: rgb(var(--warn))"><q-icon name="science" size="17px" /><span><b>Test mode.</b> No real money moves. Everything you see here is sandbox data.</span></div>
    </template>
  </AppShell>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import AppShell from 'src/components/AppShell.vue';
import ModeSwitch from 'src/components/ModeSwitch.vue';
import { useAuth } from 'src/stores/auth';
import { useMode } from 'src/stores/mode';
const auth = useAuth(); const mode = useMode();
const groups = computed(() => {
  const isSchool = auth.merchant?.type === 'Subaccount';     // a school logging in to see its own money
  const g: any[] = [{ items: [{ to: '/dashboard/overview', icon: 'space_dashboard', label: 'Overview' }] }];
  g.push({ title: 'Payments', items: [
    { to: '/dashboard/transactions', icon: 'receipt_long', label: 'Transactions' },
    { to: '/dashboard/refunds', icon: 'undo', label: 'Refunds' },
  ] });
  const money: any[] = [];
  if (auth.canSeeMoney) money.push({ to: '/dashboard/payouts', icon: 'account_balance', label: 'Payouts' });
  if (auth.merchant?.type === 'Platform') money.push({ to: '/dashboard/subaccounts', icon: 'hub', label: 'Subaccounts' });
  if (money.length) g.push({ title: 'Money', items: money });
  g.push({ title: 'Account', items: [{ to: '/dashboard/settings', icon: 'storefront', label: 'Business' }] });
  // Integration and housekeeping pages sit under Advanced so the everyday ones stay short.
  const adv: any[] = [];
  if (!isSchool) adv.push({ to: '/dashboard/links', icon: 'link', label: 'Payment links' });
  if (auth.canDevelop && !isSchool) adv.push({ to: '/dashboard/api-keys', icon: 'key', label: 'API keys' }, { to: '/dashboard/webhooks', icon: 'webhook', label: 'Webhooks' });
  if (auth.canManage) adv.push({ to: '/dashboard/team', icon: 'group', label: 'Team' }, { to: '/dashboard/activity', icon: 'history', label: 'Activity log' });
  if (adv.length) g.push({ title: 'Advanced', collapsible: true, items: adv });
  return g;
});
</script>
