<template>
  <div>
    <PageHeader title="Activity log" subtitle="Who changed what on this account." />
    <DataTable :columns="cols" :rows="rows" :loading="loading" :total="total" :page="page" :per-page="perPage" empty-title="Nothing recorded yet" empty-icon="history" @update:page="page = $event">
      <template #cell-at="{ row }"><span class="whitespace-nowrap">{{ dt(row.at) }}</span></template>
      <template #cell-action="{ row }"><span class="mono">{{ row.action }}</span></template>
    </DataTable>
  </div>
</template>
<script setup lang="ts">
import PageHeader from 'src/components/PageHeader.vue'; import DataTable from 'src/components/DataTable.vue';
import { useList } from 'src/composables/useList'; import { dt } from 'src/utils/format';
const cols = [{ key: 'at', label: 'When' }, { key: 'actor', label: 'Who' }, { key: 'action', label: 'Action' }, { key: 'detail', label: 'Detail' }];
const { rows, total, page, perPage, loading } = useList('/dashboard/activity', {}, { modeAware: false });
</script>
