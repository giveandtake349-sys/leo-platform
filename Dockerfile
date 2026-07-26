# ── Stage 1: Build ───────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production=false
COPY . .
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────
FROM node:20-alpine AS production
RUN apk add --no-cache dumb-init
WORKDIR /app

# Non-root user
RUN addgroup -g 1001 -S leo && adduser -S -u 1001 -G leo leo

# Only prod deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder --chown=leo:leo /app/dist ./dist

USER leo
EXPOSE 3000

# dumb-init handles PID 1 signal forwarding for graceful shutdown
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
