<template>
  <div class="w-full">
    <div v-if="loading" class="card card-pad grid gap-3"><div class="skeleton" style="height: 24px; width: 50%"></div><div class="skeleton" style="height: 120px"></div></div>
    <div v-else-if="notFound" class="card card-pad text-center"><q-icon name="link_off" size="44px" class="text-muted" /><h2 class="text-[20px] font-bold mt-2">Link not found</h2><p class="text-muted mt-1.5">This payment link doesn't exist. Please check with whoever sent it.</p></div>
    <div v-else-if="!l.available" class="card card-pad text-center"><q-icon name="event_busy" size="44px" class="text-muted" /><h2 class="text-[20px] font-bold mt-2">{{ l.title }}</h2><p class="text-muted mt-1.5">{{ l.unavailableReason }}</p></div>
    <template v-else>
      <div v-if="l.mode === 'test'" class="mb-3 text-center text-[12.5px] font-semibold rounded-xl py-2" style="background: rgb(var(--warn) / 0.15); color: rgb(var(--warn))">TEST MODE · no real money will move</div>
      <div class="card overflow-hidden">
        <div class="px-6 pt-6 pb-5" style="background: linear-gradient(135deg, rgb(var(--brand) / 0.1), rgb(var(--cyan) / 0.08))">
          <div class="text-[13px] text-muted">{{ l.payee }}</div>
          <h1 class="text-[22px] font-extrabold mt-0.5">{{ l.title }}</h1>
          <p v-if="l.description" class="text-[14px] text-muted mt-1.5" style="white-space: pre-line">{{ l.description }}</p>
          <div v-if="l.amount" class="text-[32px] font-extrabold tracking-tight mt-3">{{ ghs(l.amount) }}</div>
        </div>
        <form class="p-6 grid gap-4" @submit.prevent="pay" novalidate>
          <div v-if="!l.amount"><label class="field-label" for="amt">Amount (GHS)</label><input id="amt" v-model="amount" class="field" inputmode="decimal" placeholder="0.00" /></div>
          <div><label class="field-label" for="nm">Your name</label><input id="nm" v-model.trim="name" class="field" autocomplete="name" /></div>
          <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div><label class="field-label" for="em">Email</label><input id="em" v-model.trim="email" class="field" type="email" autocomplete="email" /></div>
            <div><label class="field-label" for="ph">Phone</label><input id="ph" v-model.trim="phone" class="field" type="tel" inputmode="tel" autocomplete="tel" placeholder="024 000 0000" /></div>
          </div>
          <div><div class="field-label">Pay with</div><ChannelPicker v-model="channel" /></div>
          <div v-if="error" class="text-[13.5px]" style="color: rgb(var(--bad))" role="alert">{{ error }}</div>
          <button class="btn primary s-lg block" :disabled="busy || !ready"><q-spinner v-if="busy" size="18px" /> {{ busy ? 'Please wait…' : 'Continue to pay' }}</button>
        </form>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { get, post } from 'src/services/api';
import { ghs, toMinor } from 'src/utils/format';
import ChannelPicker from 'src/components/ChannelPicker.vue';
const slug = useRoute().params.slug as string;
const l = ref<any>({}); const loading = ref(true); const notFound = ref(false);
const name = ref(''); const email = ref(''); const phone = ref(''); const amount = ref(''); const channel = ref('momo');
const busy = ref(false); const error = ref('');
const ready = computed(() => name.value.length > 1 && /^\S+@\S+\.\S+$/.test(email.value) && (l.value.amount || toMinor(amount.value) >= 100) && (channel.value !== 'momo' || phone.value.length >= 9));
onMounted(async () => { try { l.value = (await get(`/checkout/link/${slug}`)).data; } catch (e: any) { if (e.http === 404) notFound.value = true; else error.value = e.message; } finally { loading.value = false; } });
async function pay() {
  busy.value = true; error.value = '';
  try {
    const r = await post(`/checkout/link/${slug}/pay`, { amount: l.value.amount ? undefined : toMinor(amount.value), name: name.value, email: email.value, phone: phone.value, channel: channel.value });
    window.location.href = r.data.checkoutUrl;
  } catch (e: any) { error.value = e.message; busy.value = false; }
}
</script>
