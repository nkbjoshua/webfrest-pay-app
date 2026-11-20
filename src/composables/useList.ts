import { reactive, ref, watch, onMounted } from 'vue';
import { get, fail } from 'src/services/api';
import { useMode } from 'src/stores/mode';

// Paged list that reloads when its filters change or the test/live mode flips.
export function useList<T = any>(url: string, initial: Record<string, any> = {}, opts: { perPage?: number; modeAware?: boolean; map?: (rows: any[]) => any[]; sort?: string; dir?: 'asc' | 'desc' } = {}) {
  const mode = useMode();
  const filters = reactive<Record<string, any>>({ ...initial });
  const rows = ref<T[]>([]);
  const total = ref(0);
  const page = ref(1);
  const loading = ref(false);
  const perPage = ref(opts.perPage ?? 25);
  const sort = ref(opts.sort ?? ''); const dir = ref<'asc' | 'desc'>(opts.dir ?? 'desc');
  let seq = 0;

  async function load() {
    const my = ++seq;
    loading.value = true;
    try {
      const r = await get(url, { ...filters, page: page.value, perPage: perPage.value, sort: sort.value || undefined, dir: sort.value ? dir.value : undefined });
      if (my !== seq) return;
      rows.value = opts.map ? opts.map(r.data) : r.data;
      total.value = r.meta?.total ?? rows.value.length;
    } catch (e) { fail(e); } finally { if (my === seq) loading.value = false; }
  }
  let t: any;
  watch(filters, () => { page.value = 1; clearTimeout(t); t = setTimeout(load, 250); });
  watch(page, load);
  watch(perPage, () => { page.value = 1; load(); });
  // Click a sortable header: first click sorts that column descending, the next flips it.
  function setSort(key: string) { if (sort.value === key) dir.value = dir.value === 'desc' ? 'asc' : 'desc'; else { sort.value = key; dir.value = 'desc'; } page.value = 1; load(); }
  if (opts.modeAware !== false) watch(() => mode.tick, () => { page.value = 1; load(); });
  onMounted(load);
  return { filters, rows, total, page, perPage, loading, reload: load, sort, dir, setSort };
}
