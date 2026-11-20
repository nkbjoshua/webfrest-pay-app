<template><AppShell area="Operations console" :groups="groups" :notifications="notifications" /></template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppShell from 'src/components/AppShell.vue';
import { get } from 'src/services/api';
import { useAuth } from 'src/stores/auth';
const auth = useAuth();
const q = ref<any>({});
onMounted(async () => { try { q.value = (await get('/ops/overview')).data.queues; } catch { /* the page itself reports errors */ } });
const notifications = computed(() => [
  { label: 'Merchants waiting for review', count: q.value.merchantsPending, to: '/ops/merchants?status=Pending' },
  { label: 'Bank accounts to verify', count: q.value.bankAccountsPending, to: '/ops/bank-accounts' },
  { label: 'Payouts awaiting approval', count: q.value.payoutsAwaitingOps, to: '/ops/payouts' },
  { label: 'Open risk flags', count: q.value.riskFlagsOpen, to: '/ops/risk' },
  { label: 'Reconciliation items to look at', count: q.value.reconciliationOpen, to: '/ops/reconciliation' },
]);
const groups = computed(() => {
  const g: any[] = [
    { items: [{ to: '/ops/overview', icon: 'space_dashboard', label: 'Overview' }] },
    { title: 'Review', items: [
      { to: '/ops/merchants', icon: 'storefront', label: 'Merchants', count: q.value.merchantsPending },
      { to: '/ops/bank-accounts', icon: 'account_balance_wallet', label: 'Bank accounts', count: q.value.bankAccountsPending },
      { to: '/ops/payouts', icon: 'payments', label: 'Payouts', count: q.value.payoutsAwaitingOps },
    ] },
    { title: 'Money', items: [
      { to: '/ops/transactions', icon: 'receipt_long', label: 'Transactions' },
      { to: '/ops/reconciliation', icon: 'fact_check', label: 'Reconciliation', count: q.value.reconciliationOpen },
    ] },
    // Day-to-day work is above; set-up, rules and history live under Advanced.
    { title: 'Advanced', collapsible: true, items: [
      { to: '/ops/risk', icon: 'shield', label: 'Risk', count: q.value.riskFlagsOpen },
      { to: '/ops/providers', icon: 'swap_horiz', label: 'Providers & routing' },
      { to: '/ops/fee-plans', icon: 'percent', label: 'Fee plans' },
      { to: '/ops/audit', icon: 'history', label: 'Audit log' },
      { to: '/ops/email', icon: 'mail', label: 'Email' },
    ] },
  ];
  if (auth.opsAdmin) g[g.length - 1].items.push({ to: '/ops/staff', icon: 'badge', label: 'Staff' }, { to: '/ops/settings', icon: 'settings', label: 'Settings' });
  return g;
});
</script>
