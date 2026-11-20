import { defineStore } from 'pinia';
import { Dark } from 'quasar';

type Mode = 'light' | 'dark' | 'auto';
export const useTheme = defineStore('theme', {
  state: () => ({ mode: ((): Mode => { try { return (localStorage.getItem('wfp_theme') as Mode) || 'auto'; } catch { return 'auto'; } })() }),
  getters: { isDark: (s) => s.mode === 'dark' || (s.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) },
  actions: {
    apply() {
      const dark = this.isDark;
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      Dark.set(dark);
    },
    toggle() { this.set(this.isDark ? 'light' : 'dark'); },
    set(m: Mode) { this.mode = m; try { localStorage.setItem('wfp_theme', m); } catch { /* private mode */ } this.apply(); },
  },
});
