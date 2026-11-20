<template>
  <div class="w-full">
    <div v-if="loading" class="card card-pad grid gap-3"><div class="skeleton" style="height: 24px; width: 50%"></div><div class="skeleton" style="height: 60px"></div><div class="skeleton" style="height: 140px"></div></div>

    <div v-else-if="notFound" class="card card-pad text-center">
      <q-icon name="search_off" size="44px" class="text-muted" /><h2 class="text-[20px] font-bold mt-2">Payment not found</h2>
      <p class="text-muted mt-1.5">This payment link isn't valid. Please check with whoever sent it.</p>
    </div>

    <template v-else-if="p">
      <div v-if="p.mode === 'test'" class="mb-3 text-center text-[12.5px] font-semibold rounded-xl py-2" style="background: rgb(var(--warn) / 0.15); color: rgb(var(--warn))">TEST MODE · no real money will move</div>

      <!-- success -->
      <div v-if="p.status === 'success' || p.status === 'partiallyrefunded' || p.status === 'refunded'" class="card card-pad text-center">
        <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center pop" style="background: rgb(var(--ok) / 0.14)"><q-icon name="check" size="38px" style="color: rgb(var(--ok))" /></div>
        <h2 class="text-[22px] font-extrabold mt-4">Payment received</h2>
        <p class="text-muted mt-1">{{ ghs(p.charge) }} paid to <b class="text-ink">{{ p.payee }}</b></p>
        <dl class="kv mt-6 text-left"><dt>Reference</dt><dd class="mono">{{ p.reference }}</dd><dt>Method</dt><dd>{{ channelLabel(p.channel) }}</dd><dt>Date</dt><dd>{{ dt(p.paidAt) }}</dd></dl>
        <a v-if="p.redirectUrl" class="btn primary s-lg block mt-6" :href="p.redirectUrl" @click="notifyParent('close')">Continue{{ countdown ? ` (${countdown})` : '' }}</a>
        <button v-else-if="embed" class="btn primary s-lg block mt-6" @click="notifyParent('close')">Done</button>
      </div>

      <!-- failed / abandoned / expired -->
      <div v-else-if="['failed', 'abandoned'].includes(p.status) && !retrying" class="card card-pad text-center">
        <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style="background: rgb(var(--bad) / 0.12)"><q-icon name="close" size="38px" style="color: rgb(var(--bad))" /></div>
        <h2 class="text-[22px] font-extrabold mt-4">{{ p.status === 'failed' ? 'Payment unsuccessful' : 'Payment not completed' }}</h2>
        <p class="text-muted mt-1">{{ p.failureReason || 'You have not been charged.' }}</p>
        <p class="text-muted text-[13px] mt-3">If money left your account it will be returned automatically. Reference <span class="mono">{{ p.reference }}</span></p>
        <button v-if="p.canRetry" class="btn primary s-lg block mt-6" @click="retrying = true; confirmName = null">Try again</button>
        <a v-if="p.redirectUrl" class="btn s-lg block mt-3" :href="p.redirectUrl">Back to {{ p.merchant }}</a>
        <button v-else-if="embed" class="btn s-lg block mt-6" @click="notifyParent('close')">Close</button>
      </div>

      <!-- waiting for the bank -->
      <div v-else-if="waiting" class="card card-pad text-center">
        <template v-if="p.awaitingApproval">
          <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style="background: rgb(var(--brand) / 0.12)"><q-icon name="smartphone" size="34px" class="text-brand" /></div>
          <h2 class="text-[20px] font-bold mt-3">Approve the payment on your phone</h2>
          <p class="text-muted mt-1.5">We've sent a prompt{{ p.customer?.phone ? ` to ${p.customer.phone}` : '' }}{{ p.network ? ` (${networkLabel(p.network)})` : '' }}. Enter your mobile money PIN to approve {{ ghs(p.charge) }}.</p>
          <q-spinner-dots color="primary" size="32px" class="mt-3" />
          <p v-if="slow" class="text-[13px] text-muted mt-4">Haven't seen a prompt? Check you have network and enough balance. If you've approved it, this page updates by itself - you can also close it, we'll confirm the payment.</p>
        </template>
        <template v-else>
          <q-spinner-dots color="primary" size="44px" /><h2 class="text-[20px] font-bold mt-3">Confirming your payment…</h2>
          <p class="text-muted mt-1.5">This usually takes a few seconds. Please don't close this page.</p>
          <p v-if="slow" class="text-[13px] text-muted mt-4">Taking longer than usual. If you've approved the payment on your phone, it will show up shortly - you can safely close this page.</p>
        </template>
      </div>

      <!-- pay -->
      <div v-else class="card overflow-hidden">
        <div class="px-6 pt-6 pb-5" style="background: linear-gradient(135deg, rgb(var(--brand) / 0.1), rgb(var(--cyan) / 0.08))">
          <div class="text-[13px] text-muted">Paying</div>
          <div class="text-[18px] font-bold">{{ p.payee }}</div>
          <div class="text-[34px] font-extrabold tracking-tight mt-2">{{ ghs(chosen ? chosen.total : p.amount) }}</div>
          <div v-if="p.description" class="text-[13.5px] text-muted mt-1">{{ p.description }}</div>
          <div v-if="chosen && chosen.fee" class="text-[12.5px] text-muted mt-1">{{ ghs(p.amount) }} + {{ ghs(chosen.fee) }} processing fee</div>
        </div>
        <div class="p-6 grid gap-5">
          <div v-if="needsEmail" class="grid gap-3">
            <div><label class="field-label" for="n">Your name</label><input id="n" v-model.trim="name" class="field" autocomplete="name" /></div>
            <div><label class="field-label" for="e">Email for your receipt</label><input id="e" v-model.trim="email" class="field" type="email" autocomplete="email" /></div>
          </div>
          <div>
            <div class="field-label">How would you like to pay?</div>
            <ChannelPicker v-model="channel" :options="p.options" />
          </div>
          <div v-if="channel === 'momo'" class="grid gap-3">
            <div v-if="chosen?.prompt">
              <div class="field-label">Your network</div>
              <div class="grid grid-cols-3 gap-2">
                <button v-for="n in networks" :key="n.code" type="button" class="rounded-xl py-2.5 text-[13.5px] font-semibold transition" :style="network === n.code ? 'background: rgb(var(--brand) / 0.14); border: 2px solid rgb(var(--brand)); color: rgb(var(--ink))' : 'background: transparent; border: 1px solid rgb(var(--line)); color: rgb(var(--muted))'" :aria-pressed="network === n.code" @click="network = n.code; confirmName = null">{{ n.label }}</button>
              </div>
            </div>
            <div>
              <label class="field-label" for="ph">Mobile money number</label>
              <input id="ph" v-model.trim="phone" class="field" type="tel" inputmode="tel" autocomplete="tel" placeholder="024 000 0000" @input="confirmName = null" />
              <p class="field-hint">You'll get a prompt on your phone to approve with your PIN.</p>
            </div>
            <div v-if="confirmName" class="p-3 rounded-xl text-[13.5px]" style="background: rgb(var(--brand) / 0.08)">
              This number belongs to <b>{{ confirmName }}</b>. {{ ghs(chosen ? chosen.total : p.amount) }} will be requested from it.
            </div>
          </div>
          <div v-if="error" class="text-[13.5px]" style="color: rgb(var(--bad))" role="alert">{{ error }}</div>
          <button class="btn primary s-lg block" :disabled="busy || !channel || (needsEmail && !validEmail) || (channel === 'momo' && (phone.length < 9 || (chosen?.prompt && !network)))" @click="pay">
            <q-spinner v-if="busy" size="18px" /> {{ busy ? 'Please wait…' : (channel === 'momo' && chosen?.prompt && !confirmName && nameAvailable) ? 'Continue' : `Pay ${ghs(chosen ? chosen.total : p.amount)}` }}
          </button>
          <p class="text-center text-[12px] text-muted">Expires {{ dt(p.expiresAt) }}</p>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { get, post } from 'src/services/api';
