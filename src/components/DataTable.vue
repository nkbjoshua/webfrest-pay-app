<template>
  <div class="card overflow-hidden">
    <div v-if="$slots.toolbar" class="flex flex-wrap items-center gap-3 p-4 border-b border-line"><slot name="toolbar" /></div>
    <div class="tbl-wrap">
      <table class="tbl">
        <thead><tr>
          <th v-for="c in columns" :key="c.key" :class="{ num: c.num, sortable: c.sortable }" :style="c.width ? { width: c.width } : undefined" :aria-sort="c.sortable ? (sort === c.key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined">
            <button v-if="c.sortable" type="button" class="th-sort" :class="{ on: sort === c.key }" @click="$emit('update:sort', c.key)">{{ c.label }}<q-icon :name="sort === c.key ? (dir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'" size="14px" /></button>
            <template v-else>{{ c.label }}</template>
          </th>
        </tr></thead>
        <tbody>
          <template v-if="loading && !rows.length">
            <tr v-for="n in 5" :key="n"><td v-for="c in columns" :key="c.key"><div class="skeleton" style="height: 16px; width: 70%"></div></td></tr>
          </template>
          <tr v-for="(row, i) in rows" :key="row.id ?? i" :class="{ click: clickable }" @click="clickable && $emit('row', row)">
            <td v-for="c in columns" :key="c.key" :class="{ num: c.num }">
              <slot :name="`cell-${c.key}`" :row="row" :value="row[c.key]">{{ row[c.key] ?? '-' }}</slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!loading && !rows.length" class="py-14 px-6 text-center">
      <q-icon :name="emptyIcon || 'inbox'" size="40px" class="text-muted" style="opacity: 0.5" />
      <div class="font-semibold mt-2">{{ emptyTitle || 'Nothing here yet' }}</div>
      <div class="text-muted text-[13.5px] mt-1">{{ emptyText }}</div>
      <div class="mt-4"><slot name="empty" /></div>
    </div>
    <Pager v-if="total !== undefined && (total > 0 || pageSizes)" :page="page || 1" :per-page="perPage || 25" :total="total" :noun="noun" :sizes="pageSizes" @update:page="$emit('update:page', $event)" @update:per-page="$emit('update:perPage', $event)" />
  </div>
</template>
<script setup lang="ts">
import Pager from './Pager.vue';
defineProps<{
  columns: { key: string; label: string; num?: boolean; width?: string; sortable?: boolean }[];
  rows: any[]; loading?: boolean; clickable?: boolean; total?: number; page?: number; perPage?: number;
  emptyTitle?: string; emptyText?: string; emptyIcon?: string;
  noun?: string; pageSizes?: number[]; sort?: string; dir?: 'asc' | 'desc';
}>();
defineEmits(['row', 'update:page', 'update:perPage', 'update:sort']);
</script>
<style scoped>
.th-sort { background: none; border: 0; padding: 0; font: inherit; letter-spacing: inherit; text-transform: inherit; color: inherit; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; }
.th-sort .q-icon { opacity: 0.5; } .th-sort.on, .th-sort.on .q-icon { color: rgb(var(--brand)); opacity: 1; }
th.num .th-sort { justify-content: flex-end; }
</style>
