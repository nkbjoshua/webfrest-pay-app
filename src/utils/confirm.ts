import { reactive } from 'vue';

// One confirmation dialog for the whole app (replaces the browser's confirm()/prompt()).
//   if (!(await confirmDialog({ title: 'Revoke key?', message: '…', confirmText: 'Revoke', danger: true }))) return;
//   const note = await promptDialog({ title: 'Resolve item', label: 'What did you find?', required: true });  // null = cancelled
export interface ConfirmOptions { title: string; message?: string; confirmText?: string; cancelText?: string; danger?: boolean; icon?: string }
export interface PromptOptions extends ConfirmOptions { label: string; placeholder?: string; required?: boolean; initial?: string }

export const confirmState = reactive<{ open: boolean; opts: PromptOptions; prompt: boolean; value: string; resolve: ((v: any) => void) | null }>({
  open: false, opts: { title: '', label: '' }, prompt: false, value: '', resolve: null,
});

function show(opts: PromptOptions, prompt: boolean): Promise<any> {
  if (confirmState.resolve) confirmState.resolve(prompt ? null : false);        // a newer question replaces an older one
  return new Promise((resolve) => { Object.assign(confirmState, { open: true, opts, prompt, value: opts.initial ?? '', resolve }); });
}
export const confirmDialog = (opts: ConfirmOptions): Promise<boolean> => show({ label: '', ...opts }, false);
export const promptDialog = (opts: PromptOptions): Promise<string | null> => show(opts, true);

export function settleConfirm(accepted: boolean) {
  const r = confirmState.resolve; const v = confirmState.value.trim();
  confirmState.open = false; confirmState.resolve = null;
  r?.(confirmState.prompt ? (accepted ? v : null) : accepted);
}
