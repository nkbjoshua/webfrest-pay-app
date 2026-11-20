<template>
  <div class="shell" :class="{ collapsed }">
    <div v-if="open" class="fixed inset-0 z-20" style="background: rgba(5, 25, 18, 0.5)" @click="open = false"></div>
    <aside class="side" :class="{ open }">
      <div class="px-2 pb-3 pt-1 flex items-center justify-between side-head">
        <Logo :size="36" :icon-only="collapsed" />
        <button class="collapse-btn" :title="collapsed ? 'Expand the menu' : 'Collapse the menu'" :aria-label="collapsed ? 'Expand the menu' : 'Collapse the menu'" @click="toggleCollapsed"><q-icon :name="collapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'" size="20px" /></button>
      </div>
      <div class="px-3 pb-2 -mt-1 area-label"><span class="text-[11px] font-bold tracking-widest uppercase" style="color: rgb(var(--side-muted))">{{ area }}</span></div>
      <template v-for="g in groups" :key="g.title">
        <!-- A collapsible group (Advanced) stays shut until it's needed; it opens by itself when the page you're on lives inside it. -->
        <button v-if="g.collapsible" class="nav-group adv-toggle" type="button" :aria-expanded="advOpen" @click="toggleAdv(g)">
          <span>{{ g.title }}</span>
          <span v-if="!advOpen && countOf(g)" class="count" style="margin-left: auto; margin-right: 4px">{{ countOf(g) }}</span>
          <q-icon :name="advOpen ? 'expand_less' : 'expand_more'" size="18px" :style="advOpen || !countOf(g) ? 'margin-left: auto' : ''" />
        </button>
        <div v-else-if="g.title" class="nav-group">{{ g.title }}</div>
        <template v-if="!g.collapsible || advOpen">
          <router-link v-for="n in g.items" :key="n.to" :to="n.to" class="nav" :title="collapsed ? n.label : undefined" @click="open = false"><q-icon :name="n.icon" /><span class="lbl">{{ n.label }}</span><span v-if="n.count" class="count">{{ n.count }}</span></router-link>
        </template>
      </template>
      <div class="mt-auto pt-4">
        <div class="side-user rounded-xl p-3 flex items-center gap-3">
          <div class="u-avatar">{{ initials(auth.user?.name) }}</div>
          <div class="min-w-0 flex-1"><div class="who text-[13px] font-semibold truncate">{{ auth.user?.name }}</div><div class="role text-[11.5px] truncate">{{ roleLabel }}</div></div>
          <router-link :to="auth.isOps ? '/ops/security' : '/dashboard/security'" class="btn ghost s-sm" style="padding: 0 6px; background: none; border: 0" title="Security (two-factor sign-in)" @click="open = false"><q-icon name="security" /></router-link>
          <button class="btn ghost s-sm" style="padding: 0 6px" title="Sign out" @click="signOut"><q-icon name="logout" /></button>
        </div>
      </div>
    </aside>

    <div class="min-w-0 flex flex-col">
      <header class="topbar">
        <button class="btn ghost mob-only" style="padding: 0 8px" @click="open = true" aria-label="Menu"><q-icon name="menu" /></button>
        <nav class="crumbs" aria-label="Breadcrumb">
          <router-link :to="home">Home</router-link>
          <template v-for="c in crumbs" :key="c.label"><q-icon name="chevron_right" size="16px" class="text-muted" /><router-link v-if="c.to" :to="c.to">{{ c.label }}</router-link><span v-else class="cur">{{ c.label }}</span></template>
        </nav>
        <button class="search-box" type="button" @click="searchOpen = true" aria-label="Search"><q-icon name="search" size="20px" /><span>Search transactions, merchants, accounts…</span><kbd>{{ isMac ? '⌘' : 'Ctrl' }} K</kbd></button>
        <button class="btn ghost search-icon" type="button" style="padding: 0 9px" @click="searchOpen = true" aria-label="Search"><q-icon name="search" /></button>
        <slot name="actions" />
        <button class="btn ghost" style="padding: 0 9px" :title="theme.isDark ? 'Switch to light' : 'Switch to dark'" @click="theme.toggle()"><q-icon :name="theme.isDark ? 'light_mode' : 'dark_mode'" /></button>
        <button v-if="notifications" class="btn ghost bell" style="padding: 0 9px" aria-label="Things that need attention" title="Things that need attention"><q-icon name="notifications_none" size="22px" /><span v-if="attention" class="bell-dot"></span>
          <q-menu anchor="bottom right" self="top right" :offset="[0, 8]"><div style="min-width: 290px" class="p-2">
            <div class="px-2 pt-1 pb-2 text-[11.5px] font-bold uppercase tracking-wider text-muted">Needs attention</div>
            <div v-if="!attention" class="px-2 py-4 text-[13.5px] text-muted">Nothing is waiting for you.</div>
            <router-link v-for="n in notifications.filter((x) => x.count)" :key="n.to" v-close-popup :to="n.to" class="notif"><span>{{ n.label }}</span><b class="count-pill">{{ n.count }}</b></router-link>
          </div></q-menu></button>
        <button class="user-chip" type="button" aria-label="Account menu"><span class="u-avatar">{{ initials(auth.user?.name) }}</span><span class="u-text"><b>{{ auth.user?.name }}</b><small>{{ roleLabel }}</small></span><q-icon name="expand_more" size="18px" class="text-muted" />
          <q-menu anchor="bottom right" self="top right" :offset="[0, 8]"><q-list style="min-width: 220px">
            <q-item v-close-popup clickable :to="auth.isOps ? '/ops/security' : '/dashboard/security'"><q-item-section avatar><q-icon name="security" /></q-item-section><q-item-section>Security and two-factor</q-item-section></q-item>
            <q-item v-close-popup clickable to="/change-password"><q-item-section avatar><q-icon name="key" /></q-item-section><q-item-section>Change password</q-item-section></q-item>
            <q-separator />
            <q-item v-close-popup clickable @click="signOut"><q-item-section avatar><q-icon name="logout" /></q-item-section><q-item-section>Sign out</q-item-section></q-item>
          </q-list></q-menu></button>
      </header>
      <slot name="banner" />
      <main class="page"><router-view :key="route.fullPath" /></main>
    </div>
    <CommandPalette v-model="searchOpen" :ops="auth.isOps" :links="groups.flatMap((g) => g.items)" />
    <Modal :model-value="idle.warning.value" title="Are you still there?" :width="420" persistent @update:model-value="(v: boolean) => !v && idle.stay()">
      <div class="flex gap-3.5 items-start"><div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style="background: rgb(var(--warn) / 0.15); color: rgb(var(--warn))"><q-icon name="timer" size="22px" /></div>
        <p class="text-[14px] leading-relaxed pt-1">For your security you'll be signed out in <b>{{ idle.secondsLeft.value }} second{{ idle.secondsLeft.value === 1 ? '' : 's' }}</b> because there has been no activity. Move the mouse or press any key to stay signed in.</p></div>
      <template #footer><button class="btn" @click="signOutNow">Sign out now</button><button class="btn primary" @click="idle.stay()">Stay signed in</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Logo from './Logo.vue'; import Modal from './Modal.vue'; import CommandPalette from './CommandPalette.vue';
