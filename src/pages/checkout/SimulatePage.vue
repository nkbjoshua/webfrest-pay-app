<template>
  <div class="w-full">
    <div v-if="loading" class="card card-pad"><div class="skeleton" style="height: 160px"></div></div>
    <div v-else-if="!s" class="card card-pad text-center"><h2 class="text-[20px] font-bold">Simulation not found</h2></div>
    <div v-else class="card overflow-hidden">
      <div class="px-6 py-4 flex items-center gap-2 text-white" style="background: linear-gradient(135deg, #0f172a, #064e3b)"><q-icon name="science" /><b>Sandbox bank</b><span class="text-[12px] opacity-70 ml-auto">{{ s.mode === 'live' ? 'SIMULATOR (live mode!)' : 'Test mode' }}</span></div>
      <div class="p-6 grid gap-4">
        <div class="text-center"><div class="text-muted text-[13px]">Pay {{ s.payee }}</div><div class="text-[32px] font-extrabold">{{ ghs(s.amount) }}</div><div class="text-[12.5px] text-muted">{{ channelLabel(s.channel) }} · <span class="mono">{{ s.reference }}</span></div></div>
        <p class="text-[13.5px] text-muted text-center">No real money moves here. Choose how this payment should end - exactly what your customer's bank would do.</p>
        <button class="btn primary s-lg block" :disabled="busy" @click="done('success')"><q-icon name="check_circle" />Approve payment</button>
        <button class="btn s-lg block danger" :disabled="busy" @click="done('failed')"><q-icon name="cancel" />Decline (insufficient funds)</button>
        <button class="btn s-lg block" :disabled="busy" @click="done('abandoned')"><q-icon name="arrow_back" />Cancel and go back</button>
        <div v-if="error" class="text-[13.5px] text-center" style="color: rgb(var(--bad))">{{ error }}</div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { get, post } from 'src/services/api';
import { ghs, channelLabel } from 'src/utils/format';
const ref_ = useRoute().params.reference as string;
const s = ref<any>(null); const loading = ref(true); const busy = ref(false); const error = ref('');
onMounted(async () => { try { s.value = (await get(`/simulator/${ref_}`)).data; } catch { /* shown as not found */ } finally { loading.value = false; } });
async function done(outcome: string) {
  busy.value = true; error.value = '';
  try { const r = await post(`/simulator/${ref_}/complete`, { outcome }); window.location.href = r.data.returnUrl; }
  catch (e: any) { error.value = e.message; busy.value = false; }
}
</script>
