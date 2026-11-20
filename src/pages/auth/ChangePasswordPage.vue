<template>
  <div>
    <h1 class="text-[28px] font-extrabold">{{ auth.user?.mustChangePassword ? 'Set a new password' : 'Change password' }}</h1>
    <p class="text-muted mt-1.5 mb-6">{{ auth.user?.mustChangePassword ? 'For your security, replace the temporary password before continuing.' : 'Choose a strong password you don\'t use anywhere else.' }}</p>
    <form class="grid gap-4" @submit.prevent="submit" novalidate>
      <div><label class="field-label">Current password</label><input v-model="cur" class="field" type="password" autocomplete="current-password" /></div>
      <div><label class="field-label">New password</label><input v-model="next" class="field" type="password" autocomplete="new-password" /><p class="field-hint">At least 10 characters with upper-case, lower-case and a number.</p></div>
      <div v-if="error" class="text-[13.5px]" style="color: rgb(var(--bad))" role="alert">{{ error }}</div>
      <button class="btn primary s-lg block" :disabled="busy || !cur || !next">{{ busy ? 'Saving…' : 'Save password' }}</button>
    </form>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { post, ok } from 'src/services/api';
import { useAuth } from 'src/stores/auth';
const auth = useAuth(); const router = useRouter();
const cur = ref(''); const next = ref(''); const busy = ref(false); const error = ref('');
async function submit() {
  busy.value = true; error.value = '';
  try { const r = await post('/auth/change-password', { currentPassword: cur.value, newPassword: next.value }); auth.set(r.data); ok('Password changed'); router.replace(auth.isOps ? '/ops/overview' : '/dashboard/overview'); }
  catch (e: any) { error.value = e.message; } finally { busy.value = false; }
}
</script>
