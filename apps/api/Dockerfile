FROM node:20-alpine AS builder
WORKDIR /app

# Install build tools for native modules (better-sqlite3, redis-memory-server)
RUN apk add --no-cache python3 make g++

# Copy root workspace configs
COPY package.json package-lock.json ./
# Copy workspace apps
COPY apps/api ./apps/api

# Install dependencies (only api)
RUN npm ci --workspace=apps/api

# Build
WORKDIR /app/apps/api
RUN npm run build

FROM node:20-alpine
WORKDIR /app

RUN mkdir -p /app/data

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/package-lock.json ./apps/api/package-lock.json

WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV DB_PATH=/app/data/k-monitor.db

EXPOSE 3001

CMD ["npm", "start"]
