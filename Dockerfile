FROM node:22-slim AS base

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --production=false

# Copy source
COPY . .

# Generate Prisma client
RUN npx drizzle-kit generate || true

# Build
RUN npm run build || true

# Production stage
FROM node:22-slim AS production

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --production && npm cache clean --force

COPY --from=base /app/dist ./dist
COPY --from=base /app/drizzle ./drizzle
COPY drizzle.config.ts ./
COPY .env.example ./

EXPOSE 3000

CMD ["node", "dist/index.js"]
