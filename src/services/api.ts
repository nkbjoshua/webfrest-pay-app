import axios, { AxiosError } from 'axios';
import type { Router } from 'vue-router';
import { Notify } from 'quasar';

export const API_BASE = (process.env.WFP_API_BASE as string) || '';

export const http = axios.create({ baseURL: API_BASE, timeout: 30000 });

const KEY = 'wfp_session';
export function loadSession(): any | null { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
export function saveSession(s: any | null) { try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch { /* ignore */ } }
export function currentMode(): 'test' | 'live' { try { return (localStorage.getItem('wfp_mode') as any) === 'live' ? 'live' : 'test'; } catch { return 'test'; } }

export class ApiError extends Error {
  constructor(public code: string, message: string, public http: number) { super(message); }
}

export function setupApi(router: Router) {
  http.interceptors.request.use((cfg) => {
    const s = loadSession();
    // Public checkout calls carry no credentials.
    if (s?.token && !cfg.url?.startsWith('/checkout') && !cfg.url?.startsWith('/simulator')) cfg.headers.Authorization = `Bearer ${s.token}`;
    cfg.headers['X-Mode'] = currentMode();
    return cfg;
  });
  http.interceptors.response.use(
    (r) => r,
    (err: AxiosError<any>) => {
      const body = err.response?.data;
      if (err.response?.status === 401 && !err.config?.url?.startsWith('/auth/login') && !err.config?.url?.startsWith('/checkout')) {
        saveSession(null);
        router.replace({ path: '/login', query: { expired: '1' } });
      }
      const msg = body?.message || (err.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : err.response ? 'Something went wrong. Please try again.' : "Can't reach Webfrest Pay. Check your connection.");
      return Promise.reject(new ApiError(body?.code || 'error', msg, err.response?.status || 0));
    },
  );
}

// Unwraps { status, message, data, meta }.
export async function get<T = any>(url: string, params?: Record<string, any>): Promise<{ data: T; meta?: any }> {
  const r = await http.get(url, { params: clean(params) });
  return { data: r.data.data, meta: r.data.meta };
}
export async function send<T = any>(method: 'post' | 'put' | 'patch' | 'delete', url: string, body?: any): Promise<{ data: T; message: string }> {
  const r = await http.request({ method, url, data: body });
  return { data: r.data.data, message: r.data.message };
}
export const post = <T = any>(u: string, b?: any) => send<T>('post', u, b);
export const put = <T = any>(u: string, b?: any) => send<T>('put', u, b);
export const patch = <T = any>(u: string, b?: any) => send<T>('patch', u, b);
export const del = <T = any>(u: string) => send<T>('delete', u);

function clean(p?: Record<string, any>) {
  if (!p) return p;
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== null && v !== undefined));
}

export function fail(e: any) {
  Notify.create({ type: 'negative', message: e?.message || 'Something went wrong.', icon: 'error_outline' });
}
export function ok(message: string) { Notify.create({ type: 'positive', message, icon: 'check_circle' }); }

export async function download(url: string, params: Record<string, any>, fallbackName: string) {
  const r = await http.get(url, { params: clean(params), responseType: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(r.data);
  a.download = fallbackName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