import { ghs, dt, channelLabel } from 'src/utils/format';
import ChannelPicker from 'src/components/ChannelPicker.vue';

const route = useRoute();
const code = route.params.accessCode as string;
const embed = route.query.embed === '1';
const returned = route.query.returned === '1';

const p = ref<any>(null); const loading = ref(true); const notFound = ref(false);
const channel = ref(''); const phone = ref(''); const name = ref(''); const email = ref('');
const busy = ref(false); const error = ref(''); const slow = ref(false); const countdown = ref(0);
const network = ref(''); const retrying = ref(false); const confirmName = ref<string | null>(null); const nameAvailable = ref(true);
const networks = [{ code: 'MTN', label: 'MTN' }, { code: 'TELECEL', label: 'Telecel' }, { code: 'AIRTELTIGO', label: 'AirtelTigo' }];
const networkLabel = (c: string) => networks.find((n) => n.code === c)?.label || c;
let timer: any, cd: any, polls = 0;

const chosen = computed(() => p.value?.options?.find((o: any) => o.channel === channel.value));
const needsEmail = computed(() => !p.value?.customer?.email);
const validEmail = computed(() => /^\S+@\S+\.\S+$/.test(email.value));
const waiting = computed(() => p.value && ['pending', 'processing'].includes(p.value.status) && (returned || p.value.status === 'processing') && polls < (p.value.awaitingApproval ? 90 : 45));

