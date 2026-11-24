// Tiny static server for the production build (dist/spa) with history-mode fallback, plus the security headers
// a scanner (OWASP ZAP) expects: CSP, anti-clickjacking, HSTS, nosniff, referrer and permissions policies.
const path = require('path');
const express = require('express');

const app = express();
const dir = path.join(__dirname, 'dist', 'spa');

// The API the browser talks to (the same value the build used). Only its origin goes into connect-src.
const apiOrigin = (() => {
  try { return new URL(process.env.WFP_API_BASE || 'https://pay-api.webfrestlabs.com').origin; } catch { return 'https://pay-api.webfrestlabs.com'; }
})();

// The hosted checkout (/pay/...) is meant to be shown inside merchants' sites by webfrest-pay.js, so it may be framed
// by any HTTPS page. Everything else (merchant dashboard, Ops console, payment links) must never be framed.
const isEmbeddableCheckout = (p) => p.startsWith('/pay/');

const csp = (frameAncestors) => [
  "default-src 'self'",
  "script-src 'self'",
  // Vue/Quasar set inline style attributes at runtime; inline <script> stays forbidden.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}`,
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  `frame-ancestors ${frameAncestors}`,
  'upgrade-insecure-requests',
].join('; ');

app.disable('x-powered-by');

app.use((req, res, next) => {
  const embeddable = isEmbeddableCheckout(req.path);
  res.set({
    'Content-Security-Policy': csp(embeddable ? 'https:' : "'none'"),
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
  });
  if (!embeddable) res.set('X-Frame-Options', 'DENY');
  next();
});

app.use(
  express.static(dir, {
    index: false,
    setHeaders: (res, filePath) => {
      // Vite fingerprints everything under /assets, so those can be cached for a year; anything else revalidates hourly.
      if (filePath.includes(`${path.sep}assets${path.sep}`)) res.set('Cache-Control', 'public, max-age=31536000, immutable');
      else res.set('Cache-Control', 'public, max-age=3600');
    },
  })
);

// The HTML shell is never cached, so a new deployment is picked up immediately and nothing is kept on shared devices.
app.get('*', (_req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(dir, 'index.html'));
});

app.listen(process.env.PORT || 9500, () => console.log('Webfrest Pay app on', process.env.PORT || 9500));
