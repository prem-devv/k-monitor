FROM node:20-alpine AS builder
WORKDIR /app

# Copy root workspace configs
COPY package.json package-lock.json ./
# Copy workspace apps
COPY apps/web ./apps/web

# Install dependencies
RUN npm ci --workspace=apps/web

# Build
WORKDIR /app/apps/web
# NextAuth requires these at build time potentially
ENV NEXT_PUBLIC_API_URL=http://api:3001
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules

WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
