<template>
  <section class="card sec-card">
    <header class="sec-head">
      <span class="sec-icon"><q-icon :name="icon" size="22px" /></span>
      <h3>{{ title }}</h3>
      <div class="sec-actions"><slot name="actions" /></div>
    </header>
    <div class="sec-body"><slot /></div>
  </section>
</template>
<script setup lang="ts">
// A card with an icon tile and a title, the building block of the detail pages and dialogs.
defineProps<{ icon: string; title: string }>();
</script>
<style scoped>
.sec-card { padding: 16px 18px 14px; }
.sec-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.sec-icon { width: 38px; height: 38px; border-radius: 11px; display: inline-flex; align-items: center; justify-content: center; background: rgb(var(--brand) / 0.12); color: rgb(var(--brand)); flex-shrink: 0; }
h3 { font-size: 16.5px; font-weight: 700; margin: 0; }
.sec-actions { margin-left: auto; display: flex; gap: 8px; }
.sec-body :deep(.rows) { display: grid; }
.sec-body :deep(.row) { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 14px; padding: 9px 0; border-top: 1px solid rgb(var(--line)); font-size: 13.5px; align-items: start; }
.sec-body :deep(.row:first-child) { border-top: 0; }
.sec-body :deep(.row > dt) { color: rgb(var(--muted)); } .sec-body :deep(.row > dd) { margin: 0; font-weight: 500; word-break: break-word; }
.sec-body :deep(.rows.end .row) { grid-template-columns: 1fr auto; } .sec-body :deep(.rows.end .row > dd) { text-align: right; }
@media (max-width: 560px) { .sec-body :deep(.row) { grid-template-columns: 1fr; gap: 2px; } }
</style>
