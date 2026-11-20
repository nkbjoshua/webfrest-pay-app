<template>
  <div>
    <h1 class="text-[28px] font-extrabold">Welcome back</h1>
    <p class="text-muted mt-1.5 mb-7">Sign in to your Webfrest Pay account.</p>
    <div v-if="$route.query.idle" class="mb-5 p-3 rounded-xl text-[13.5px]" style="background: rgb(var(--warn) / 0.12); color: rgb(var(--warn))">You were signed out after 10 minutes of inactivity.</div>
    <div v-if="$route.query.expired" class="mb-5 p-3 rounded-xl text-[13.5px]" style="background: rgb(var(--warn) / 0.12); color: rgb(var(--warn))">Your session ended. Please sign in again.</div>
    <form class="grid gap-4" @submit.prevent="submit" novalidate>
      <div><label class="field-label" for="email">Email</label><input id="email" v-model.trim="email" class="field" type="email" autocomplete="username" placeholder="you@company.com" autofocus /></div>
      <div>
        <label class="field-label" for="pw">Password</label>
        <div class="relative"><input id="pw" v-model="password" class="field" :type="show ? 'text' : 'password'" autocomplete="current-password" placeholder="••••••••••" style="padding-right: 44px" />
          <button type="button" class="btn ghost s-sm absolute" style="right: 4px; top: 6px; padding: 0 7px" @click="show = !show" :aria-label="show ? 'Hide password' : 'Show password'"><q-icon :name="show ? 'visibility_off' : 'visibility'" /></button></div>
      </div>
      <div v-if="error" class="text-[13.5px]" style="color: rgb(var(--bad))" role="alert">{{ error }}</div>
      <button class="btn primary s-lg block" :disabled="busy || !email || !password">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
    </form>
    <p class="text-center text-[14px] text-muted mt-6">New to Webfrest Pay? <router-link to="/register" class="font-semibold">Create an account</router-link></p>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from 'src/stores/auth';
const auth = useAuth(); const router = useRouter(); const route = useRoute();
const email = ref(''); const password = ref(''); const show = ref(false); const busy = ref(false); const error = ref('');
async function submit() {
  busy.value = true; error.value = '';
  try {
    const s = await auth.login(email.value, password.value);
    if (s.twoFactor) return router.push({ path: '/two-factor', query: route.query.next ? { next: route.query.next as string } : {} });
    router.replace(auth.landing(s, route.query.next as string | undefined));
  } catch (e: any) { error.value = e.message; } finally { busy.value = false; }
}
</script>