import { useIdleLogout } from 'src/composables/useIdleLogout'; import { confirmDialog } from 'src/utils/confirm';
import { useAuth } from 'src/stores/auth';
import { useTheme } from 'src/stores/theme';
import { initials } from 'src/utils/format';

type NavItem = { to: string; icon: string; label: string; count?: number };
const props = defineProps<{ area: string; groups: { title?: string; collapsible?: boolean; items: NavItem[] }[]; notifications?: { label: string; count?: number; to: string }[] }>();
const attention = computed(() => (props.notifications || []).reduce((n, x) => n + (x.count || 0), 0));
const route = useRoute(); const router = useRouter(); const auth = useAuth(); const theme = useTheme();
const open = ref(false);

// Advanced menu: remembered per person, and forced open while you're on one of its pages.
const ADV_KEY = 'wfp.nav.advanced';
const remembered = (() => { try { return localStorage.getItem(ADV_KEY) === '1'; } catch { return false; } })();
const advOpen = ref(remembered);
const inAdvanced = (path: string) => props.groups.some((g) => g.collapsible && g.items.some((n) => path === n.to || path.startsWith(n.to + '/')));
watch(() => route.path, (p) => { if (inAdvanced(p)) advOpen.value = true; }, { immediate: true });
function toggleAdv(_g: unknown) { advOpen.value = !advOpen.value; try { localStorage.setItem(ADV_KEY, advOpen.value ? '1' : '0'); } catch { /* private window */ } }
const countOf = (g: { items: NavItem[] }) => g.items.reduce((n, i) => n + (i.count || 0), 0);
const ROLE: Record<string, string> = { MerchantOwner: 'Owner', MerchantAdmin: 'Admin', MerchantFinance: 'Finance', MerchantDeveloper: 'Developer', MerchantViewer: 'Viewer', OpsAdmin: 'Ops admin', OpsApprover: 'Ops approver', OpsSupport: 'Ops support' };
const roleLabel = computed(() => `${ROLE[auth.role] || auth.role}${auth.merchant ? ' · ' + auth.merchant.name : ''}`);
// Signed out after 10 minutes with no activity (warning for the last minute).
const IDLE_MINUTES = 10;
const idle = useIdleLogout({ limitMs: IDLE_MINUTES * 60_000, warnMs: 60_000, onTimeout: () => { auth.logout(); router.replace({ path: '/login', query: { idle: '1' } }); } });
// Collapsible menu (remembered), breadcrumbs, and the search box (Ctrl/Cmd + K).
const COLLAPSE_KEY = 'wfp.nav.collapsed';
const collapsed = ref((() => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } })());
function toggleCollapsed() { collapsed.value = !collapsed.value; try { localStorage.setItem(COLLAPSE_KEY, collapsed.value ? '1' : '0'); } catch { /* private window */ } }
const home = computed(() => (auth.isOps ? '/ops/overview' : '/dashboard/overview'));
const crumbs = computed(() => {
  const here = String(route.meta.title || '');
  const section = props.groups.flatMap((g) => g.items).filter((n) => route.path === n.to || route.path.startsWith(n.to + '/')).sort((a, b) => b.to.length - a.to.length)[0];
  const out: { label: string; to?: string }[] = [];
  if (section && section.to !== home.value) { out.push({ label: section.label, to: route.path === section.to ? undefined : section.to }); if (route.path !== section.to && here && here !== section.label) out.push({ label: here }); }
  else if (here && route.path !== home.value) out.push({ label: here });
  else out.push({ label: 'Overview' });
  return out;
});
const searchOpen = ref(false); const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
function onKey(e: KeyboardEvent) { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchOpen.value = !searchOpen.value; } }
onMounted(() => window.addEventListener('keydown', onKey)); onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
function signOutNow() { auth.logout(); router.replace('/login'); }
async function signOut() {
  if (await confirmDialog({ title: 'Sign out?', message: 'You will need to sign in again to get back in.', confirmText: 'Sign out', icon: 'logout' })) signOutNow();
}
// Signing out in one tab signs out the others too.
function onStorage(e: StorageEvent) { if (e.key === 'wfp_session' && !e.newValue && auth.isAuthed) { auth.session = null; router.replace('/login'); } }
onMounted(() => window.addEventListener('storage', onStorage)); onBeforeUnmount(() => window.removeEventListener('storage', onStorage));
</script>
