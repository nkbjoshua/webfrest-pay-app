<template>
  <div class="min-h-screen grid" style="grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)" :class="{ single: true }">
    <div class="hero hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden">
      <Logo :size="42" light />
      <div class="relative z-10 max-w-md">
        <h2 class="text-[36px] font-extrabold leading-[1.1]">Collect payments. Pay out with confidence.</h2>
        <p class="mt-4 text-[16px]" style="color: #b8e6d3">Cards, mobile money and bank transfers through one API, with a dashboard your finance team will actually enjoy.</p>
        <div class="mt-8 grid gap-3 text-[14px]">
          <div v-for="f in feats" :key="f" class="flex items-center gap-2.5"><q-icon name="check_circle" size="20px" style="color: #34d399" />{{ f }}</div>
        </div>
      </div>
      <div class="text-[12.5px]" style="color: #7fb9a3">© {{ new Date().getFullYear() }} Webfrest Technologies</div>
      <div class="orb a"></div><div class="orb b"></div>
    </div>
    <div class="flex items-center justify-center p-6 relative">
      <button class="btn ghost absolute top-4 right-4" style="padding: 0 9px" @click="theme.toggle()" aria-label="Toggle theme"><q-icon :name="theme.isDark ? 'light_mode' : 'dark_mode'" /></button>
      <div class="w-full" style="max-width: 440px">
        <div class="lg:hidden mb-8"><Logo :size="38" /></div>
        <router-view />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import Logo from 'src/components/Logo.vue';
import { useTheme } from 'src/stores/theme';
const theme = useTheme();
const feats = ['Test mode from the first minute', 'Subaccounts and split settlement', 'Webhooks that retry until they land', 'Payouts with maker-checker approval'];
</script>
<style scoped lang="scss">
.hero { background: linear-gradient(145deg, #03231b 0%, #064e3b 55%, #047857 120%); }
.orb { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.5; }
.orb.a { width: 340px; height: 340px; background: #10b981; right: -80px; bottom: -80px; }
.orb.b { width: 260px; height: 260px; background: #34d399; left: -60px; top: 40%; opacity: 0.25; }
@media (max-width: 1023px) { .min-h-screen { grid-template-columns: 1fr !important; } }
</style>
