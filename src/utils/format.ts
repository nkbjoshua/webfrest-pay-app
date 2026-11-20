export const ghs = (minor: number | null | undefined, currency = 'GHS') =>
  minor === null || minor === undefined ? '-' : `${currency === 'GHS' ? 'GH₵' : currency} ${(minor / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const toMinor = (v: string | number): number => Math.round(parseFloat(String(v).replace(/,/g, '')) * 100);

export function dt(v?: string | null) {
  if (!v) return '-';
  const d = new Date(v.endsWith('Z') || v.includes('+') ? v : v + 'Z');
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function day(v?: string | null) {
  if (!v) return '-';
  return new Date(v.endsWith('Z') || v.includes('+') ? v : v + 'Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function ago(v?: string | null) {
  if (!v) return '-';
  const s = (Date.now() - new Date(v.endsWith('Z') || v.includes('+') ? v : v + 'Z').getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
export const initials = (n?: string) => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join('');
export const channelLabel = (c?: string | null) => ({ card: 'Card', momo: 'Mobile money', bank: 'Bank transfer' } as any)[c || ''] || (c ? c : '-');
export const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } };
export const API_ORIGIN = (process.env.WFP_API_BASE as string) || window.location.origin;
export const CHECKOUT_ORIGIN = (process.env.WFP_CHECKOUT_BASE as string) || window.location.origin;
