/*!
 * Webfrest Pay - embeddable checkout popup
 *
 *   <script src="https://pay.example.com/webfrest-pay.js" data-api-base="https://api.example.com"></script>
 *
 *   // 1) Best: create the payment on your server (POST /v1/transactions/initialize), then open it:
 *   WebfrestPay.open({ accessCode: 'abc…', onSuccess: (r) => {}, onClose: () => {} });
 *
 *   // 2) Quick: create it from the page with your PUBLIC key (amounts can be tampered with - always verify on your server):
 *   WebfrestPay.checkout({ key: 'wf_pk_test_…', email: 'ama@example.com', amount: 15000, reference: 'order-1', onSuccess: (r) => {} });
 */
(function (global) {
  'use strict';
  var script = document.currentScript || (function () { var s = document.getElementsByTagName('script'); return s[s.length - 1]; })();
  var origin = new URL(script.src, location.href).origin;
  var apiBase = (script.getAttribute('data-api-base') || origin).replace(/\/$/, '');
  var overlay, frame, handlers = {}, spinner;

  function css() {
    if (document.getElementById('wfp-css')) return;
    var s = document.createElement('style'); s.id = 'wfp-css';
    s.textContent =
      '.wfp-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(5,12,30,.62);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);animation:wfpf .18s ease}' +
      '.wfp-box{position:relative;width:min(460px,100vw);height:min(720px,100vh);background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 30px 80px -20px rgba(0,0,0,.6)}' +
      '.wfp-box iframe{width:100%;height:100%;border:0;background:#fff}' +
      '.wfp-x{position:absolute;top:10px;right:10px;z-index:2;width:32px;height:32px;border-radius:50%;border:0;background:rgba(11,27,58,.08);color:#0b1b3a;font:600 18px/1 sans-serif;cursor:pointer}' +
      '.wfp-x:hover{background:rgba(11,27,58,.16)}' +
      '.wfp-sp{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#fff;color:#64748b;font:500 14px system-ui}' +
      '@media(max-width:520px){.wfp-box{border-radius:0;width:100vw;height:100vh}}' +
      '@keyframes wfpf{from{opacity:0}to{opacity:1}}';
    document.head.appendChild(s);
  }

  function close(notify) {
    if (!overlay) return;
    window.removeEventListener('message', onMessage);
    document.removeEventListener('keydown', onKey);
    overlay.remove(); overlay = frame = null;
    document.documentElement.style.overflow = '';
    if (notify !== false && handlers.onClose) handlers.onClose();
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function onMessage(e) {
    if (e.origin !== origin || !e.data || e.data.source !== 'webfrest-pay') return;
    var d = e.data;
    if (d.event === 'ready' && spinner) { spinner.remove(); spinner = null; }
    else if (d.event === 'redirect' && d.url) { window.location.href = d.url; }       // banks can't be framed, so we leave the page for the bank step
    else if (d.event === 'success') { if (handlers.onSuccess) handlers.onSuccess({ reference: d.reference }); }
    else if (d.event === 'close') { close(); }
  }

  function open(opts) {
    if (!opts || !opts.accessCode) throw new Error('WebfrestPay.open needs an accessCode');
    css(); if (overlay) close(false);
    handlers = { onSuccess: opts.onSuccess, onClose: opts.onClose };
    overlay = document.createElement('div'); overlay.className = 'wfp-ov';
    overlay.innerHTML = '<div class="wfp-box"><button class="wfp-x" aria-label="Close">&times;</button><div class="wfp-sp">Loading secure checkout…</div></div>';
    var box = overlay.firstChild; spinner = box.querySelector('.wfp-sp');
    box.querySelector('.wfp-x').onclick = function () { close(); };
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    frame = document.createElement('iframe');
    frame.title = 'Webfrest Pay checkout'; frame.allow = 'payment';
    frame.src = origin + '/pay/' + encodeURIComponent(opts.accessCode) + '?embed=1';
    box.insertBefore(frame, spinner);
    document.body.appendChild(overlay); document.documentElement.style.overflow = 'hidden';
    window.addEventListener('message', onMessage); document.addEventListener('keydown', onKey);
  }

  function checkout(opts) {
    if (!opts || !opts.key) throw new Error('WebfrestPay.checkout needs your public key');
    return fetch(apiBase + '/checkout/initialize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: opts.key, amount: opts.amount, email: opts.email, phone: opts.phone, name: opts.name, reference: opts.reference, callbackUrl: opts.callbackUrl, description: opts.description, metadata: opts.metadata, channel: opts.channel }),
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.status) { if (opts.onError) opts.onError(j); else alert(j.message || 'Could not start the payment.'); return; }
      open({ accessCode: j.data.accessCode, onSuccess: opts.onSuccess, onClose: opts.onClose });
    }).catch(function (e) { if (opts.onError) opts.onError(e); else alert('Could not reach Webfrest Pay.'); });
  }

  global.WebfrestPay = { open: open, checkout: checkout, close: close };
})(window);
