<template>
  <div>
    <PageHeader title="Security" subtitle="Protect your sign-in with a code from your phone." />

    <div v-if="loading" class="card card-pad text-muted">Loading…</div>
    <template v-else>
      <!-- status -->
      <div class="card card-pad flex items-center gap-4 flex-wrap">
        <div class="w-11 h-11 rounded-full flex items-center justify-center" :style="status.enabled ? 'background: rgb(var(--ok) / 0.15); color: rgb(var(--ok))' : 'background: rgb(var(--warn) / 0.15); color: rgb(var(--warn))'"><q-icon :name="status.enabled ? 'verified_user' : 'gpp_maybe'" size="24px" /></div>
        <div class="min-w-0 flex-1">
          <div class="font-semibold text-[15.5px]">Two-factor sign-in is {{ status.enabled ? 'on' : 'off' }}</div>
          <div class="text-[13.5px] text-muted">{{ status.enabled ? `Turned on ${ago(status.enabledAt)}. You'll be asked for a code each time you sign in.` : 'Add a second step so a stolen password isn\'t enough to get in.' }}</div>
        </div>
        <button v-if="!status.enabled && !setup.open" class="btn primary" :disabled="busy" @click="startSetup"><q-icon name="phonelink_lock" />Turn on</button>
        <button v-if="status.enabled" class="btn" @click="off.open = true">Turn off</button>
      </div>

      <!-- set-up -->
      <div v-if="setup.open" class="card card-pad mt-5">
        <h3 class="font-bold text-[16px] mb-1">Set up your authenticator app</h3>
        <p class="text-[13.5px] text-muted mb-4">Use Google Authenticator, Microsoft Authenticator or any app that scans a QR code.</p>
        <div class="grid gap-6" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))">
          <div>
            <div class="font-semibold text-[13.5px] mb-2">1. Scan this code</div>
            <img v-if="setup.qr" :src="setup.qr" alt="QR code for your authenticator app" width="200" height="200" style="border-radius: 12px; background: #fff; padding: 8px" />
            <div class="text-[12.5px] text-muted mt-3">Can't scan? Enter this key in the app instead:</div>
            <CopyText :text="setup.secret" />
          </div>
          <div>
            <div class="font-semibold text-[13.5px] mb-2">2. Enter the 6-digit code it shows</div>
            <input v-model="setup.code" class="field" inputmode="numeric" maxlength="7" placeholder="123456" autocomplete="one-time-code" style="letter-spacing: 0.18em; font-size: 20px; text-align: center; max-width: 220px" @keyup.enter="enable" />
            <div v-if="setup.error" class="text-[13.5px] mt-2" style="color: rgb(var(--bad))" role="alert">{{ setup.error }}</div>
            <div class="mt-3 flex gap-2"><button class="btn primary" :disabled="busy || digits(setup.code) !== 6" @click="enable">{{ busy ? 'Checking…' : 'Turn on' }}</button><button class="btn" @click="setup.open = false">Cancel</button></div>
          </div>
        </div>
      </div>

      <!-- recovery codes: shown once -->
      <div v-if="codes.length" class="card card-pad mt-5" style="border-color: rgb(var(--warn) / 0.5)">
        <h3 class="font-bold text-[16px] mb-1">Save your recovery codes</h3>
        <p class="text-[13.5px] text-muted mb-4">If you lose your phone, each of these lets you sign in once. They won't be shown again, so keep them somewhere safe (a password manager, or printed).</p>
        <div class="grid gap-2 mb-4" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))"><div v-for="c in codes" :key="c" class="mono rounded-lg px-3 py-2 text-center" style="background: rgb(var(--sunken)); font-size: 15px; letter-spacing: 0.06em">{{ c }}</div></div>
        <div class="flex gap-2 flex-wrap"><button class="btn" @click="copyCodes"><q-icon name="content_copy" />Copy</button><button class="btn" @click="downloadCodes"><q-icon name="download" />Download</button><button class="btn primary" @click="codes = []">I've saved them</button></div>
      </div>

      <template v-if="status.enabled && !setup.open">
        <!-- backup phone -->
        <div class="card card-pad mt-5">
          <h3 class="font-bold text-[16px] mb-1">Backup phone (text messages)</h3>
          <p class="text-[13.5px] text-muted mb-3">If you can't open your authenticator app, we can text you a code instead.</p>
          <div v-if="!status.smsAvailable" class="text-[13.5px] text-muted">Text-message codes aren't switched on yet. Your authenticator app and recovery codes still work.</div>
          <template v-else>
            <div v-if="status.phoneMasked && !phone.open" class="flex items-center gap-3 flex-wrap"><b>{{ status.phoneMasked }}</b><button class="btn s-sm" @click="openPhone">Change</button><button class="btn s-sm" :disabled="busy" @click="removePhone">Remove</button></div>
            <button v-else-if="!phone.open" class="btn" @click="openPhone"><q-icon name="add" />Add a phone number</button>
            <div v-if="phone.open" class="grid gap-3" style="max-width: 360px">
              <template v-if="!phone.sent">
                <div><label class="field-label">Mobile number</label><input v-model.trim="phone.number" class="field" inputmode="tel" placeholder="0548068712" /></div>
                <div class="flex gap-2"><button class="btn primary" :disabled="busy || !phone.number" @click="sendPhoneCode">{{ busy ? 'Sending…' : 'Text me a code' }}</button><button class="btn" @click="phone.open = false">Cancel</button></div>
              </template>
              <template v-else>
                <div class="text-[13.5px]">Enter the code we sent to <b>{{ phone.masked }}</b>.</div>
                <input v-model="phone.code" class="field" inputmode="numeric" maxlength="7" placeholder="123456" autocomplete="one-time-code" style="letter-spacing: 0.18em; font-size: 20px; text-align: center" @keyup.enter="confirmPhone" />
                <div class="flex gap-2"><button class="btn primary" :disabled="busy || digits(phone.code) !== 6" @click="confirmPhone">Save phone</button><button class="btn" @click="phone.open = false">Cancel</button></div>
              </template>
              <div v-if="phone.error" class="text-[13.5px]" style="color: rgb(var(--bad))" role="alert">{{ phone.error }}</div>
            </div>
          </template>
        </div>

        <!-- recovery -->
        <div class="card card-pad mt-5">
          <h3 class="font-bold text-[16px] mb-1">Recovery codes</h3>
          <p class="text-[13.5px] text-muted mb-3">You have <b :style="status.recoveryRemaining <= 2 ? 'color: rgb(var(--bad))' : ''">{{ status.recoveryRemaining }}</b> unused recovery code{{ status.recoveryRemaining === 1 ? '' : 's' }}.</p>
          <button class="btn" @click="regen.open = true"><q-icon name="autorenew" />Get new codes</button>
        </div>
      </template>

      <div class="card card-pad mt-5 flex items-center justify-between gap-3 flex-wrap"><div><b>Password</b><div class="text-[13.5px] text-muted">Change it if you think someone else knows it.</div></div><router-link class="btn" to="/change-password">Change password</router-link></div>
    </template>

    <Modal v-model="off.open" title="Turn off two-factor sign-in">
      <p class="text-[13.5px] text-muted">Confirm with your password and a current code from your authenticator app (or a recovery code).</p>
      <div><label class="field-label">Password</label><input v-model="off.password" class="field" type="password" autocomplete="current-password" /></div>
      <div><label class="field-label">Code</label><input v-model="off.code" class="field" autocomplete="one-time-code" placeholder="123456" /></div>
      <div v-if="off.error" class="text-[13.5px]" style="color: rgb(var(--bad))" role="alert">{{ off.error }}</div>
      <template #footer><button class="btn" @click="off.open = false">Cancel</button><button class="btn primary" :disabled="busy || !off.password || !off.code" @click="turnOff">Turn off</button></template>
    </Modal>
    <Modal v-model="regen.open" title="Get new recovery codes">
      <p class="text-[13.5px] text-muted">Your old codes stop working. Enter a current code from your authenticator app to continue.</p>
      <div><label class="field-label">Code</label><input v-model="regen.code" class="field" inputmode="numeric" maxlength="7" placeholder="123456" autocomplete="one-time-code" @keyup.enter="regenerate" /></div>
      <div v-if="regen.error" class="text-[13.5px]" style="color: rgb(var(--bad))" role="alert">{{ regen.error }}</div>
      <template #footer><button class="btn" @click="regen.open = false">Cancel</button><button class="btn primary" :disabled="busy || digits(regen.code) !== 6" @click="regenerate">Get new codes</button></template>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { confirmDialog, promptDialog } from 'src/utils/confirm';
