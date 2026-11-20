<template>
  <div v-if="!keys">
    <h1 class="text-[28px] font-extrabold">Create your account</h1>
    <p class="text-muted mt-1.5 mb-6">Start in test mode right away. We review your business before live payments unlock.</p>
    <form class="grid gap-4" @submit.prevent="submit" novalidate>
      <div><label class="field-label">Business name</label><input v-model.trim="f.businessName" class="field" placeholder="Acme Ltd" /></div>
      <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <div><label class="field-label">Your full name</label><input v-model.trim="f.fullName" class="field" autocomplete="name" /></div>
        <div><label class="field-label">Phone</label><input v-model.trim="f.phone" class="field" type="tel" autocomplete="tel" placeholder="024 000 0000" /></div>
      </div>
      <div><label class="field-label">Work email</label><input v-model.trim="f.email" class="field" type="email" autocomplete="email" /></div>
      <div><label class="field-label">Password</label><input v-model="f.password" class="field" type="password" autocomplete="new-password" /><p class="field-hint">At least 10 characters with upper-case, lower-case and a number.</p></div>
      <div v-if="error" class="text-[13.5px]" style="color: rgb(var(--bad))" role="alert">{{ error }}</div>
      <button class="btn primary s-lg block" :disabled="busy">{{ busy ? 'Creating…' : 'Create account' }}</button>
    </form>
    <p class="text-center text-[14px] text-muted mt-6">Already have an account? <router-link to="/login" class="font-semibold">Sign in</router-link></p>
  </div>
  <div v-else>
    <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style="background: rgb(var(--ok) / 0.14)"><q-icon name="check" size="32px" style="color: rgb(var(--ok))" /></div>
    <h1 class="text-[26px] font-extrabold">You're in. Here are your test keys.</h1>
    <p class="text-muted mt-1.5 mb-5">Copy the secret key now. For safety we only show it once.</p>
    <label class="field-label">Test secret key</label>
    <div class="code-block flex items-center justify-between gap-3"><span style="white-space: normal; word-break: break-all">{{ keys.secret }}</span><button class="btn s-sm" @click="doCopy(keys.secret)"><q-icon name="content_copy" />Copy</button></div>
    <label class="field-label mt-4">Test public key</label>
    <div class="code-block" style="white-space: normal; word-break: break-all">{{ keys.public }}</div>
    <button class="btn primary s-lg block mt-6" @click="go">I've saved it - open my dashboard</button>
  </div>
</template>
<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { post, ok } from 'src/services/api';
import { useAuth } from 'src/stores/auth';
import { copy } from 'src/utils/format';
const router = useRouter(); const auth = useAuth();
const f = reactive({ businessName: '', fullName: '', phone: '', email: '', password: '' });
const busy = ref(false); const error = ref(''); const keys = ref<any>(null);
async function submit() {
  busy.value = true; error.value = '';
  try {
    const r = await post('/auth/register', f);
    auth.set(r.data.session); keys.value = r.data.testKeys;
  } catch (e: any) { error.value = e.message; } finally { busy.value = false; }
}
async function doCopy(t: string) { if (await copy(t)) ok('Copied'); }
const go = () => router.replace('/dashboard/overview');
</script>
