<template>
  <div v-if="auth.pending">
    <h1 class="text-[28px] font-extrabold">Verify it's you</h1>
    <p class="text-muted mt-1.5 mb-6">{{ intro }}</p>

    <form class="grid gap-4" @submit.prevent="submit" novalidate>
      <div v-if="method === 'sms' && !smsSent" class="grid gap-3">
        <div class="text-[13.5px]">We'll text a code to <b>{{ auth.pending.phoneMasked }}</b>.</div>
        <button type="button" class="btn primary s-lg block" :disabled="busy" @click="sendSms">{{ busy ? 'Sending…' : 'Text me a code' }}</button>
      </div>
      <template v-else>
        <div>
          <label class="field-label" for="code">{{ method === 'recovery' ? 'Recovery code' : '6-digit code' }}</label>
          <input id="code" v-model="code" class="field" :inputmode="method === 'recovery' ? 'text' : 'numeric'" autocomplete="one-time-code" autofocus
                 :placeholder="method === 'recovery' ? 'XXXXX-XXXXX' : '123456'" :maxlength="method === 'recovery' ? 12 : 7" style="letter-spacing: 0.18em; font-size: 20px; text-align: center" @input="onInput" />
        </div>
        <div v-if="error" class="text-[13.5px]" style="color: rgb(var(--bad))" role="alert">{{ error }}</div>
        <div v-if="notice" class="text-[13.5px] text-muted">{{ notice }}</div>
        <button class="btn primary s-lg block" :disabled="busy || !ready">{{ busy ? 'Checking…' : 'Verify and sign in' }}</button>
      </template>
      <div v-if="error && method === 'sms' && !smsSent" class="text-[13.5px]" style="color: rgb(var(--bad))" role="alert">{{ error }}</div>
    </form>

    <div class="mt-6 grid gap-2 text-[13.5px]">
      <button v-if="method !== 'totp'" class="link-btn" type="button" @click="pick('totp')">Use my authenticator app</button>
      <button v-if="method !== 'sms' && has('sms')" class="link-btn" type="button" @click="pick('sms')">Text a code to my backup phone</button>
      <button v-if="method !== 'recovery'" class="link-btn" type="button" @click="pick('recovery')">Use a recovery code</button>
      <button v-if="method === 'sms' && smsSent" class="link-btn" type="button" :disabled="wait > 0 || busy" @click="sendSms">{{ wait > 0 ? `Send another code in ${wait}s` : 'Send another code' }}</button>
      <router-link to="/login" class="text-muted" @click="auth.pending = null">Back to sign in</router-link>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { post, ok } from 'src/services/api';
import { useAuth } from 'src/stores/auth';
const auth = useAuth(); const router = useRouter(); const route = useRoute();
const method = ref<'totp' | 'sms' | 'recovery'>('totp');
const code = ref(''); const busy = ref(false); const error = ref(''); const notice = ref('');
const smsSent = ref(false); const wait = ref(0); let timer: any = null;
const has = (m: string) => (auth.pending?.methods || []).includes(m);
const intro = computed(() => method.value === 'totp' ? 'Open your authenticator app and enter the 6-digit code for Webfrest Pay.' : method.value === 'sms' ? 'We send a 6-digit code to the backup phone you added.' : 'Enter one of the recovery codes you saved when you turned on two-factor. Each works once.');
const ready = computed(() => method.value === 'recovery' ? code.value.replace(/[^a-z0-9]/gi, '').length >= 10 : code.value.replace(/\D/g, '').length === 6);
onMounted(() => { if (!auth.pending) router.replace('/login'); });
onBeforeUnmount(() => clearInterval(timer));
function pick(m: 'totp' | 'sms' | 'recovery') { method.value = m; code.value = ''; error.value = ''; notice.value = ''; }
function onInput() { if (method.value !== 'recovery' && ready.value && !busy.value) submit(); }
async function sendSms() {
  busy.value = true; error.value = '';
  try {
    await post('/auth/2fa/sms/send', { challenge: auth.pending.challenge });
    smsSent.value = true; notice.value = `Code sent to ${auth.pending.phoneMasked}. It lasts 5 minutes.`;
    wait.value = 60; clearInterval(timer); timer = setInterval(() => { wait.value = Math.max(0, wait.value - 1); if (!wait.value) clearInterval(timer); }, 1000);
  } catch (e: any) { error.value = e.message; } finally { busy.value = false; }
}
async function submit() {
  if (!ready.value) return;
  busy.value = true; error.value = '';
  try {
    const r = await auth.verifyTwoFactor(method.value, code.value);
    if (method.value === 'recovery') ok(r.message);
    router.replace(auth.landing(r.session, route.query.next as string | undefined));
  } catch (e: any) {
    error.value = e.message; code.value = '';
    if (e.code === 'challenge_expired' || e.code === 'account_locked') { auth.pending = null; setTimeout(() => router.replace('/login'), 2500); }
  } finally { busy.value = false; }
}
</script>
<style scoped>
.link-btn { background: none; border: 0; padding: 0; text-align: left; color: rgb(var(--brand)); font-weight: 600; cursor: pointer; }
.link-btn:disabled { color: rgb(var(--muted)); cursor: default; }
</style>
