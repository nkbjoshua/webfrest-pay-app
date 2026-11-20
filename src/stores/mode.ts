import { defineStore } from 'pinia';
import { currentMode } from 'src/services/api';

export const useMode = defineStore('mode', {
  state: () => ({ mode: currentMode() as 'test' | 'live', tick: 0 }),
  getters: { isLive: (s) => s.mode === 'live' },
  actions: {
    set(m: 'test' | 'live') { this.mode = m; try { localStorage.setItem('wfp_mode', m); } catch { /* ignore */ } this.tick++; },
  },
});
