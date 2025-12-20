# Stage 1: Build
FROM node:24-slim AS builder

WORKDIR /app

# Install dependencies needed for native modules (if any)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runner
FROM node:24-slim AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy only the necessary files from the builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Security: Run as a non-privileged user
USER node

EXPOSE 3000

# Metadata
LABEL maintainer="VeriMed DevOps"
LABEL project="VeriMed API"

CMD ["npm", "run", "start:prod"]
