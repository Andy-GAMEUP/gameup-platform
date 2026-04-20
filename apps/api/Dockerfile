FROM node:22-alpine AS base
RUN npm install -g pnpm@10.30.3

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile --prod=false

# ---- runner ----
FROM base AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY packages ./packages

WORKDIR /app/apps/api
RUN mkdir -p uploads

EXPOSE 5000
ENV NODE_ENV=production

CMD ["node_modules/.bin/tsx", "src/index.ts"]
