# syntax=docker/dockerfile:1

# Stage 1: Base runtime environment
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production

# Stage 2: Install dependencies
FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json .npmrc* ./
COPY prisma ./prisma/
RUN --mount=type=cache,target=/root/.npm npm ci
RUN npx prisma generate

# Stage 3: Build application
FROM base AS builder
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 4: Background Worker Service
FROM node:22-alpine AS worker
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl curl
ENV NODE_ENV=production
ENV PORT=8080

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 workeruser

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

USER workeruser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

CMD ["npm", "run", "worker:docker"]

# Stage 5: Next.js Web Service (Default final stage)
FROM node:22-alpine AS web
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl curl
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
