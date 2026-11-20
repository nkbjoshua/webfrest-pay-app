<template>
  <div class="min-h-screen flex flex-col items-center px-4 py-8" style="background: radial-gradient(1100px 500px at 50% -10%, rgb(var(--brand) / 0.16), transparent), rgb(var(--bg))">
    <div class="w-full flex-1 flex flex-col items-center justify-center" style="max-width: 460px">
      <router-view />
    </div>
    <div class="mt-8 flex items-center gap-2 text-[12.5px] text-muted"><q-icon name="lock" size="15px" /> Secured by <Logo :size="18" icon-only /> <b class="text-ink">Webfrest Pay</b></div>
  </div>
</template>
<script setup lang="ts">
import Logo from 'src/components/Logo.vue';
</script>
