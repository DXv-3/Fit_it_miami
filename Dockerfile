# Dockerfile  —  Fit It Miami  —  Cloud Run deployment
# Build: gcloud builds submit --tag gcr.io/YOUR_PROJECT/fit-it-miami

# ---- deps stage ----
FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- build stage ----
FROM deps AS builder
COPY . .
RUN npm run build
# dist/ now contains the compiled Vite SPA

# ---- production stage ----
FROM node:22-slim AS runner
WORKDIR /app

# Only production deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src/lib/gemini.ts ./src/lib/gemini.ts
COPY --from=builder /app/src/types/lead.ts ./src/types/lead.ts
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Cloud Run listens on PORT env var (default 3000)
ENV NODE_ENV=production
EXPOSE 3000

# Use tsx to run TypeScript directly in production
CMD ["npx", "tsx", "server.ts"]
