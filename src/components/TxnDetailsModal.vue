<template>
  <Modal :model-value="modelValue" :title="row ? `Payment ${row.reference}` : 'Payment'" :width="840" @update:model-value="$emit('update:modelValue', $event)">
    <template v-if="row">
      <div class="hero card">
        <div class="hero-left">
          <span class="hero-icon"><q-icon name="swap_horiz" size="34px" /></span>
          <div class="min-w-0">
            <div class="text-[13.5px] text-muted">Payment amount</div>
            <div class="flex items-center gap-3 flex-wrap"><span class="text-[30px] font-extrabold leading-tight nowrap">{{ ghs(row.chargeAmount) }}</span><StatusBadge :status="row.status" /><span class="chip" :class="row.mode">{{ row.mode }}</span><span v-if="row.riskFlagged && internal" class="badge warn">Flagged</span></div>
            <div class="flex items-center gap-2 text-[13px] mt-1"><span class="text-muted">Transaction</span><CopyText :text="row.id" /></div>
          </div>
        </div>
        <div class="hero-right">
          <div class="hrow"><span class="text-muted">Created</span><q-icon name="calendar_today" size="17px" class="text-muted" /><span>{{ dt(row.createdAt) }}</span></div>
          <div class="hrow"><span class="text-muted">Paid</span><q-icon name="calendar_today" size="17px" class="text-muted" /><span>{{ row.paidAt ? dt(row.paidAt) : '-' }}</span></div>
        </div>
      </div>
      <div v-if="row.failureReason" class="mt-3 p-3 rounded-xl text-[13.5px]" style="background: rgb(var(--bad) / 0.1); color: rgb(var(--bad))"><b>Failed:</b> {{ row.failureReason }}</div>
      <div class="grid2 mt-4">
        <SectionCard icon="person_outline" title="Payer">
          <dl class="rows"><div class="row"><dt>Name</dt><dd>{{ row.customer.name || '-' }}</dd></div><div class="row"><dt>Email</dt><dd>{{ row.customer.email || '-' }}</dd></div>
            <div class="row"><dt>Wallet / phone</dt><dd><Reveal v-if="row.customer.hasPhone" :masked="row.customer.phone" :enabled="canRevealPayer" :load="() => reveal(row.id).then((r) => r.payerPhone)" /><span v-else>-</span></dd></div>
            <div class="row"><dt>Method</dt><dd>{{ channelLabel(row.channel) }}<span v-if="row.network"> · {{ row.network }}</span></dd></div></dl>
        </SectionCard>
        <SectionCard icon="savings" title="Money">
          <dl class="rows"><div class="row"><dt>Amount charged</dt><dd>{{ ghs(row.chargeAmount) }}</dd></div><div class="row"><dt>Webfrest fee</dt><dd>{{ ghs(row.fees) }} <span class="text-muted">(paid by {{ feeBearer(row.feeBearer) }})</span></dd></div>
            <div v-if="row.commission" class="row"><dt>Platform commission</dt><dd>{{ ghs(row.commission) }}</dd></div>
            <div class="row"><dt>To the school / merchant</dt><dd><b>{{ ghs(row.receiverNet) }}</b></dd></div><div v-if="internal" class="row"><dt>Bank's fee</dt><dd>{{ row.providerFee != null ? ghs(row.providerFee) : '-' }}</dd></div>
            <div class="row"><dt>Refunded</dt><dd>{{ ghs(row.refunded) }}</dd></div><div class="row"><dt>Clears</dt><dd>{{ row.clearedAt ? 'Cleared ' + dt(row.clearedAt) : row.clearsAt ? 'Clears ' + dt(row.clearsAt) : '-' }}</dd></div></dl>
        </SectionCard>
        <SectionCard icon="account_balance" title="Paid To">
          <dl class="rows"><div v-if="row.merchant" class="row"><dt>Merchant</dt><dd>{{ row.merchant }}</dd></div><div v-if="row.subaccount" class="row"><dt>School</dt><dd class="mono">{{ row.subaccount }}</dd></div>
            <template v-if="row.receiver"><div class="row"><dt>Bank</dt><dd>{{ row.receiver.bank }}</dd></div><div class="row"><dt>Account name</dt><dd>{{ row.receiver.accountName }}</dd></div>
              <div class="row"><dt>Account number</dt><dd><Reveal :masked="`•••• ${row.receiver.last4}`" :enabled="canRevealAccount" :load="() => reveal(row.id).then((r) => r.account?.number)" /></dd></div></template>
            <div class="row"><dt>Payout</dt><dd>{{ row.payout ? row.payout : (['success', 'partiallyrefunded', 'refunded'].includes(row.status) ? 'Not paid out yet' : '-') }}</dd></div></dl>
        </SectionCard>
        <SectionCard v-if="internal" icon="link" title="Bank / Provider">
          <dl class="rows"><div class="row"><dt>Provider</dt><dd>{{ row.provider || '-' }}</dd></div><div class="row"><dt>Bank reference</dt><dd><CopyText v-if="row.providerReference" :text="row.providerReference" /><span v-else>-</span></dd></div></dl>
        </SectionCard>
        <SectionCard v-else icon="description" title="Details">
          <dl class="rows"><div class="row"><dt>Your reference</dt><dd>{{ row.reference }}</dd></div><div v-if="row.description" class="row"><dt>Description</dt><dd>{{ row.description }}</dd></div></dl>
        </SectionCard>
      </div>
    </template>
    <template #footer>
      <button class="btn s-lg" @click="$emit('update:modelValue', false)">Close</button>
      <button v-if="fullPage && row" class="btn primary two-line" @click="$router.push(`${fullPage}/${row.id}`)"><q-icon name="open_in_new" size="22px" /><span class="flex flex-col items-start leading-tight"><b>Open full page</b><small>{{ internal ? 'View events, ledger and more' : 'View the timeline and refunds' }}</small></span></button>
    </template>
  </Modal>
</template>
<script setup lang="ts">
import Modal from './Modal.vue'; import StatusBadge from './StatusBadge.vue'; import Reveal from './Reveal.vue'; import CopyText from './CopyText.vue'; import SectionCard from './SectionCard.vue';
import { ghs, dt, channelLabel } from 'src/utils/format';
// One payment, grouped into sections. Used by both the Ops console (internal = true) and the merchant dashboard.
defineProps<{ modelValue: boolean; row: any; reveal: (id: string) => Promise<any>; canRevealPayer?: boolean; canRevealAccount?: boolean; internal?: boolean; fullPage?: string }>();
defineEmits(['update:modelValue']);
const feeBearer = (b: string) => ({ Subaccount: 'the school', Customer: 'the payer', Platform: 'the platform' } as any)[b] || b;
</script>
<style scoped>
.hero { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 16px 20px; flex-wrap: wrap; }
.hero-left { display: flex; align-items: center; gap: 18px; min-width: 0; }
.hero-icon { width: 78px; height: 78px; border-radius: 20px; background: rgb(var(--brand) / 0.12); color: rgb(var(--brand)); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.hero-right { display: grid; gap: 12px; padding-left: 22px; border-left: 1px solid rgb(var(--line)); font-size: 13.5px; }
.hrow { display: grid; grid-template-columns: 62px 22px auto; align-items: center; gap: 8px; }
.grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
@media (max-width: 760px) { .grid2 { grid-template-columns: 1fr; } .hero-right { border-left: 0; padding-left: 0; } }
.two-line { height: 52px; padding: 0 20px; gap: 12px; } .two-line small { font-weight: 500; opacity: 0.85; font-size: 12px; }
</style>
