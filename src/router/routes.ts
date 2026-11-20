import type { RouteRecordRaw } from 'vue-router';
import { useAuth } from 'src/stores/auth';

const pages = import.meta.glob('../pages/**/*.vue');
const P = (name: string) => pages[`../pages/${name}.vue`] as () => Promise<any>;

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: () => (useAuth().isOps ? '/ops/overview' : '/dashboard/overview') },
  {
    path: '/', component: () => import('src/layouts/AuthLayout.vue'), meta: { public: true },
    children: [
      { path: 'login', component: P('auth/LoginPage'), meta: { public: true } },
      { path: 'register', component: P('auth/RegisterPage'), meta: { public: true } },
      { path: 'two-factor', component: P('auth/TwoFactorPage'), meta: { public: true } },
      { path: 'change-password', component: P('auth/ChangePasswordPage'), meta: { public: false } },
    ],
  },
  {
    path: '/', component: () => import('src/layouts/CheckoutLayout.vue'), meta: { public: true },
    children: [
      { path: 'pay/:accessCode', component: P('checkout/PayPage'), meta: { public: true } },
      { path: 'l/:slug', component: P('checkout/LinkPage'), meta: { public: true } },
      { path: 'simulate/:reference', component: P('checkout/SimulatePage'), meta: { public: true } },
    ],
  },
  {
    path: '/dashboard', component: () => import('src/layouts/MerchantLayout.vue'), meta: { area: 'merchant' },
    redirect: '/dashboard/overview',
    children: [
      { path: 'overview', component: P('merchant/OverviewPage'), meta: { title: 'Overview' } },
      { path: 'transactions', component: P('merchant/TransactionsPage'), meta: { title: 'Transactions' } },
      { path: 'transactions/:code', component: P('merchant/TransactionDetailPage'), meta: { title: 'Transaction' } },
      { path: 'links', component: P('merchant/LinksPage'), meta: { title: 'Payment links' } },
      { path: 'refunds', component: P('merchant/RefundsPage'), meta: { title: 'Refunds' } },
      { path: 'payouts', component: P('merchant/PayoutsPage'), meta: { title: 'Payouts' } },
      { path: 'subaccounts', component: P('merchant/SubaccountsPage'), meta: { title: 'Subaccounts' } },
      { path: 'api-keys', component: P('merchant/ApiKeysPage'), meta: { title: 'API keys' } },
      { path: 'webhooks', component: P('merchant/WebhooksPage'), meta: { title: 'Webhooks' } },
      { path: 'team', component: P('merchant/TeamPage'), meta: { title: 'Team' } },
      { path: 'security', component: P('shared/SecurityPage'), meta: { title: 'Security' } },
      { path: 'settings', component: P('merchant/SettingsPage'), meta: { title: 'Business' } },
      { path: 'activity', component: P('merchant/ActivityPage'), meta: { title: 'Activity log' } },
    ],
  },
  {
    path: '/ops', component: () => import('src/layouts/OpsLayout.vue'), meta: { area: 'ops' },
    redirect: '/ops/overview',
    children: [
      { path: 'overview', component: P('ops/OverviewPage'), meta: { title: 'Operations overview' } },
      { path: 'merchants', component: P('ops/MerchantsPage'), meta: { title: 'Merchants' } },
      { path: 'merchants/:id', component: P('ops/MerchantDetailPage'), meta: { title: 'Merchant' } },
      { path: 'merchants/:id/subaccounts', component: P('ops/MerchantSubaccountsPage'), meta: { title: 'Subaccounts' } },
      { path: 'bank-accounts', component: P('ops/BankAccountsPage'), meta: { title: 'Bank accounts' } },
      { path: 'payouts', component: P('ops/PayoutsPage'), meta: { title: 'Payouts' } },
      { path: 'transactions', component: P('ops/TransactionsPage'), meta: { title: 'Transactions' } },
      { path: 'transactions/:code', component: P('ops/TransactionDetailPage'), meta: { title: 'Transaction' } },
      { path: 'providers', component: P('ops/ProvidersPage'), meta: { title: 'Providers & routing' } },
      { path: 'fee-plans', component: P('ops/FeePlansPage'), meta: { title: 'Fee plans' } },
      { path: 'risk', component: P('ops/RiskPage'), meta: { title: 'Risk' } },
      { path: 'reconciliation', component: P('ops/ReconciliationPage'), meta: { title: 'Reconciliation' } },
      { path: 'audit', component: P('ops/AuditPage'), meta: { title: 'Audit log' } },
      { path: 'staff', component: P('ops/StaffPage'), meta: { title: 'Staff' } },
      { path: 'email', component: P('ops/EmailPage'), meta: { title: 'Email' } },
      { path: 'security', component: P('shared/SecurityPage'), meta: { title: 'Security' } },
      { path: 'settings', component: P('ops/SettingsPage'), meta: { title: 'Platform settings' } },
    ],
  },
  { path: '/:catchAll(.*)*', redirect: '/' },
];
export default routes;
