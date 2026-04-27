FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api ./apps/api

RUN npm ci --workspace=apps/api

WORKDIR /app/apps/api
RUN npx tsc

FROM node:20-alpine
WORKDIR /app

RUN mkdir -p /app/data

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV DB_PATH=/app/data/db.json

EXPOSE 3001

CMD ["npm", "start"]