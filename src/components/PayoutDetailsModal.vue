<template>
  <Modal :model-value="modelValue" :title="detail ? `Payout ${detail.payout.id}` : 'Payout'" :width="720" @update:model-value="$emit('update:modelValue', $event)">
    <div v-if="loading" class="skeleton" style="height: 280px"></div>
    <template v-else-if="detail">
      <div class="dsec">
        <h4>Summary</h4>
        <div class="flex items-center gap-3 flex-wrap mb-3"><span class="text-[26px] font-extrabold">{{ ghs(detail.payout.amount) }}</span><StatusBadge :status="detail.payout.status" /><span class="chip" :class="detail.payout.mode">{{ detail.payout.mode }}</span><span class="chip">{{ kindLabel(detail.payout.kind) }}</span></div>
        <dl class="kv"><dt>Payout fee</dt><dd>{{ ghs(detail.payout.fee) }} <span class="text-muted">(paid by the merchant, on top)</span></dd><dt>Total taken from balance</dt><dd>{{ ghs(detail.payout.amount + detail.payout.fee) }}</dd><dt>Narration</dt><dd>{{ detail.payout.narration || '-' }}</dd>
          <template v-if="detail.payout.failureReason"><dt>Failure</dt><dd style="color: rgb(var(--bad))">{{ detail.payout.failureReason }}</dd></template></dl>
      </div>
      <div class="dsec">
        <h4><q-icon name="storefront" size="15px" />{{ internal ? 'Merchant' : 'Paid out for' }}</h4>
        <dl class="kv"><dt>Business</dt><dd><router-link v-if="internal" :to="`/ops/merchants/${detail.merchant.id}`" @click="$emit('update:modelValue', false)">{{ detail.merchant.name }}</router-link><span v-else>{{ detail.merchant.name }}</span> <span class="mono text-muted">{{ detail.merchant.code }}</span></dd><dt>Type</dt><dd>{{ detail.merchant.type }}<span v-if="detail.merchant.parent"> under {{ detail.merchant.parent }}</span></dd><dt>Contact</dt><dd>{{ detail.merchant.email }}<span v-if="detail.merchant.phone"> · {{ detail.merchant.phone }}</span></dd>
          <dt>Settlement</dt><dd>{{ detail.merchant.settlementMode === 'Auto' ? 'Daily' : detail.merchant.settlementMode }} · {{ detail.merchant.payoutApprovalMode === 'Ops' ? 'Ops approves' : detail.merchant.payoutApprovalMode === 'Both' ? 'Merchant + Ops approve' : 'Merchant approves' }}</dd></dl>
      </div>
      <div class="dsec" v-if="detail.bank">
        <h4><q-icon name="account_balance" size="15px" />Destination account</h4>
        <dl class="kv"><dt>Bank</dt><dd>{{ detail.bank.bankName }}</dd><dt>Account name</dt><dd>{{ detail.bank.accountName }}</dd>
          <dt>Account number</dt><dd><Reveal :masked="`····${detail.bank.last4}`" :enabled="canReveal" :load="() => revealAccount(detail.bank.id)" /></dd>
          <dt>Sort code</dt><dd class="mono">{{ detail.bank.sortCode || '-' }}</dd>
          <template v-if="internal"><dt>Bank's own name</dt><dd>{{ detail.bank.bankSaysName || '-' }}<span v-if="detail.bank.nameMatch != null" class="text-muted"> · {{ detail.bank.nameMatch }}% match</span></dd></template>
          <dt>Verified</dt><dd><StatusBadge :status="detail.bank.status" /> <span v-if="detail.bank.verifiedAt" class="text-muted">{{ dt(detail.bank.verifiedAt) }}<span v-if="detail.bank.verifiedBy"> by {{ detail.bank.verifiedBy }}</span></span></dd></dl>
      </div>
      <div class="dsec">
        <h4><q-icon name="timeline" size="15px" />Timeline & approvals</h4>
        <dl class="kv"><dt>Requested</dt><dd>{{ dt(detail.payout.createdAt) }} · via {{ detail.payout.via }}<span v-if="detail.createdBy"> · by {{ detail.createdBy }}</span><span v-if="detail.requestedBy"> · for {{ detail.requestedBy }}</span></dd>
          <template v-for="a in detail.approvals" :key="a.at"><dt>{{ a.stage }} {{ a.decision.toLowerCase() }}</dt><dd>{{ dt(a.at) }} · {{ a.person }} <span class="text-muted">({{ a.email }})</span><div v-if="a.note" class="text-muted">“{{ a.note }}”</div></dd></template>
          <template v-if="!detail.approvals.length"><dt>Approvals</dt><dd class="text-muted">None yet</dd></template>
          <template v-if="detail.payout.approvedAt"><dt>Approved</dt><dd>{{ dt(detail.payout.approvedAt) }}</dd></template><template v-if="detail.payout.paidAt"><dt>Paid</dt><dd>{{ dt(detail.payout.paidAt) }}</dd></template></dl>
      </div>
      <div class="dsec">
        <h4><q-icon name="swap_horiz" size="15px" />{{ internal ? 'Bank / provider' : 'Bank transfer' }}</h4>
        <dl class="kv"><dt v-if="internal">Sent through</dt><dd v-if="internal">{{ detail.provider.code || 'Not sent yet' }}</dd><dt>Bank reference</dt><dd><CopyText v-if="detail.provider.reference" :text="detail.provider.reference" /><span v-else class="text-muted">-</span></dd><dt>Processed</dt><dd>{{ detail.provider.processedAt ? dt(detail.provider.processedAt) : '-' }}</dd></dl>
      </div>
      <div class="dsec" v-if="detail.payout.kind !== 'Request'">
        <h4><q-icon name="receipt_long" size="15px" />Payments in this payout ({{ detail.paymentsTotal }})</h4>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Reference</th><th>Paid</th><th class="num">Charged</th><th class="num">To school</th></tr></thead><tbody>
          <tr v-for="t in detail.payments" :key="t.id" class="click" @click="$router.push(`${base}/transactions/${t.id}`)"><td>{{ t.reference }}<div class="mono text-muted" style="font-size: 11px">{{ t.id }}</div></td><td>{{ dt(t.paidAt) }}</td><td class="num">{{ ghs(t.amount) }}</td><td class="num">{{ ghs(t.net) }}</td></tr></tbody></table></div>
        <p v-if="detail.paymentsTotal > detail.paymentsShown" class="text-[12.5px] text-muted mt-2">Showing the newest {{ detail.paymentsShown }} of {{ detail.paymentsTotal }}. The statement has them all.</p>
      </div>
    </template>
    <template #footer><button v-if="detail && detail.payout.kind !== 'Request'" class="btn" @click="$emit('statement', detail.payout.id)">Statement</button><button class="btn primary" @click="$emit('update:modelValue', false)">Close</button></template>
  </Modal>
</template>
<script setup lang="ts">
import Modal from './Modal.vue'; import StatusBadge from './StatusBadge.vue'; import Reveal from './Reveal.vue'; import CopyText from './CopyText.vue';
import { ghs, dt } from 'src/utils/format';
// One payout, grouped into sections. Used by the Ops console (internal) and the merchant dashboard.
defineProps<{ modelValue: boolean; detail: any; loading?: boolean; revealAccount: (bankId: string) => Promise<string>; canReveal?: boolean; internal?: boolean; base: string }>();
defineEmits(['update:modelValue', 'statement']);
const kindLabel = (k: string) => (k === 'Instant' ? 'Instant payout' : k === 'Batch' ? 'Daily batch' : 'Requested payout');
</script>