function notifyParent(event: string, extra: any = {}) { if (embed && window.parent !== window) window.parent.postMessage({ source: 'webfrest-pay', event, reference: p.value?.reference, ...extra }, '*'); }

async function load(statusCall = false) {
  try {
    const r = await get(`/checkout/${code}${statusCall ? '/status' : ''}`);
    p.value = r.data;
    if (!channel.value && p.value.options?.length) channel.value = p.value.options.find((o: any) => o.channel === 'momo')?.channel || p.value.options[0].channel;
    if (p.value.customer?.phone && !phone.value) phone.value = p.value.customer.phone;
    if (p.value.network && !network.value) network.value = p.value.network;
    if (p.value.status === 'success') { notifyParent('success'); startCountdown(); }
  } catch (e: any) { if (e.http === 404) notFound.value = true; else error.value = e.message; }
  finally { loading.value = false; }
}
function startCountdown() {
  if (!p.value?.redirectUrl || embed) return;
  countdown.value = 6;
  cd = setInterval(() => { countdown.value--; if (countdown.value <= 0) { clearInterval(cd); window.location.href = p.value.redirectUrl; } }, 1000);
}
function poll() {
  timer = setInterval(async () => {
    polls++;
    if (polls > (p.value?.awaitingApproval ? 25 : 20)) slow.value = true;
    if (!waiting.value) return clearInterval(timer);
    await load(true);
  }, 2000);
}
async function pay() {
  busy.value = true; error.value = '';
  try {
    // Mobile money by prompt: first show whose wallet this is, so a mistyped number is caught before anyone is asked for money.
    if (channel.value === 'momo' && chosen.value?.prompt && !confirmName.value && nameAvailable.value) {
      const n = (await post(`/checkout/${code}/wallet-name`, { phone: phone.value, network: network.value })).data;
      if (n.available) { confirmName.value = n.name; busy.value = false; return; }
      nameAvailable.value = false;           // the bank can't tell us right now - carry on without the check
    }
    const r = await post(`/checkout/${code}/start`, { channel: channel.value, phone: phone.value, name: name.value || undefined, email: email.value || undefined, network: network.value || undefined });
    if (r.data.prompted) {                    // nothing to redirect to: the prompt is on their phone; watch for the result
      retrying.value = false; polls = 0; slow.value = false; clearInterval(timer);
      await load(true); poll(); busy.value = false; return;
    }
    const url = r.data.checkoutUrl;
    if (embed && window.parent !== window) { notifyParent('redirect', { url }); } else window.location.href = url;
  } catch (e: any) { error.value = e.message; busy.value = false; confirmName.value = e.code === 'wallet_not_found' ? null : confirmName.value; }
}
onMounted(async () => { await load(returned); if (returned || p.value?.status === 'processing') poll(); notifyParent('ready'); });
onBeforeUnmount(() => { clearInterval(timer); clearInterval(cd); });
</script>
<style scoped>
.pop { animation: pop 0.45s cubic-bezier(0.2, 1.4, 0.4, 1); }
@keyframes pop { from { transform: scale(0.4); opacity: 0; } to { transform: none; opacity: 1; } }
</style>
