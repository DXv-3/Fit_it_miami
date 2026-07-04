# Deployment Guide — Fit It Miami

Two supported deployment targets: **Google Cloud Run** (recommended, matches AI Studio) and **Vercel** (frontend-only, requires separate API server).

---

## Option A: Google Cloud Run (full-stack, recommended)

Cloud Run runs the Express server (`server.ts`) which serves both the API and the built Vite frontend.

### 1. Prerequisites

```bash
# Install gcloud CLI if not already installed
brew install google-cloud-sdk
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Build the frontend

```bash
npm install
npm run build
# Output: dist/
```

### 3. Create a Dockerfile

```dockerfile
# Dockerfile
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "--import=tsx/esm", "server.ts"]
```

### 4. Build and push container

```bash
export PROJECT_ID=$(gcloud config get-value project)
export REGION=us-east1
export SERVICE_NAME=fit-it-miami

gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME
```

### 5. Deploy to Cloud Run

```bash
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY \
  --set-env-vars TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID \
  --set-env-vars TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN \
  --set-env-vars TWILIO_PHONE_NUMBER=$TWILIO_PHONE_NUMBER \
  --set-env-vars MAKE_WEBHOOK_URL=$MAKE_WEBHOOK_URL \
  --set-env-vars NODE_ENV=production
```

> **Secret Manager (recommended for prod):**
> Store secrets in GCP Secret Manager and reference them:
> ```bash
> gcloud run deploy $SERVICE_NAME \
>   --update-secrets GEMINI_API_KEY=gemini-api-key:latest \
>   --update-secrets TWILIO_AUTH_TOKEN=twilio-auth-token:latest
> ```

### 6. Custom domain

```bash
gcloud run domain-mappings create \
  --service $SERVICE_NAME \
  --domain fititmiami.com \
  --region $REGION
```

Then add the CNAME/A records Cloud Run provides to your DNS.

### 7. Update APP_URL env var

```bash
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --set-env-vars APP_URL=https://fititmiami.com
```

---

## Option B: Vercel (frontend only)

Vercel hosts the Vite SPA. You’ll need a separate server for the OTP API
(e.g. a Cloud Run service, Railway, or Render).

```bash
npm install -g vercel
vercel login
vercel --prod
```

Set environment variables in the Vercel dashboard under Project Settings → Environment Variables.

Point `VITE_API_BASE_URL` to your separate Express server URL and update
all `fetch('/api/...')` calls in `server.ts` accordingly.

---

## Firebase Security Rules

Deploy the included rules before going live:

```bash
npm install -g firebase-tools
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules
```

---

## Health check

Once deployed, verify:

```bash
curl https://YOUR_CLOUD_RUN_URL/api/verify/send \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+13055550000"}'
# Expected: {"success":true,"message":"OTP sent"}
```

---

## Make.com webhook setup

1. In Make.com, create a new scenario
2. Add a **Webhooks → Custom webhook** trigger
3. Copy the webhook URL into `MAKE_WEBHOOK_URL` env var
4. Add downstream modules: Google Sheets, Airtable, Slack, or your CRM
5. The payload shape sent by `server.ts` is the `leadData` object from the
   OTP confirm request — shape matches the Firestore document schema in
   `firebase-blueprint.json`
