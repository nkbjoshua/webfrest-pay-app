import { defineStore } from 'pinia';
import { loadSession, saveSession, get, post } from 'src/services/api';

export const useAuth = defineStore('auth', {
  // pending = the second step of a sign-in (password was right, a code is still needed). Kept in memory only, so a refresh starts again.
  state: () => ({ session: loadSession() as any | null, pending: null as any | null }),
  getters: {
    user: (s) => s.session?.user ?? null,
    merchant: (s) => s.session?.merchant ?? null,
    isAuthed: (s) => !!s.session?.token,
    isOps: (s) => !!s.session?.user?.isOps,
    role: (s): string => s.session?.user?.role ?? '',
    canManage(): boolean { return ['MerchantOwner', 'MerchantAdmin'].includes(this.role); },
    canSeeMoney(): boolean { return ['MerchantOwner', 'MerchantAdmin', 'MerchantFinance'].includes(this.role); },
    canDevelop(): boolean { return ['MerchantOwner', 'MerchantAdmin', 'MerchantDeveloper'].includes(this.role); },
    opsAdmin(): boolean { return this.role === 'OpsAdmin'; },
    opsDecider(): boolean { return ['OpsAdmin', 'OpsApprover'].includes(this.role); },
  },
  actions: {
    set(s: any | null) { this.session = s; saveSession(s); },
    async login(email: string, password: string) {
      const r = await post('/auth/login', { email, password });
      if (r.data?.twoFactor) { this.pending = r.data.twoFactor; return r.data; }
      this.set(r.data); return r.data;
    },
    async verifyTwoFactor(method: 'totp' | 'sms' | 'recovery', code: string) {
      const r = await post('/auth/2fa/verify', { challenge: this.pending?.challenge, method, code });
      this.pending = null; this.set(r.data); return { session: r.data, message: r.message };
    },
    // Where to go once signed in.
    landing(s: any, next?: string): string {
      if (s.user.mustChangePassword) return '/change-password';
      const home = s.user.isOps ? '/ops/overview' : '/dashboard/overview';
      return next && next.startsWith(s.user.isOps ? '/ops' : '/dashboard') ? next : home;
    },
    async refresh() { const r = await get('/auth/me'); this.set({ ...r.data, token: this.session.token, expiresAt: this.session.expiresAt }); },
    logout() { this.set(null); },
  },
});
