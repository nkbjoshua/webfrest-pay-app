import { onBeforeUnmount, onMounted, ref } from 'vue';

// Signs the person out after a stretch with no activity. Any mouse movement, click, key press, scroll or touch counts as activity and restarts
// the count. The last-activity time is kept in localStorage, so activity in another tab of the app counts too, and a laptop that slept
// past the limit is signed out the moment it wakes.
const KEY = 'wfp_last_activity';
const read = () => { try { return Number(localStorage.getItem(KEY)) || Date.now(); } catch { return Date.now(); } };
const write = (t: number) => { try { localStorage.setItem(KEY, String(t)); } catch { /* private window: this tab still counts its own activity */ } };

export function useIdleLogout(opts: { limitMs: number; warnMs: number; onTimeout: () => void }) {
  const warning = ref(false); const secondsLeft = ref(0);
  let last = Date.now(); let timer: any = null; let lastWrite = 0;
  const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'wheel', 'touchstart', 'touchmove', 'click', 'pointerdown'];

  function activity() {
    const now = Date.now();
    if (now - lastWrite < 1000) return;              // a mouse move fires dozens of times a second; once a second is plenty
    lastWrite = now; last = now; write(now);
    if (warning.value) warning.value = false;
  }
  function tick() {
    last = Math.max(last, read());                   // pick up activity from other tabs
    const idle = Date.now() - last;
    if (idle >= opts.limitMs) { stop(); opts.onTimeout(); return; }
    const left = opts.limitMs - idle;
    warning.value = left <= opts.warnMs; secondsLeft.value = Math.ceil(left / 1000);
  }
  function start() {
    last = Date.now(); write(last);
    EVENTS.forEach((e) => window.addEventListener(e, activity, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', tick);
    timer = setInterval(tick, 1000);
  }
  function stop() {
    EVENTS.forEach((e) => window.removeEventListener(e, activity, { capture: true } as any));
    document.removeEventListener('visibilitychange', tick);
    clearInterval(timer); warning.value = false;
  }
  onMounted(start); onBeforeUnmount(stop);
  return { warning, secondsLeft, stay: () => { lastWrite = 0; activity(); } };
}