import { onMounted, reactive, ref } from 'vue';
import QRCode from 'qrcode';
import PageHeader from 'src/components/PageHeader.vue'; import Modal from 'src/components/Modal.vue'; import CopyText from 'src/components/CopyText.vue';
import { get, post, del, fail, ok } from 'src/services/api';
import { ago, copy } from 'src/utils/format'; import { useAuth } from 'src/stores/auth';
const auth = useAuth();
const loading = ref(true); const busy = ref(false);
const status = reactive<any>({ enabled: false, enabledAt: null, phoneMasked: null, smsAvailable: false, recoveryRemaining: 0 });
const setup = reactive({ open: false, secret: '', qr: '', code: '', error: '' });
const codes = ref<string[]>([]);
const phone = reactive({ open: false, number: '', sent: false, masked: '', code: '', error: '' });
const off = reactive({ open: false, password: '', code: '', error: '' });
const regen = reactive({ open: false, code: '', error: '' });
const digits = (s: string) => (s || '').replace(/\D/g, '').length;

async function load() { try { Object.assign(status, (await get('/auth/2fa/status')).data); } catch (e) { fail(e); } finally { loading.value = false; } }
async function syncSession() { try { await auth.refresh(); } catch { /* the page still works */ } }

async function startSetup() {
  busy.value = true;
  try { const r = (await post('/auth/2fa/setup')).data; Object.assign(setup, { open: true, secret: r.secret, code: '', error: '', qr: await QRCode.toDataURL(r.uri, { width: 220, margin: 1 }) }); }
  catch (e) { fail(e); } finally { busy.value = false; }
}
async function enable() {
  busy.value = true; setup.error = '';
  try { const r = await post('/auth/2fa/enable', { code: setup.code }); codes.value = r.data.recoveryCodes; setup.open = false; ok('Two-factor sign-in is on'); await load(); await syncSession(); }
  catch (e: any) { setup.error = e.message; setup.code = ''; } finally { busy.value = false; }
}
async function turnOff() {
  busy.value = true; off.error = '';
  try { await post('/auth/2fa/disable', { password: off.password, code: off.code }); off.open = false; Object.assign(off, { password: '', code: '' }); codes.value = []; ok('Two-factor sign-in is off'); await load(); await syncSession(); }
  catch (e: any) { off.error = e.message; } finally { busy.value = false; }
}
async function regenerate() {
  busy.value = true; regen.error = '';
  try { const r = await post('/auth/2fa/recovery-codes', { code: regen.code }); codes.value = r.data.recoveryCodes; regen.open = false; regen.code = ''; await load(); }
  catch (e: any) { regen.error = e.message; } finally { busy.value = false; }
}
function openPhone() { Object.assign(phone, { open: true, number: '', sent: false, masked: '', code: '', error: '' }); }
async function sendPhoneCode() {
  busy.value = true; phone.error = '';
  try { const r = await post('/auth/2fa/phone/send', { phone: phone.number }); phone.sent = true; phone.masked = r.data.phoneMasked; } catch (e: any) { phone.error = e.message; } finally { busy.value = false; }
}
async function confirmPhone() {
  busy.value = true; phone.error = '';
  try { await post('/auth/2fa/phone/confirm', { code: phone.code }); phone.open = false; ok('Backup phone saved'); await load(); } catch (e: any) { phone.error = e.message; phone.code = ''; } finally { busy.value = false; }
}
async function removePhone() { if (!(await confirmDialog({ title: 'Remove your backup phone?', message: "You won't be able to get sign-in codes by text message until you add one again.", confirmText: 'Remove phone', danger: true }))) return; busy.value = true; try { await del('/auth/2fa/phone'); ok('Backup phone removed'); await load(); } catch (e) { fail(e); } finally { busy.value = false; } }
async function copyCodes() { if (await copy(codes.value.join('\n'))) ok('Copied'); }
function downloadCodes() {
  const blob = new Blob([`Webfrest Pay recovery codes for ${auth.user?.email}\nEach code works once.\n\n${codes.value.join('\n')}\n`], { type: 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'webfrest-pay-recovery-codes.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
onMounted(load);
</script>
