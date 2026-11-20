# Webfrest Pay web app

The Vue 3 / Quasar single-page app for Webfrest Pay: the **merchant dashboard** (`/dashboard`), the **Ops console** (`/ops`) and the **hosted checkout** (`/pay/:code`, `/l/:slug`), plus the embeddable popup script `public/webfrest-pay.js`. It talks to the Webfrest Pay API (repo `webfrest-pay`).

## Develop
```bash
cp .env.example .env      # WFP_API_BASE points at the API (default http://localhost:5400)
npm install
npm run dev               # http://localhost:9500
```

## Build and run (Docker, e.g. Dokploy)
The two addresses are written into the JavaScript at **build time**, so they are build arguments, not runtime variables:

| Build argument | Example |
|---|---|
| `WFP_API_BASE` | `https://pay-api.uat.webfrestlabs.com` (the API's public address) |
| `WFP_CHECKOUT_BASE` | `https://pay.uat.webfrestlabs.com` (this app's public address) |

```bash
docker build -t webfrest-pay-app --build-arg WFP_API_BASE=https://pay-api.uat.example.com --build-arg WFP_CHECKOUT_BASE=https://pay.uat.example.com .
docker run -p 8080:8080 webfrest-pay-app
```
The container serves the built app on port 8080 with single-page-app routing (every path returns `index.html`). In Dokploy: Build type Dockerfile, context path `.`, container port `8080`. The API must list this app's address in its `Public__AllowedOrigins__0` setting. Full deployment steps are in the API repo's `DEPLOY_DOKPLOY.md`.
