# Multi-stage build for the hts-qbo-sync service.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY bin ./bin
COPY scripts ./scripts
COPY migrations ./migrations
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
# Default process is the webhook server; the worker and CDC poller run as
# separate Fly processes (see fly.toml [processes]).
CMD ["node", "dist/src/server.js"]
