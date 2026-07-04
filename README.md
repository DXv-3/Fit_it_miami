# Fit It Miami

A mobile-first lead capture and booking flow for Miami fitness / home-services.
Built with React 19, Vite, TypeScript, Firebase, Gemini AI, and Twilio.

---

## What it does

- **Lead capture** — multi-step form collects contact info, service type, and scheduling preference
- **Phone verification** — Twilio OTP (4-digit SMS code, 5-min expiry, 3-attempt lockout)
- **AI screening** — Gemini AI analyses lead quality and generates a fit score
- **Firebase storage** — every verified lead is written to Firestore with full provenance
- **CRM handoff** — Make.com webhook forwards verified leads to downstream CRM / Airtable / Slack
- **Team DNA dashboard** — `teamDNA-v2.html` standalone operator view of lead pipeline

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| Animation | Motion (Framer Motion v12) |
| Backend | Express 4 (served via `tsx server.ts`) |
| AI | Google Gemini via `@google/genai` |
| Auth/DB | Firebase v12 (Firestore + Auth) |
| SMS OTP | Twilio |
| Automation | Make.com webhook |
| Notifications | Sonner toast |
| Virtualisation | TanStack Virtual (large lead lists) |

---

## Quick start (local dev)

```bash
# 1. Clone
git clone https://github.com/DXv-3/Fit_it_miami.git
cd Fit_it_miami

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Fill in the values — see Environment Variables below

# 4. Run
npm run dev
# App runs at http://localhost:3000
```

> **Twilio not configured?** That’s fine — `server.ts` will simulate OTP delivery
> and log the code to the console so you can complete the flow during development.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `APP_URL` | Yes | Full URL where app is hosted (e.g. `https://fititmiami.com`) |
| `TWILIO_ACCOUNT_SID` | Prod | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Prod | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Prod | Twilio phone number in E.164 format (`+13055551234`) |
| `MAKE_WEBHOOK_URL` | Prod | Make.com scenario webhook URL |

All Firebase config lives in `firebase-applet-config.json` — no env var needed for client-side.

---

## Firebase setup

1. Go to [Firebase Console](https://console.firebase.google.com) → create project
2. Enable **Firestore** (production mode) and **Authentication** (phone)
3. Copy your Firebase config into `firebase-applet-config.json`
4. Deploy security rules: `firebase deploy --only firestore:rules`

See `firebase-blueprint.json` for the full Firestore collection schema.

---

## Project structure

```
Fit_it_miami/
├── server.ts                # Express server: OTP endpoints + Vite middleware
├── src/
│   ├── App.tsx              # Main app (multi-step form, lead flow, AI scoring)
│   ├── firebase.ts          # Firebase initialisation
│   ├── index.css            # Global styles + Tailwind
│   ├── main.tsx             # React entry point
│   └── components/
│       ├── CommandPalette.tsx  # Operator command palette (Cmd+K)
│       └── DiffModal.tsx       # Lead edit / diff view modal
├── teamDNA-v2.html          # Standalone operator dashboard
├── firebase-blueprint.json  # Firestore schema reference
├── firestore.rules          # Security rules
├── vite.config.ts
└── tsconfig.json
```

---

## Deployment

See **[DEPLOY.md](./DEPLOY.md)** for full Cloud Run + Vercel deploy instructions.

---

## Refactor roadmap

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the component split plan.
`App.tsx` (40KB) will be split into focused feature components in v0.2.

---

## License

Private. All rights reserved. DXv-3.
