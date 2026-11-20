# Webfrest Pay web app (Quasar SPA: merchant dashboard, Ops console, hosted checkout) served by a tiny Node server. Build context = this folder.
# The two URLs below are baked into the JavaScript at BUILD time, so pass them as build arguments (Dokploy: Build Args):
#   WFP_API_BASE       https://pay-api.uat.example.com     (the API's public address)
#   WFP_CHECKOUT_BASE  https://pay.uat.example.com         (this app's public address; used for hosted-checkout links)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG WFP_API_BASE
ARG WFP_CHECKOUT_BASE
ENV WFP_API_BASE=$WFP_API_BASE WFP_CHECKOUT_BASE=$WFP_CHECKOUT_BASE
RUN npx quasar build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "server.js"]
